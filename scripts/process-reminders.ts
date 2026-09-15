import { getDb, nowUtc, queryAll } from "@/lib/db";
import { getRequestById, getRequestDetail, getSetting } from "@/features/hod-approvals/repository";
import { getUserById } from "@/lib/auth";
import { buildApprovalEmail, createNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";

export function runReminders(): void {
const enabled = Boolean(getSetting("remindersEnabled", true));
if (!enabled) {
  logger.info("reminders are disabled");
  process.exit(0);
}

const reminderAfterDays = Number(getSetting("reminderAfterDays", 3));
const escalationAfterDays = Number(getSetting("escalationAfterDays", 7));

const activeSteps = queryAll<{
  id: string;
  approval_request_id: string;
  sequence: number;
  approver_id: string;
  activated_at: string | null;
}>(
  `SELECT id, approval_request_id, sequence, approver_id, activated_at
   FROM approval_steps WHERE status = 'ACTIVE'`
);

let reminders = 0;
for (const step of activeSteps) {
  if (!step.activated_at) continue;
  const ageDays = (Date.now() - new Date(step.activated_at).getTime()) / (1000 * 60 * 60 * 24);
  const request = getRequestById(step.approval_request_id);
  if (!request) continue;
  const approver = getUserById(step.approver_id);
  if (!approver) continue;
  const detail = getRequestDetail(request.id);
  const reminderEmail = detail
    ? { ...buildApprovalEmail(request, detail.hub, detail.requester, "Approval reminder"), to: [approver.email] }
    : undefined;
  const lastReminder = queryAll<{ created_at: string }>(
    `SELECT created_at FROM notifications
     WHERE user_id = ? AND entity_id = ? AND type IN ('REMINDER','OVERDUE')
     ORDER BY created_at DESC LIMIT 1`,
    [step.approver_id, request.id]
  )[0];
  const lastAge = lastReminder ? (Date.now() - new Date(lastReminder.created_at).getTime()) / (1000 * 60 * 60 * 24) : Infinity;

  if (ageDays >= escalationAfterDays && (!lastReminder || lastAge >= reminderAfterDays)) {
    createNotification({
      userId: step.approver_id,
      type: "OVERDUE",
      title: "Approval overdue",
      message: `HOD Approval ${request.requestNumber ?? request.id} has been waiting for ${Math.floor(ageDays)} days.`,
      entityType: "approval_requests",
      entityId: request.id,
      email: reminderEmail
    });
    reminders++;
  } else if (ageDays >= reminderAfterDays && lastAge >= reminderAfterDays) {
    createNotification({
      userId: step.approver_id,
      type: "REMINDER",
      title: "Approval reminder",
      message: `HOD Approval ${request.requestNumber ?? request.id} is still waiting for your action.`,
      entityType: "approval_requests",
      entityId: request.id,
      email: reminderEmail
    });
    reminders++;
  }
}

logger.info(`reminder run complete: ${reminders} notification(s)`);
}
