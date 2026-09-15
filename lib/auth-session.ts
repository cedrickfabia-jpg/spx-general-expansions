import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { assertAllowedEmail, createSessionToken, getUserById, verifySessionToken } from "@/lib/auth";
import type { AppUser } from "@/features/hod-approvals/types";

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.sessionCookie)?.value;
  if (!token) return null;
  const claims = await verifySessionToken(token);
  if (!claims) return null;
  const user = getUserById(claims.sub);
  if (!user || !user.active) return null;
  try {
    assertAllowedEmail(user.email);
  } catch {
    return null;
  }
  return user;
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/dashboard");
  return user;
}

export async function requireApiUser(): Promise<AppUser | null> {
  return getCurrentUser();
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(env.sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: env.sessionMaxAgeDays * 24 * 60 * 60
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(env.sessionCookie);
}

export async function issueSessionForUser(user: AppUser): Promise<void> {
  const token = await createSessionToken(user);
  await setSessionCookie(token);
}
