import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-session";
import { listUsersAdmin } from "@/features/hod-approvals/repository";
import { grantOrgAccess, type OrgAccessType } from "@/lib/auth";
import { getWorkflow, getWorkflowAccessType, HOD_APPROVAL_WORKFLOW_ID } from "@/lib/workflows";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const search = request.nextUrl.searchParams.get("search") ?? "";
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
  return NextResponse.json(listUsersAdmin(search, page));
}

export async function POST(request: NextRequest) {
  await requireAdmin();
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const accessType = body?.accessType;
  const workflowId = typeof body?.workflowId === "string" ? body.workflowId : HOD_APPROVAL_WORKFLOW_ID;
  if (!email || !getWorkflow(workflowId) || !getWorkflowAccessType(workflowId, String(accessType ?? ""))) {
    return NextResponse.json({ error: "Email, workflow, and access type are required" }, { status: 400 });
  }
  try {
    const user = grantOrgAccess(email, accessType as OrgAccessType, workflowId);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not grant access";
    logger.error(`grant access failed for ${email}`, error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
