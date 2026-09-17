import { describe, expect, it } from "vitest";
import { filterNotifications } from "@/lib/notification-filter";
import type { FreeNotification } from "@/lib/data";

const notifications: FreeNotification[] = [
  { id: "1", userId: "u", title: "Approval pending", message: "HOD 1 needs to act", read: false, createdAt: "2026-09-01T00:00:00.000Z" },
  { id: "2", userId: "u", title: "Approved", message: "Request was approved", read: true, createdAt: "2026-09-02T00:00:00.000Z" }
];

describe("notification filters", () => {
  it("filters by unread", () => {
    expect(filterNotifications(notifications, { read: "unread" })).toHaveLength(1);
  });

  it("filters by search", () => {
    expect(filterNotifications(notifications, { search: "approved" })).toHaveLength(1);
  });
});
