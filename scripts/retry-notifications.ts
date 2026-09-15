import { getFailedNotifications, retryNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";

export async function runRetryNotifications(): Promise<void> {
  const failed = getFailedNotifications();
  let retried = 0;
  for (const notification of failed) {
    await retryNotification(notification.id);
    retried++;
    logger.info(`queued retry for notification ${notification.id}`);
  }
  logger.info(`retry run complete: ${retried} notification(s)`);
}
