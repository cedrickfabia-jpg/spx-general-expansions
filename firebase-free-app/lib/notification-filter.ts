import type { FreeNotification } from "@/lib/data";

export function filterNotifications(
  notifications: FreeNotification[],
  criteria: { search?: string; read?: "all" | "read" | "unread" }
): FreeNotification[] {
  return notifications.filter((notification) => {
    const text = `${notification.title} ${notification.message}`.toLowerCase();
    if (criteria.search && !text.includes(criteria.search.toLowerCase())) return false;
    if (criteria.read === "read" && !notification.read) return false;
    if (criteria.read === "unread" && notification.read) return false;
    return true;
  });
}
