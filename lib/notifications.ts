import { newId } from "@/lib/ids";
import { queryAll, queryOne, queryRun } from "@/lib/db";
import { getEmailProvider, type EmailMessage } from "@/lib/email";
import { env } from "@/lib/env";
import type {
  ApprovalRequestRow,
  Hub,
  ListResult,
  NotificationRow,
  UserName
} from "@/features/hod-approvals/types";
import { logger } from "@/lib/logger";

export interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  email?: EmailMessage;
}

export function buildApprovalEmail(
  request: Pick<ApprovalRequestRow, "id" | "requestNumber" | "title">,
  hub: Pick<Hub, "name"> | null,
  requester: UserName | null,
  actionRequired: string
): { subject: string; text: string } {
  const requestId = request.requestNumber ?? request.id;
  const subject = `HOD Approval ${requestId}: ${actionRequired}`;
  const text = [
    `HOD Approval Request ${requestId}`,
    `Title: ${request.title}`,
    hub ? `Hub: ${hub.name}` : "",
    requester ? `Requester: ${requester.name} (${requester.email})` : "",
    `Action required: ${actionRequired}`,
    `Open the request in General Expansions: ${env.appUrl}/approvals/${request.id}`,
    "",
    "This email is a notification only. Approvals are recorded in General Expansions."
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, text };
}

export function createNotification(input: NotificationInput): void {
  const id = newId("ntf");
  const now = new Date().toISOString();
  queryRun(
    `INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id, delivery_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
    [id, input.userId, input.type, input.title, input.message, input.entityType ?? null, input.entityId ?? null, now]
  );

  if (!input.email) {
    queryRun(`UPDATE notifications SET delivery_status = 'SKIPPED' WHERE id = ?`, [id]);
    return;
  }

  queryRun(
    `UPDATE notifications SET email_subject = ?, email_body = ?, email_attempts = email_attempts + 1 WHERE id = ?`,
    [input.email.subject, input.email.text, id]
  );

  try {
    void getEmailProvider()
      .send(input.email)
      .then(() => {
        try {
          queryRun(
            `UPDATE notifications SET delivery_status = 'SENT' WHERE id = ?`,
            [id]
          );
          for (const recipient of input.email!.to) {
            queryRun(
              `INSERT INTO email_logs (id, notification_id, recipient, subject, body, status, sent_at)
               VALUES (?, ?, ?, ?, ?, 'SENT', ?)`,
              [newId("eml"), id, recipient, input.email!.subject, input.email!.text, new Date().toISOString()]
            );
          }
        } catch (error) {
          logger.error(`email delivery status update failed for notification ${id}`, error);
        }
      })
      .catch((error: Error) => {
        logger.error(`email delivery failed for notification ${id}`, error);
        try {
          queryRun(
            `UPDATE notifications SET delivery_status = 'FAILED' WHERE id = ?`,
            [id]
          );
          for (const recipient of input.email!.to) {
            queryRun(
              `INSERT INTO email_logs (id, notification_id, recipient, subject, body, status, error)
               VALUES (?, ?, ?, ?, ?, 'FAILED', ?)`,
              [newId("eml"), id, recipient, input.email!.subject, input.email!.text, error.message]
            );
          }
        } catch (dbError) {
          logger.error(`email failure status update failed for notification ${id}`, dbError);
        }
      });
  } catch (error) {
    logger.error(`email provider failure for notification ${id}`, error);
  }
}

export function listNotifications(userId: string, page = 1, pageSize = 20): ListResult<NotificationRow> {
  const offset = (page - 1) * pageSize;
  const totalRow = queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?`,
    [userId]
  );
  const items = queryAll<NotificationRow>(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  );
  const total = totalRow?.total ?? 0;
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function getUnreadNotificationCount(userId: string): number {
  const row = queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND read_at IS NULL`,
    [userId]
  );
  return row?.total ?? 0;
}

export function markNotificationRead(id: string, userId: string): void {
  queryRun(
    `UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?`,
    [new Date().toISOString(), id, userId]
  );
}

export function markAllNotificationsRead(userId: string): void {
  queryRun(
    `UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`,
    [new Date().toISOString(), userId]
  );
}

export function getFailedNotifications(limit = 50): Array<NotificationRow & { email: string }> {
  return queryAll<NotificationRow & { email: string }>(
    `SELECT n.*, u.email
     FROM notifications n
     JOIN users u ON u.id = n.user_id
     WHERE n.delivery_status = 'FAILED' AND n.email_subject IS NOT NULL
     ORDER BY n.created_at DESC
     LIMIT ?`,
    [limit]
  );
}

export async function retryNotification(id: string): Promise<void> {
  const row = queryOne<NotificationRow & { email: string }>(
    `SELECT n.*, u.email
     FROM notifications n
     JOIN users u ON u.id = n.user_id
     WHERE n.id = ?`,
    [id]
  );
  if (!row || !row.emailSubject || !row.emailBody) return;
  queryRun(`UPDATE notifications SET email_attempts = email_attempts + 1, delivery_status = 'PENDING' WHERE id = ?`, [id]);
  try {
    await getEmailProvider().send({
      to: [row.email],
      subject: row.emailSubject,
      text: row.emailBody
    });
    queryRun(`UPDATE notifications SET delivery_status = 'SENT' WHERE id = ?`, [id]);
    queryRun(
      `INSERT INTO email_logs (id, notification_id, recipient, subject, body, status, sent_at)
       VALUES (?, ?, ?, ?, ?, 'SENT', ?)`,
      [newId("eml"), id, row.email, row.emailSubject, row.emailBody, new Date().toISOString()]
    );
  } catch (error) {
    queryRun(`UPDATE notifications SET delivery_status = 'FAILED' WHERE id = ?`, [id]);
    logger.warn(`retry failed for notification ${id}`, error);
  }
}
