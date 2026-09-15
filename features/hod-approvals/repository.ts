import { newId } from "@/lib/ids";
import { nowUtc, queryAll, queryOne, queryRun } from "@/lib/db";
import type { SqlValue } from "@/lib/db";
import { parseJson } from "@/lib/utils";
import { HOD_APPROVAL_WORKFLOW_ID } from "@/lib/workflows";
import type {
  ApprovalActionRow,
  ApprovalCommentRow,
  ApprovalRequestRow,
  ApprovalStepRow,
  AppUser,
  ApproverRoute,
  DocumentRow,
  DocumentVersionRow,
  Hub,
  ListResult,
  RequestRevisionRow,
  RoleName,
  WorkflowAccess,
  WorkflowApprover
} from "@/features/hod-approvals/types";

export interface UserAdminRow extends AppUser {
  createdAt: string;
  lastLoginAt: string | null;
  active: boolean;
}

interface RawUserAdmin {
  id: string;
  google_id: string | null;
  email: string;
  name: string;
  profile_picture: string | null;
  active: number;
  created_at: string;
  last_login_at: string | null;
}

export function mapUserAdmin(row: RawUserAdmin, roles: RoleName[]): UserAdminRow {
  return {
    id: row.id,
    googleId: row.google_id,
    email: row.email,
    name: row.name,
    profilePicture: row.profile_picture,
    active: Boolean(row.active),
    roles,
    isAdmin: roles.includes("ADMINISTRATOR"),
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at
  };
}

export function listUsersAdmin(search = "", page = 1, pageSize = 20): ListResult<UserAdminRow> {
  const like = `%${search.trim().toLowerCase()}%`;
  const total = queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM users WHERE email LIKE ? OR name LIKE ?`,
    [like, like]
  )?.total ?? 0;
  const rows = queryAll<RawUserAdmin>(
    `SELECT * FROM users WHERE email LIKE ? OR name LIKE ? ORDER BY name ASC LIMIT ? OFFSET ?`,
    [like, like, pageSize, (page - 1) * pageSize]
  );
  const items = rows.map((row) => {
    const roles = queryAll<{ name: string }>(
      `SELECT r.id AS name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?`,
      [row.id]
    ).map((r) => r.name as RoleName);
    return mapUserAdmin(row, roles);
  });
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

interface RawHub {
  id: string;
  name: string;
  code: string;
  active: number;
  created_at: string;
  updated_at: string;
}

function mapHub(row: RawHub): Hub {
  return { id: row.id, name: row.name, code: row.code, active: Boolean(row.active), createdAt: row.created_at, updatedAt: row.updated_at };
}

export function listHubs(includeInactive = false): Hub[] {
  const sql = includeInactive
    ? `SELECT * FROM hubs ORDER BY name ASC`
    : `SELECT * FROM hubs WHERE active = 1 ORDER BY name ASC`;
  return queryAll<RawHub>(sql).map(mapHub);
}

export function getHub(id: string): Hub | null {
  const row = queryOne<RawHub>(`SELECT * FROM hubs WHERE id = ?`, [id]);
  return row ? mapHub(row) : null;
}

export function findHubByName(name: string): Hub | null {
  const row = queryOne<RawHub>(`SELECT * FROM hubs WHERE LOWER(name) = LOWER(?) AND active = 1 LIMIT 1`, [name.trim()]);
  return row ? mapHub(row) : null;
}

export function createHub(input: { name: string; code?: string }): Hub {
  const id = newId("hub");
  const now = nowUtc();
  const generatedCode =
    input.code?.trim().toUpperCase() ||
    input.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) ||
    "HUB";
  queryRun(
    `INSERT INTO hubs (id, name, code, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)`,
    [id, input.name.trim(), generatedCode, now, now]
  );
  return getHub(id)!;
}

export function updateHub(id: string, input: { name: string; code?: string; active: boolean }): Hub {
  const existing = getHub(id);
  if (!existing) throw new Error("Hub not found");
  queryRun(
    `UPDATE hubs SET name = ?, code = ?, active = ?, updated_at = ? WHERE id = ?`,
    [input.name.trim(), (input.code?.trim().toUpperCase() || existing.code), input.active ? 1 : 0, nowUtc(), id]
  );
  return getHub(id)!;
}

export interface ApproverRouteWithNames extends ApproverRoute {
  hubName: string;
  approverName: string;
  approverEmail: string;
}

interface RawRoute {
  id: string;
  workflow_id: string;
  hub_id: string;
  slot: number;
  approver_user_id: string;
  created_at: string;
  updated_at: string;
  hub_name: string;
  approver_name: string;
  approver_email: string;
}

export function listApproverRoutes(workflowId: string = HOD_APPROVAL_WORKFLOW_ID): ApproverRouteWithNames[] {
  return queryAll<RawRoute>(
    `SELECT ar.*, h.name AS hub_name, u.name AS approver_name, u.email AS approver_email
     FROM approver_routes ar
     JOIN hubs h ON h.id = ar.hub_id
     JOIN users u ON u.id = ar.approver_user_id
     WHERE ar.workflow_id = ?
     ORDER BY h.name ASC, ar.slot ASC`,
    [workflowId]
  ).map((row) => ({
    id: row.id,
    workflowId: row.workflow_id,
    hubId: row.hub_id,
    slot: row.slot as 1 | 2,
    approverUserId: row.approver_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hubName: row.hub_name,
    approverName: row.approver_name,
    approverEmail: row.approver_email
  }));
}

export function getApproverRoute(
  hubId: string,
  slot: 1 | 2,
  workflowId: string = HOD_APPROVAL_WORKFLOW_ID
): ApproverRoute | null {
  const row = queryOne<RawRoute>(
    `SELECT * FROM approver_routes WHERE hub_id = ? AND workflow_id = ? AND slot = ?`,
    [hubId, workflowId, slot]
  );
  return row
    ? { id: row.id, workflowId: row.workflow_id, hubId: row.hub_id, slot: row.slot as 1 | 2, approverUserId: row.approver_user_id, createdAt: row.created_at, updatedAt: row.updated_at }
    : null;
}

export function upsertApproverRoute(input: {
  hubId: string;
  slot: 1 | 2;
  approverUserId: string;
  workflowId?: string;
}): ApproverRoute {
  const workflowId = input.workflowId ?? HOD_APPROVAL_WORKFLOW_ID;
  const existing = getApproverRoute(input.hubId, input.slot, workflowId);
  if (existing) {
    queryRun(
      `UPDATE approver_routes SET approver_user_id = ?, updated_at = ? WHERE id = ?`,
      [input.approverUserId, nowUtc(), existing.id]
    );
    return getApproverRoute(input.hubId, input.slot, workflowId)!;
  }
  const id = newId("rt");
  const now = nowUtc();
  queryRun(
    `INSERT INTO approver_routes (id, workflow_id, hub_id, slot, approver_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, workflowId, input.hubId, input.slot, input.approverUserId, now, now]
  );
  return getApproverRoute(input.hubId, input.slot, workflowId)!;
}

interface RawWorkflowApprover {
  workflow_id: string;
  slot: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export function listWorkflowApprovers(workflowId: string = HOD_APPROVAL_WORKFLOW_ID): WorkflowApprover[] {
  return queryAll<RawWorkflowApprover>(
    `SELECT * FROM workflow_approvers WHERE workflow_id = ? ORDER BY slot ASC`,
    [workflowId]
  ).map((row) => ({
    workflowId: row.workflow_id,
    slot: row.slot as 1 | 2,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export function getWorkflowApprover(
  workflowId: string,
  slot: 1 | 2
): WorkflowApprover | null {
  const row = queryOne<RawWorkflowApprover>(
    `SELECT * FROM workflow_approvers WHERE workflow_id = ? AND slot = ?`,
    [workflowId, slot]
  );
  return row
    ? { workflowId: row.workflow_id, slot: row.slot as 1 | 2, userId: row.user_id, createdAt: row.created_at, updatedAt: row.updated_at }
    : null;
}

export function upsertWorkflowApprover(
  workflowId: string,
  slot: 1 | 2,
  userId: string
): WorkflowApprover {
  queryRun(`DELETE FROM workflow_approvers WHERE workflow_id = ? AND slot = ?`, [workflowId, slot]);
  const now = nowUtc();
  queryRun(
    `INSERT INTO workflow_approvers (workflow_id, slot, user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [workflowId, slot, userId, now, now]
  );
  return getWorkflowApprover(workflowId, slot)!;
}

export interface WorkflowAccessWithUser extends WorkflowAccess {
  userName: string;
  userEmail: string;
}

interface RawWorkflowAccess {
  workflow_id: string;
  user_id: string;
  access_type: string;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
}

export function listWorkflowAccess(workflowId: string = HOD_APPROVAL_WORKFLOW_ID): WorkflowAccessWithUser[] {
  return queryAll<RawWorkflowAccess>(
    `SELECT wa.*, u.name AS user_name, u.email AS user_email
     FROM workflow_access wa
     JOIN users u ON u.id = wa.user_id
     WHERE wa.workflow_id = ?
     ORDER BY u.name ASC`,
    [workflowId]
  ).map((row) => ({
    workflowId: row.workflow_id,
    userId: row.user_id,
    accessType: row.access_type,
    grantedBy: row.granted_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userName: row.user_name,
    userEmail: row.user_email
  }));
}

export function upsertWorkflowAccess(
  workflowId: string,
  userId: string,
  accessType: string,
  grantedBy: string | null = null
): WorkflowAccessWithUser {
  const now = nowUtc();
  queryRun(
    `INSERT INTO workflow_access (workflow_id, user_id, access_type, granted_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(workflow_id, user_id) DO UPDATE SET
       access_type = excluded.access_type,
       granted_by = excluded.granted_by,
       updated_at = excluded.updated_at`,
    [workflowId, userId, accessType, grantedBy, now, now]
  );
  const row = queryOne<RawWorkflowAccess>(
    `SELECT wa.*, u.name AS user_name, u.email AS user_email
     FROM workflow_access wa
     JOIN users u ON u.id = wa.user_id
     WHERE wa.workflow_id = ? AND wa.user_id = ?`,
    [workflowId, userId]
  );
  if (!row) throw new Error("Workflow access was not saved");
  return {
    workflowId: row.workflow_id,
    userId: row.user_id,
    accessType: row.access_type,
    grantedBy: row.granted_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userName: row.user_name,
    userEmail: row.user_email
  };
}

interface RawRequest extends Omit<ApprovalRequestRow, "status"> {
  status: ApprovalRequestRow["status"];
}

function mapRequest(row: RawRequest): ApprovalRequestRow {
  return {
    id: row.id,
    requestNumber: row.requestNumber,
    requesterId: row.requesterId,
    hubId: row.hubId,
    title: row.title,
    cpoBudgetStatus: row.cpoBudgetStatus,
    requiredApproverCount: row.requiredApproverCount,
    status: row.status,
    currentRevisionId: row.currentRevisionId,
    parentRequestId: row.parentRequestId,
    routingJson: row.routingJson,
    dataJson: row.dataJson,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    submittedAt: row.submittedAt,
    completedAt: row.completedAt,
    cancelledAt: row.cancelledAt,
    rejectionReason: row.rejectionReason,
    cancellationReason: row.cancellationReason
  };
}

export function getRequestById(id: string): ApprovalRequestRow | null {
  const row = queryOne<RawRequest>(
    `SELECT id, request_number AS requestNumber, requester_id AS requesterId, hub_id AS hubId, title,
            cpo_budget_status AS cpoBudgetStatus, required_approver_count AS requiredApproverCount, status,
            current_revision_id AS currentRevisionId, parent_request_id AS parentRequestId, routing_json AS routingJson,
            data_json AS dataJson, created_at AS createdAt, updated_at AS updatedAt, submitted_at AS submittedAt,
            completed_at AS completedAt, cancelled_at AS cancelledAt, rejection_reason AS rejectionReason,
            cancellation_reason AS cancellationReason
     FROM approval_requests WHERE id = ?`,
    [id]
  );
  return row ? mapRequest(row) : null;
}

export function listStepsForRequest(requestId: string): ApprovalStepRow[] {
  return queryAll<ApprovalStepRow>(
    `SELECT id, approval_request_id AS approvalRequestId, sequence, approver_id AS approverId,
            original_approver_id AS originalApproverId, status, activated_at AS activatedAt, completed_at AS completedAt
     FROM approval_steps WHERE approval_request_id = ? ORDER BY sequence ASC`,
    [requestId]
  );
}

export function getStepById(id: string): ApprovalStepRow | null {
  return queryOne<ApprovalStepRow>(
    `SELECT id, approval_request_id AS approvalRequestId, sequence, approver_id AS approverId,
            original_approver_id AS originalApproverId, status, activated_at AS activatedAt, completed_at AS completedAt
     FROM approval_steps WHERE id = ?`,
    [id]
  ) ?? null;
}

export function listActionsForRequest(requestId: string): ApprovalActionRow[] {
  return queryAll<ApprovalActionRow>(
    `SELECT id, approval_request_id AS approvalRequestId, approval_step_id AS approvalStepId, actor_id AS actorId,
            action, comment, request_revision_id AS requestRevisionId, created_at AS createdAt
     FROM approval_actions WHERE approval_request_id = ? ORDER BY created_at ASC`,
    [requestId]
  );
}

export function listCommentsForRequest(requestId: string): ApprovalCommentRow[] {
  return queryAll<ApprovalCommentRow>(
    `SELECT id, approval_request_id AS approvalRequestId, approval_step_id AS approvalStepId, author_id AS authorId,
            type, message, request_revision_id AS requestRevisionId, created_at AS createdAt
     FROM approval_comments WHERE approval_request_id = ? ORDER BY created_at ASC`,
    [requestId]
  );
}

export function listRevisionsForRequest(requestId: string): RequestRevisionRow[] {
  return queryAll<RequestRevisionRow>(
    `SELECT id, approval_request_id AS approvalRequestId, version_number AS versionNumber, created_by AS createdBy,
            reason, data_json AS dataJson, created_at AS createdAt
     FROM request_revisions WHERE approval_request_id = ? ORDER BY version_number ASC`,
    [requestId]
  );
}

export interface DocumentWithVersions extends DocumentRow {
  versions: DocumentVersionRow[];
}

export function listDocumentsForRequest(requestId: string): DocumentWithVersions[] {
  const documents = queryAll<DocumentRow>(
    `SELECT id, approval_request_id AS approvalRequestId, document_name AS documentName, document_type AS documentType,
            created_by AS createdBy, created_at AS createdAt
     FROM documents WHERE approval_request_id = ? ORDER BY created_at ASC`,
    [requestId]
  );
  return documents.map((doc) => {
    const versions = queryAll<DocumentVersionRow>(
      `SELECT id, document_id AS documentId, version_number AS versionNumber, storage_key AS storageKey,
              original_filename AS originalFilename, mime_type AS mimeType, file_size AS fileSize,
              uploaded_by AS uploadedBy, created_at AS createdAt
       FROM document_versions WHERE document_id = ? ORDER BY version_number ASC`,
      [doc.id]
    );
    return { ...doc, versions };
  });
}

export function listWatcherUserIds(requestId: string): string[] {
  return queryAll<{ user_id: string }>(`SELECT user_id FROM approval_watchers WHERE approval_request_id = ?`, [requestId]).map(
    (r) => r.user_id
  );
}

export interface RequestDetail {
  request: ApprovalRequestRow;
  hub: Hub | null;
  requester: AppUser | null;
  steps: ApprovalStepRow[];
  actions: ApprovalActionRow[];
  comments: ApprovalCommentRow[];
  revisions: RequestRevisionRow[];
  documents: DocumentWithVersions[];
  watcherUserIds: string[];
  currentStep: ApprovalStepRow | null;
  data: ReturnType<typeof parseJson<Record<string, unknown>>>;
}

export function getRequestDetail(id: string): RequestDetail | null {
  const request = getRequestById(id);
  if (!request) return null;
  const hub = getHub(request.hubId);
  const requester = getUserByIdPublic(request.requesterId);
  const steps = listStepsForRequest(id);
  const currentStep = steps.find((step) => step.status === "ACTIVE") ?? null;
  return {
    request,
    hub,
    requester,
    steps,
    actions: listActionsForRequest(id),
    comments: listCommentsForRequest(id),
    revisions: listRevisionsForRequest(id),
    documents: listDocumentsForRequest(id),
    watcherUserIds: listWatcherUserIds(id),
    currentStep,
    data: parseJson<Record<string, unknown>>(request.dataJson, {})
  };
}

function getUserByIdPublic(id: string): AppUser | null {
  const row = queryOne<{ id: string; google_id: string | null; email: string; name: string; profile_picture: string | null; active: number }>(
    `SELECT id, google_id, email, name, profile_picture, active FROM users WHERE id = ?`,
    [id]
  );
  if (!row) return null;
  const roles = queryAll<{ name: string }>(
    `SELECT r.id AS name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?`,
    [id]
  ).map((r) => r.name as RoleName);
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

export interface RequestListFilters {
  search?: string;
  status?: string;
  hubId?: string;
  approverId?: string;
  dateFrom?: string;
  dateTo?: string;
  approverEmail?: string;
  watcherEmail?: string;
  page?: number;
  pageSize?: number;
}

export interface RequestListItem {
  request: ApprovalRequestRow;
  hubName: string;
  requesterName: string;
  currentStepApproverId: string | null;
  currentStepLabel: string;
  approver1Name: string | null;
  approver1ApprovedAt: string | null;
  approver2Name: string | null;
  approver2ApprovedAt: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
}

function mapRequestListRow(row: Record<string, unknown>): RequestListItem {
  const request: ApprovalRequestRow = {
    id: String(row.id),
    requestNumber: row.request_number ? String(row.request_number) : null,
    requesterId: String(row.requester_id),
    hubId: String(row.hub_id),
    title: String(row.title),
    cpoBudgetStatus: String(row.cpo_budget_status) as ApprovalRequestRow["cpoBudgetStatus"],
    requiredApproverCount: row.required_approver_count === null ? null : Number(row.required_approver_count),
    status: String(row.status) as ApprovalRequestRow["status"],
    currentRevisionId: row.current_revision_id ? String(row.current_revision_id) : null,
    parentRequestId: row.parent_request_id ? String(row.parent_request_id) : null,
    routingJson: row.routing_json ? String(row.routing_json) : null,
    dataJson: String(row.data_json),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
    cancellationReason: row.cancellation_reason ? String(row.cancellation_reason) : null
  };
  return {
    request,
    hubName: String(row.hub_name ?? ""),
    requesterName: String(row.requester_name ?? ""),
    currentStepApproverId: row.current_step_approver_id ? String(row.current_step_approver_id) : null,
    currentStepLabel: String(row.current_step_label ?? ""),
    approver1Name: row.step1_approver_name ? String(row.step1_approver_name) : null,
    approver1ApprovedAt: row.step1_approved_at ? String(row.step1_approved_at) : null,
    approver2Name: row.step2_approver_name ? String(row.step2_approver_name) : null,
    approver2ApprovedAt: row.step2_approved_at ? String(row.step2_approved_at) : null,
    rejectedByName: row.rejected_by_name ? String(row.rejected_by_name) : null,
    rejectedAt: row.rejected_at ? String(row.rejected_at) : null
  };
}

function requestListWhere(filters: RequestListFilters): { where: string[]; params: SqlValue[] } {
  const where: string[] = [];
  const params: SqlValue[] = [];
  if (filters.search) {
    where.push(`(r.request_number LIKE ? OR r.title LIKE ? OR u.email LIKE ? OR u.name LIKE ?)`);
    const like = `%${filters.search.trim()}%`;
    params.push(like, like, like, like);
  }
  if (filters.status) {
    where.push(`r.status = ?`);
    params.push(filters.status);
  }
  if (filters.hubId) {
    where.push(`r.hub_id = ?`);
    params.push(filters.hubId);
  }
  if (filters.approverId) {
    where.push(`EXISTS (SELECT 1 FROM approval_steps s WHERE s.approval_request_id = r.id AND (s.approver_id = ? OR s.original_approver_id = ?))`);
    params.push(filters.approverId, filters.approverId);
  }
  if (filters.dateFrom) {
    where.push(`r.created_at >= ?`);
    params.push(`${filters.dateFrom}T00:00:00.000Z`);
  }
  if (filters.dateTo) {
    where.push(`r.created_at <= ?`);
    params.push(`${filters.dateTo}T23:59:59.999Z`);
  }
  if (filters.approverEmail) {
    where.push(
      `EXISTS (SELECT 1 FROM approval_steps fs JOIN users au ON au.id IN (fs.approver_id, fs.original_approver_id)
              WHERE fs.approval_request_id = r.id AND au.email LIKE ?)`
    );
    params.push(`%${filters.approverEmail.trim().toLowerCase()}%`);
  }
  if (filters.watcherEmail) {
    where.push(
      `EXISTS (SELECT 1 FROM approval_watchers aw JOIN users wu ON wu.id = aw.user_id
              WHERE aw.approval_request_id = r.id AND wu.email LIKE ?)`
    );
    params.push(`%${filters.watcherEmail.trim().toLowerCase()}%`);
  }
  return { where, params };
}

export function listMyRequests(requesterId: string, filters: RequestListFilters = {}): ListResult<RequestListItem> {
  const base = requestListWhere(filters);
  const where = [`r.requester_id = ?`, ...base.where];
  const params = [requesterId, ...base.params];
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const total = queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM approval_requests r JOIN users u ON u.id = r.requester_id JOIN hubs h ON h.id = r.hub_id WHERE ${where.join(" AND ")}`,
    params
  )?.total ?? 0;
  const rows = queryAll(
    `SELECT r.*, h.name AS hub_name, u.name AS requester_name,
            (SELECT s.approver_id FROM approval_steps s WHERE s.approval_request_id = r.id AND s.status = 'ACTIVE' LIMIT 1) AS current_step_approver_id,
            (SELECT s.status FROM approval_steps s WHERE s.approval_request_id = r.id AND s.status = 'ACTIVE' LIMIT 1) AS current_step_label,
            (SELECT s1.completed_at FROM approval_steps s1 WHERE s1.approval_request_id = r.id AND s1.sequence = 1 AND s1.status = 'APPROVED' ORDER BY s1.completed_at DESC LIMIT 1) AS step1_approved_at,
            (SELECT u1.name FROM approval_steps s1 JOIN users u1 ON u1.id = s1.approver_id WHERE s1.approval_request_id = r.id AND s1.sequence = 1 AND s1.status = 'APPROVED' ORDER BY s1.completed_at DESC LIMIT 1) AS step1_approver_name,
            (SELECT s2.completed_at FROM approval_steps s2 WHERE s2.approval_request_id = r.id AND s2.sequence = 2 AND s2.status = 'APPROVED' ORDER BY s2.completed_at DESC LIMIT 1) AS step2_approved_at,
            (SELECT u2.name FROM approval_steps s2 JOIN users u2 ON u2.id = s2.approver_id WHERE s2.approval_request_id = r.id AND s2.sequence = 2 AND s2.status = 'APPROVED' ORDER BY s2.completed_at DESC LIMIT 1) AS step2_approver_name,
            (SELECT sr.completed_at FROM approval_steps sr WHERE sr.approval_request_id = r.id AND sr.status = 'REJECTED' ORDER BY sr.completed_at DESC LIMIT 1) AS rejected_at,
            (SELECT ur.name FROM approval_steps sr JOIN users ur ON ur.id = sr.approver_id WHERE sr.approval_request_id = r.id AND sr.status = 'REJECTED' ORDER BY sr.completed_at DESC LIMIT 1) AS rejected_by_name
     FROM approval_requests r
     JOIN users u ON u.id = r.requester_id
     JOIN hubs h ON h.id = r.hub_id
     WHERE ${where.join(" AND ")}
     ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );
  return { items: rows.map(mapRequestListRow), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function listMyWatchedRequests(userId: string, filters: RequestListFilters = {}): ListResult<RequestListItem> {
  const base = requestListWhere(filters);
  const where = [
    `EXISTS (SELECT 1 FROM approval_watchers aw WHERE aw.approval_request_id = r.id AND aw.user_id = ?)`,
    ...base.where
  ];
  const params = [userId, ...base.params];
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const total = queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM approval_requests r JOIN users u ON u.id = r.requester_id JOIN hubs h ON h.id = r.hub_id WHERE ${where.join(" AND ")}`,
    params
  )?.total ?? 0;
  const rows = queryAll(
    `SELECT r.*, h.name AS hub_name, u.name AS requester_name,
            (SELECT s.approver_id FROM approval_steps s WHERE s.approval_request_id = r.id AND s.status = 'ACTIVE' LIMIT 1) AS current_step_approver_id,
            (SELECT s.status FROM approval_steps s WHERE s.approval_request_id = r.id AND s.status = 'ACTIVE' LIMIT 1) AS current_step_label,
            (SELECT s1.completed_at FROM approval_steps s1 WHERE s1.approval_request_id = r.id AND s1.sequence = 1 AND s1.status = 'APPROVED' ORDER BY s1.completed_at DESC LIMIT 1) AS step1_approved_at,
            (SELECT u1.name FROM approval_steps s1 JOIN users u1 ON u1.id = s1.approver_id WHERE s1.approval_request_id = r.id AND s1.sequence = 1 AND s1.status = 'APPROVED' ORDER BY s1.completed_at DESC LIMIT 1) AS step1_approver_name,
            (SELECT s2.completed_at FROM approval_steps s2 WHERE s2.approval_request_id = r.id AND s2.sequence = 2 AND s2.status = 'APPROVED' ORDER BY s2.completed_at DESC LIMIT 1) AS step2_approved_at,
            (SELECT u2.name FROM approval_steps s2 JOIN users u2 ON u2.id = s2.approver_id WHERE s2.approval_request_id = r.id AND s2.sequence = 2 AND s2.status = 'APPROVED' ORDER BY s2.completed_at DESC LIMIT 1) AS step2_approver_name,
            (SELECT sr.completed_at FROM approval_steps sr WHERE sr.approval_request_id = r.id AND sr.status = 'REJECTED' ORDER BY sr.completed_at DESC LIMIT 1) AS rejected_at,
            (SELECT ur.name FROM approval_steps sr JOIN users ur ON ur.id = sr.approver_id WHERE sr.approval_request_id = r.id AND sr.status = 'REJECTED' ORDER BY sr.completed_at DESC LIMIT 1) AS rejected_by_name
     FROM approval_requests r
     JOIN users u ON u.id = r.requester_id
     JOIN hubs h ON h.id = r.hub_id
     WHERE ${where.join(" AND ")}
     ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );
  return { items: rows.map(mapRequestListRow), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function listMyApprovals(userId: string, filters: RequestListFilters = {}): ListResult<RequestListItem> {
  const base = requestListWhere(filters);
  const where = [
    `EXISTS (SELECT 1 FROM approval_steps s WHERE s.approval_request_id = r.id AND (s.approver_id = ? OR s.original_approver_id = ?))`,
    ...base.where
  ];
  const params = [userId, userId, ...base.params];
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const total = queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM approval_requests r JOIN users u ON u.id = r.requester_id JOIN hubs h ON h.id = r.hub_id WHERE ${where.join(" AND ")}`,
    params
  )?.total ?? 0;
  const rows = queryAll(
    `SELECT r.*, h.name AS hub_name, u.name AS requester_name,
            (SELECT s.approver_id FROM approval_steps s WHERE s.approval_request_id = r.id AND s.status = 'ACTIVE' LIMIT 1) AS current_step_approver_id,
            (SELECT s.status FROM approval_steps s WHERE s.approval_request_id = r.id AND s.status = 'ACTIVE' LIMIT 1) AS current_step_label,
            (SELECT s1.completed_at FROM approval_steps s1 WHERE s1.approval_request_id = r.id AND s1.sequence = 1 AND s1.status = 'APPROVED' ORDER BY s1.completed_at DESC LIMIT 1) AS step1_approved_at,
            (SELECT u1.name FROM approval_steps s1 JOIN users u1 ON u1.id = s1.approver_id WHERE s1.approval_request_id = r.id AND s1.sequence = 1 AND s1.status = 'APPROVED' ORDER BY s1.completed_at DESC LIMIT 1) AS step1_approver_name,
            (SELECT s2.completed_at FROM approval_steps s2 WHERE s2.approval_request_id = r.id AND s2.sequence = 2 AND s2.status = 'APPROVED' ORDER BY s2.completed_at DESC LIMIT 1) AS step2_approved_at,
            (SELECT u2.name FROM approval_steps s2 JOIN users u2 ON u2.id = s2.approver_id WHERE s2.approval_request_id = r.id AND s2.sequence = 2 AND s2.status = 'APPROVED' ORDER BY s2.completed_at DESC LIMIT 1) AS step2_approver_name,
            (SELECT sr.completed_at FROM approval_steps sr WHERE sr.approval_request_id = r.id AND sr.status = 'REJECTED' ORDER BY sr.completed_at DESC LIMIT 1) AS rejected_at,
            (SELECT ur.name FROM approval_steps sr JOIN users ur ON ur.id = sr.approver_id WHERE sr.approval_request_id = r.id AND sr.status = 'REJECTED' ORDER BY sr.completed_at DESC LIMIT 1) AS rejected_by_name
     FROM approval_requests r
     JOIN users u ON u.id = r.requester_id
     JOIN hubs h ON h.id = r.hub_id
     WHERE ${where.join(" AND ")}
     ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );
  return { items: rows.map(mapRequestListRow), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function listAllRequests(filters: RequestListFilters = {}): ListResult<RequestListItem> {
  const base = requestListWhere(filters);
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const where = base.where;
  const total = queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM approval_requests r JOIN users u ON u.id = r.requester_id JOIN hubs h ON h.id = r.hub_id WHERE ${where.length ? where.join(" AND ") : "1=1"}`,
    base.params
  )?.total ?? 0;
  const rows = queryAll(
    `SELECT r.*, h.name AS hub_name, u.name AS requester_name,
            (SELECT s.approver_id FROM approval_steps s WHERE s.approval_request_id = r.id AND s.status = 'ACTIVE' LIMIT 1) AS current_step_approver_id,
            (SELECT s.status FROM approval_steps s WHERE s.approval_request_id = r.id AND s.status = 'ACTIVE' LIMIT 1) AS current_step_label,
            (SELECT s1.completed_at FROM approval_steps s1 WHERE s1.approval_request_id = r.id AND s1.sequence = 1 AND s1.status = 'APPROVED' ORDER BY s1.completed_at DESC LIMIT 1) AS step1_approved_at,
            (SELECT u1.name FROM approval_steps s1 JOIN users u1 ON u1.id = s1.approver_id WHERE s1.approval_request_id = r.id AND s1.sequence = 1 AND s1.status = 'APPROVED' ORDER BY s1.completed_at DESC LIMIT 1) AS step1_approver_name,
            (SELECT s2.completed_at FROM approval_steps s2 WHERE s2.approval_request_id = r.id AND s2.sequence = 2 AND s2.status = 'APPROVED' ORDER BY s2.completed_at DESC LIMIT 1) AS step2_approved_at,
            (SELECT u2.name FROM approval_steps s2 JOIN users u2 ON u2.id = s2.approver_id WHERE s2.approval_request_id = r.id AND s2.sequence = 2 AND s2.status = 'APPROVED' ORDER BY s2.completed_at DESC LIMIT 1) AS step2_approver_name,
            (SELECT sr.completed_at FROM approval_steps sr WHERE sr.approval_request_id = r.id AND sr.status = 'REJECTED' ORDER BY sr.completed_at DESC LIMIT 1) AS rejected_at,
            (SELECT ur.name FROM approval_steps sr JOIN users ur ON ur.id = sr.approver_id WHERE sr.approval_request_id = r.id AND sr.status = 'REJECTED' ORDER BY sr.completed_at DESC LIMIT 1) AS rejected_by_name
     FROM approval_requests r
     JOIN users u ON u.id = r.requester_id
     JOIN hubs h ON h.id = r.hub_id
     WHERE ${where.length ? where.join(" AND ") : "1=1"}
     ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [...base.params, pageSize, (page - 1) * pageSize]
  );
  return { items: rows.map(mapRequestListRow), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export interface ApprovalHistoryRow {
  requestNumber: string | null;
  title: string;
  status: string;
  cpoBudgetStatus: string;
  hubName: string;
  requesterName: string;
  requesterEmail: string;
  submittedAt: string | null;
  completedAt: string | null;
  rejectionReason: string | null;
  approver1Name: string | null;
  approver1Email: string | null;
  approver1ApprovedAt: string | null;
  approver2Name: string | null;
  approver2Email: string | null;
  approver2ApprovedAt: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
}

export function exportApprovalHistory(options: { from?: string; to?: string; ids?: string[] } = {}): ApprovalHistoryRow[] {
  const where: string[] = [];
  const params: SqlValue[] = [];
  if (options.from) {
    where.push(`r.created_at >= ?`);
    params.push(`${options.from}T00:00:00.000Z`);
  }
  if (options.to) {
    where.push(`r.created_at <= ?`);
    params.push(`${options.to}T23:59:59.999Z`);
  }
  if (options.ids && options.ids.length > 0) {
    where.push(`r.id IN (${options.ids.map(() => "?").join(", ")})`);
    params.push(...options.ids);
  }
  const rows = queryAll<Record<string, unknown>>(
    `SELECT r.request_number AS requestNumber, r.title, r.status, r.cpo_budget_status AS cpoBudgetStatus,
            r.submitted_at AS submittedAt, r.completed_at AS completedAt, r.rejection_reason AS rejectionReason,
            h.name AS hubName, u.name AS requesterName, u.email AS requesterEmail,
            s1.completed_at AS step1ApprovedAt, u1.name AS step1ApproverName, u1.email AS step1ApproverEmail,
            s2.completed_at AS step2ApprovedAt, u2.name AS step2ApproverName, u2.email AS step2ApproverEmail,
            sr.completed_at AS rejectedAt, ur.name AS rejectedByName
     FROM approval_requests r
     JOIN hubs h ON h.id = r.hub_id
     JOIN users u ON u.id = r.requester_id
     LEFT JOIN approval_steps s1 ON s1.approval_request_id = r.id AND s1.sequence = 1
     LEFT JOIN users u1 ON u1.id = s1.approver_id
     LEFT JOIN approval_steps s2 ON s2.approval_request_id = r.id AND s2.sequence = 2
     LEFT JOIN users u2 ON u2.id = s2.approver_id
     LEFT JOIN approval_steps sr ON sr.approval_request_id = r.id AND sr.status = 'REJECTED'
     LEFT JOIN users ur ON ur.id = sr.approver_id
     ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY r.created_at DESC`,
    params
  );
  return rows.map((row) => ({
    requestNumber: row.requestNumber ? String(row.requestNumber) : null,
    title: String(row.title ?? ""),
    status: String(row.status ?? ""),
    cpoBudgetStatus: String(row.cpoBudgetStatus ?? ""),
    hubName: String(row.hubName ?? ""),
    requesterName: String(row.requesterName ?? ""),
    requesterEmail: String(row.requesterEmail ?? ""),
    submittedAt: row.submittedAt ? String(row.submittedAt) : null,
    completedAt: row.completedAt ? String(row.completedAt) : null,
    rejectionReason: row.rejectionReason ? String(row.rejectionReason) : null,
    approver1Name: row.step1ApproverName ? String(row.step1ApproverName) : null,
    approver1Email: row.step1ApproverEmail ? String(row.step1ApproverEmail) : null,
    approver1ApprovedAt: row.step1ApprovedAt ? String(row.step1ApprovedAt) : null,
    approver2Name: row.step2ApproverName ? String(row.step2ApproverName) : null,
    approver2Email: row.step2ApproverEmail ? String(row.step2ApproverEmail) : null,
    approver2ApprovedAt: row.step2ApprovedAt ? String(row.step2ApprovedAt) : null,
    rejectedByName: row.rejectedByName ? String(row.rejectedByName) : null,
    rejectedAt: row.rejectedAt ? String(row.rejectedAt) : null
  }));
}

export interface DashboardStats {
  drafts: number;
  pending: number;
  questions: number;
  approved: number;
  rejected: number;
  cancelled: number;
  overdue: number;
}

export function getRequesterDashboardStats(userId: string): DashboardStats {
  const row = queryOne<{
    drafts: number;
    pending: number;
    questions: number;
    approved: number;
    rejected: number;
    cancelled: number;
    overdue: number;
  }>(
    `SELECT
       SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) AS drafts,
       SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'QUESTION_RAISED' THEN 1 ELSE 0 END) AS questions,
       SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
       SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
       SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
       0 AS overdue
     FROM approval_requests WHERE requester_id = ?`,
    [userId]
  ) ?? { drafts: 0, pending: 0, questions: 0, approved: 0, rejected: 0, cancelled: 0, overdue: 0 };
  return row;
}

export function getApproverDashboardStats(userId: string): DashboardStats {
  const row = queryOne<{
    drafts: number;
    pending: number;
    questions: number;
    approved: number;
    rejected: number;
    cancelled: number;
    overdue: number;
  }>(
    `SELECT
       SUM(CASE WHEN r.status = 'DRAFT' THEN 1 ELSE 0 END) AS drafts,
       SUM(CASE WHEN r.status = 'PENDING_APPROVAL' AND s.status = 'ACTIVE' AND (s.approver_id = ? OR s.original_approver_id = ?) THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN r.status = 'QUESTION_RAISED' AND s.status = 'ACTIVE' AND (s.approver_id = ? OR s.original_approver_id = ?) THEN 1 ELSE 0 END) AS questions,
       SUM(CASE WHEN s.status = 'APPROVED' AND (s.approver_id = ? OR s.original_approver_id = ?) THEN 1 ELSE 0 END) AS approved,
       SUM(CASE WHEN r.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
       SUM(CASE WHEN r.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
       0 AS overdue
     FROM approval_requests r
     JOIN approval_steps s ON s.approval_request_id = r.id
     WHERE s.approver_id = ? OR s.original_approver_id = ?`,
    [userId, userId, userId, userId, userId, userId, userId, userId]
  ) ?? { drafts: 0, pending: 0, questions: 0, approved: 0, rejected: 0, cancelled: 0, overdue: 0 };
  return row;
}

export function getAdminDashboardStats(): DashboardStats {
  const row = queryOne<DashboardStats>(
    `SELECT
       SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) AS drafts,
       SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'QUESTION_RAISED' THEN 1 ELSE 0 END) AS questions,
       SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
       SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
       SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
       0 AS overdue
     FROM approval_requests`
  ) ?? { drafts: 0, pending: 0, questions: 0, approved: 0, rejected: 0, cancelled: 0, overdue: 0 };
  return row;
}

export function getSetting(key: string, fallback: unknown): unknown {
  const row = queryOne<{ value_json: string }>(`SELECT value_json FROM app_settings WHERE key = ?`, [key]);
  if (!row) return fallback;
  return parseJson(row.value_json, fallback);
}

export function setSetting(key: string, value: unknown, actorId: string | null): void {
  queryRun(
    `INSERT INTO app_settings (key, value_json, updated_by, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    [key, JSON.stringify(value), actorId, nowUtc()]
  );
}

export function listAuditLogs(
  page = 1,
  pageSize = 50,
  filters: { search?: string; action?: string; from?: string; to?: string } = {}
): ListResult<{ id: string; actorName: string | null; actorEmail: string | null; action: string; entityType: string | null; entityId: string | null; metadata: Record<string, unknown> | null; createdAt: string }> {
  const where: string[] = [];
  const params: SqlValue[] = [];
  if (filters.search) {
    where.push(`(a.action LIKE ? OR a.entity_type LIKE ? OR u.name LIKE ? OR u.email LIKE ?)`);
    const like = `%${filters.search.trim().toLowerCase()}%`;
    params.push(like, like, like, like);
  }
  if (filters.action) {
    where.push(`a.action = ?`);
    params.push(filters.action.trim());
  }
  if (filters.from) {
    where.push(`a.created_at >= ?`);
    params.push(`${filters.from}T00:00:00.000Z`);
  }
  if (filters.to) {
    where.push(`a.created_at <= ?`);
    params.push(`${filters.to}T23:59:59.999Z`);
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const total = queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id ${whereSql}`,
    params
  )?.total ?? 0;
  const rows = queryAll<{ id: string; actor_name: string | null; actor_email: string | null; action: string; entity_type: string | null; entity_id: string | null; metadata_json: string | null; created_at: string }>(
    `SELECT a.id, u.name AS actor_name, u.email AS actor_email, a.action, a.entity_type, a.entity_id, a.metadata_json, a.created_at
     FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
     ${whereSql}
     ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );
  return {
    items: rows.map((row) => ({
      id: row.id,
      actorName: row.actor_name,
      actorEmail: row.actor_email,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: parseJson<Record<string, unknown> | null>(row.metadata_json, null),
      createdAt: row.created_at
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}
