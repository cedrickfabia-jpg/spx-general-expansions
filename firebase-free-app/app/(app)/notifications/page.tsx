"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { markNotificationsRead, subscribeNotifications, type FreeNotification } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/time";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<FreeNotification[]>([]);

  React.useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeNotifications(user.id, setNotifications);
    return unsubscribe;
  }, [user]);

  async function markRead() {
    if (!user) return;
    await markNotificationsRead(user.id);
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="In-app workflow notifications." actions={<Button variant="secondary" onClick={markRead}>Mark all read</Button>} />
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div key={notification.id} className="rounded-lg border border-border bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium">{notification.title}</p>
              <span className="text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
          </div>
        ))}
        {notifications.length === 0 ? <p className="text-sm text-muted-foreground">No notifications yet.</p> : null}
      </div>
    </div>
  );
}
