import { NextRequest, NextResponse } from "next/server";
import { queryRun } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-session";
import { listWorkflowApprovers, upsertWorkflowAccess, upsertWorkflowApprover } from "@/features/hod-approvals/repository";
import { getUserById, setUserRoles } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import type { EmailMessage } from "@/lib/email";
import { getWorkflow, HOD_APPROVAL_WORKFLOW_ID } from "@/lib/workflows";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const workflowId = request.nextUrl.searchParams.get("workflowId") ?? HOD_APPROVAL_WORKFLOW_ID;
  return NextResponse.json(listWorkflowApprovers(workflowId));
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  const body = await request.json().catch(() => null);
  const slot = Number(body?.slot) as 1 | 2;
  const workflowId = getWorkflow(String(body?.workflowId ?? "")) ? String(body?.workflowId) : HOD_APPROVAL_WORKFLOW_ID;
  if (!body?.approverUserId || ![1, 2].includes(slot)) {
    return NextResponse.json({ error: "Slot and approver are required" }, { status: 400 });
  }
  const approver = getUserById(body.approverUserId);
  if (!approver) return NextResponse.json({ error: "Approver user not found" }, { status: 404 });
  if (!approver.roles.includes("HOD_APPROVER")) {
    setUserRoles(approver.id, [...approver.roles, "HOD_APPROVER"]);
  }
  const route = upsertWorkflowApprover(workflowId, slot, body.approverUserId);
  queryRun(
    `DELETE FROM workflow_access WHERE workflow_id = ? AND access_type = ? AND user_id <> ?`,
    [workflowId, slot === 1 ? "HOD_1" : "HOD_2", body.approverUserId]
  );
  upsertWorkflowAccess(workflowId, body.approverUserId, slot === 1 ? "HOD_1" : "HOD_2", admin.id);
  const email: EmailMessage = {
    to: [approver.email],
    subject: `Assigned as HOD ${slot}`,
    text: `You have been assigned as HOD ${slot} for the ${getWorkflow(workflowId)?.name ?? workflowId} workflow.`
  };
  createNotification({
    userId: approver.id,
    type: "HOD_ASSIGNED",
    title: `Assigned as HOD ${slot}`,
    message: `You have been assigned as HOD ${slot} for the HOD Approval workflow.`,
    email
  });
  auditLog({
    actorId: admin.id,
    action: "APPROVER_ROUTE_UPDATED",
    entityType: "workflow_approvers",
    entityId: route.workflowId,
    metadata: { workflowId, slot, approverUserId: body.approverUserId }
  });
  return NextResponse.json(route, { status: 201 });
}
