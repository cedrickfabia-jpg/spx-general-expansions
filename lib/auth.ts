import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import { newId } from "@/lib/ids";
import { nowUtc, queryAll, queryOne, queryRun } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import type { EmailMessage } from "@/lib/email";
import type { AppUser, RoleName } from "@/features/hod-approvals/types";
import { upsertWorkflowAccess, upsertWorkflowApprover } from "@/features/hod-approvals/repository";
import { getWorkflow, getWorkflowAccessType, HOD_APPROVAL_WORKFLOW_ID } from "@/lib/workflows";
import { logger } from "@/lib/logger";

export const ORG_DOMAIN = env.orgDomain;
export const ADMIN_EMAIL = "cedrick.fabia@spxexpress.com";

export type OrgAccessType = "ADMINISTRATOR" | "REQUESTER" | "HOD_1" | "HOD_2";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function assertAllowedEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const suffix = `@${ORG_DOMAIN}`;
  if (!normalized.endsWith(suffix) || normalized === suffix) {
    throw new Error(`Only @${ORG_DOMAIN} organizational accounts are allowed`);
  }
  return normalized;
}

export interface UserRow {
  id: string;
  google_id: string | null;
  email: string;
  name: string;
  profile_picture: string | null;
  active: number;
  created_at: string;
  last_login_at: string | null;
}

export interface RoleRow {
  name: string;
}

export function userFromRow(row: UserRow | undefined, roleRows: RoleRow[]): AppUser | null {
  if (!row) return null;
  const roles = roleRows.map((r) => r.name as RoleName);
  return {
    id: row.id,
    googleId: row.google_id,
    email: row.email,
    name: row.name,
    profilePicture: row.profile_picture,
    active: Boolean(row.active),
    roles,
    isAdmin: roles.includes("ADMINISTRATOR")
  };
}

export function getUserById(id: string): AppUser | null {
  const row = queryOne<UserRow>(`SELECT * FROM users WHERE id = ?`, [id]);
  if (!row) return null;
  const roles = queryAll<RoleRow>(
    `SELECT r.id AS name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?`,
    [id]
  );
  return userFromRow(row, roles);
}

export function getUserByEmail(email: string): AppUser | null {
  const row = queryOne<UserRow>(`SELECT * FROM users WHERE email = ?`, [normalizeEmail(email)]);
  if (!row) return null;
  const roles = queryAll<RoleRow>(
    `SELECT r.id AS name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?`,
    [row.id]
  );
  return userFromRow(row, roles);
}

export function ensureRoles(): void {
  const roles: Array<[string, string, string]> = [
    ["REQUESTER", "Requester", "Creates and manages HOD approval requests"],
    ["HOD_APPROVER", "HOD Approver", "Approves, rejects, or asks questions on assigned steps"],
    ["WATCHER", "Watcher / Stakeholder", "Views authorized requests and receives notifications"],
    ["ADMINISTRATOR", "Administrator", "Manages users, routing, configuration, and audit logs"]
  ];
  for (const [id, name, description] of roles) {
    queryRun(
      `INSERT INTO roles (id, name, description) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING`,
      [id, name, description]
    );
  }
}

function assignDefaultRoles(userId: string): void {
  ensureRoles();
  queryRun(
    `INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, 'WATCHER')`,
    [userId]
  );
}

function ensureAdminRole(user: AppUser): AppUser {
  if (user.email === ADMIN_EMAIL && !user.roles.includes("ADMINISTRATOR")) {
    queryRun(`INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, 'ADMINISTRATOR')`, [user.id]);
    auditLog({ actorId: user.id, action: "ADMIN_ROLE_GRANTED", entityType: "users", entityId: user.id, metadata: { email: user.email } });
    return getUserById(user.id)!;
  }
  return user;
}

export function upsertUserFromGoogle(input: {
  googleId: string;
  email: string;
  name: string;
  picture?: string | null;
}): AppUser {
  const email = assertAllowedEmail(input.email);
  const existing = queryOne<UserRow>(`SELECT * FROM users WHERE google_id = ? OR email = ?`, [
    input.googleId,
    email
  ]);
  if (existing) {
    queryRun(
      `UPDATE users SET google_id = ?, email = ?, name = ?, profile_picture = COALESCE(?, profile_picture), last_login_at = ? WHERE id = ?`,
      [input.googleId, email, input.name, input.picture ?? null, nowUtc(), existing.id]
    );
    auditLog({ actorId: existing.id, action: "USER_LOGIN", entityType: "users", entityId: existing.id });
    return ensureAdminRole(getUserById(existing.id)!);
  }
  const id = newId("usr");
  queryRun(
    `INSERT INTO users (id, google_id, email, name, profile_picture, active, created_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    [id, input.googleId, email, input.name, input.picture ?? null, nowUtc(), nowUtc()]
  );
  assignDefaultRoles(id);
  auditLog({ actorId: id, action: "USER_CREATED", entityType: "users", entityId: id, metadata: { source: "google" } });
  auditLog({ actorId: id, action: "USER_LOGIN", entityType: "users", entityId: id });
  logger.info(`new user created: ${email}`);
  return ensureAdminRole(getUserById(id)!);
}

export function upsertUserForDevLogin(input: { email: string; name?: string }): AppUser {
  const email = assertAllowedEmail(input.email);
  const existing = queryOne<UserRow>(`SELECT * FROM users WHERE email = ?`, [email]);
  if (existing) {
    queryRun(`UPDATE users SET last_login_at = ? WHERE id = ?`, [nowUtc(), existing.id]);
    auditLog({ actorId: existing.id, action: "USER_LOGIN", entityType: "users", entityId: existing.id, metadata: { method: "dev" } });
    return ensureAdminRole(getUserById(existing.id)!);
  }
  const id = newId("usr");
  const name = input.name?.trim() || email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  queryRun(
    `INSERT INTO users (id, google_id, email, name, profile_picture, active, created_at, last_login_at)
     VALUES (?, NULL, ?, ?, NULL, 1, ?, ?)`,
    [id, email, name, nowUtc(), nowUtc()]
  );
  assignDefaultRoles(id);
  auditLog({ actorId: id, action: "USER_CREATED", entityType: "users", entityId: id, metadata: { method: "dev" } });
  auditLog({ actorId: id, action: "USER_LOGIN", entityType: "users", entityId: id, metadata: { method: "dev" } });
  return ensureAdminRole(getUserById(id)!);
}

export function ensureOrgUser(email: string): AppUser {
  const normalized = assertAllowedEmail(email);
  const existing = getUserByEmail(normalized);
  if (existing) return existing;
  const id = newId("usr");
  const name = normalized.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  queryRun(
    `INSERT INTO users (id, google_id, email, name, profile_picture, active, created_at, last_login_at)
     VALUES (?, NULL, ?, ?, NULL, 1, ?, NULL)`,
    [id, normalized, name, nowUtc()]
  );
  assignDefaultRoles(id);
  auditLog({ actorId: id, action: "USER_CREATED", entityType: "users", entityId: id, metadata: { source: "watcher" } });
  return ensureAdminRole(getUserById(id)!);
}

export function grantOrgAccess(
  email: string,
  accessType: OrgAccessType,
  workflowId: string = HOD_APPROVAL_WORKFLOW_ID
): AppUser {
  const normalized = assertAllowedEmail(email);
  const existing = getUserByEmail(normalized);
  const user = existing ?? upsertUserForDevLogin({ email: normalized });
  const roles: RoleName[] =
    accessType === "ADMINISTRATOR"
      ? ["ADMINISTRATOR"]
      : accessType === "HOD_1" || accessType === "HOD_2"
        ? ["HOD_APPROVER"]
        : ["REQUESTER"];
  if (user.isAdmin || normalized === ADMIN_EMAIL) roles.push("ADMINISTRATOR");
  setUserRoles(user.id, roles);
  if (accessType === "HOD_1" || accessType === "HOD_2") {
    upsertWorkflowApprover(workflowId, accessType === "HOD_1" ? 1 : 2, user.id);
    queryRun(
      `DELETE FROM workflow_access WHERE workflow_id = ? AND access_type = ? AND user_id <> ?`,
      [workflowId, accessType, user.id]
    );
  }
  upsertWorkflowAccess(workflowId, user.id, accessType);
  const updated = getUserById(user.id)!;
  const workflow = getWorkflow(workflowId);
  const accessLabel = getWorkflowAccessType(workflowId, accessType)?.label ?? accessType;
  const accessEmail: EmailMessage = {
    to: [updated.email],
    subject: "General Expansions access granted",
    text: `You have been granted ${accessLabel} access to the ${workflow?.name ?? workflowId} workflow.\n\nLog in to General Expansions to start using it.`
  };
  createNotification({
    userId: updated.id,
    type: "ACCESS_GRANTED",
    title: "Access granted",
    message: `You now have ${accessLabel} access to the ${workflow?.name ?? workflowId} workflow.`,
    email: accessEmail
  });
  return updated;
}

export function setUserRoles(userId: string, roles: RoleName[]): void {
  queryRun(`DELETE FROM user_roles WHERE user_id = ?`, [userId]);
  for (const role of roles) {
    queryRun(`INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`, [userId, role]);
  }
  auditLog({ actorId: userId, action: "USER_ROLES_UPDATED", entityType: "users", entityId: userId, metadata: { roles } });
}

export function setUserActive(userId: string, active: boolean): void {
  queryRun(`UPDATE users SET active = ? WHERE id = ?`, [active ? 1 : 0, userId]);
  auditLog({ actorId: userId, action: active ? "USER_ACTIVATED" : "USER_DEACTIVATED", entityType: "users", entityId: userId });
}

const encoder = new TextEncoder();

export async function createSessionToken(user: AppUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, roles: user.roles })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${env.sessionMaxAgeDays}d`)
    .sign(encoder.encode(env.sessionSecret));
}

export interface SessionClaims {
  sub: string;
  email: string;
  name: string;
  roles: RoleName[];
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(env.sessionSecret), {
      algorithms: ["HS256"]
    });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      roles: Array.isArray(payload.roles) ? (payload.roles as RoleName[]) : []
    };
  } catch {
    return null;
  }
}
