import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-session";
import { ADMIN_EMAIL, setUserActive, setUserRoles, getUserById } from "@/lib/auth";
import type { RoleName } from "@/features/hod-approvals/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  await requireAdmin();
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (Array.isArray(body.roles)) {
    const roles = body.roles.filter((role: unknown): role is RoleName =>
      ["REQUESTER", "HOD_APPROVER", "WATCHER", "ADMINISTRATOR"].includes(role as string)
    );
    const userBefore = getUserById(id);
    if (userBefore?.email === ADMIN_EMAIL && !roles.includes("ADMINISTRATOR")) {
      roles.push("ADMINISTRATOR");
    }
    setUserRoles(id, roles);
  }
  if (typeof body.active === "boolean") {
    setUserActive(id, body.active);
  }
  const user = getUserById(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}
