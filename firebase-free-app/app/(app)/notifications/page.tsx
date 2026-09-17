"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { markNotificationsRead, subscribeNotifications, type FreeNotification } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/time";
import { filterNotifications } from "@/lib/notification-filter";
import { Input } from "@/components/ui/input";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<FreeNotification[]>([]);
  const [search, setSearch] = React.useState("");
  const [read, setRead] = React.useState<"all" | "read" | "unread">("all");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeNotifications(user.id, setNotifications);
    return unsubscribe;
  }, [user]);

  const filtered = filterNotifications(notifications, { search, read });
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function markRead() {
    if (!user) return;
    await markNotificationsRead(user.id);
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="In-app workflow notifications." actions={<Button variant="secondary" onClick={markRead}>Mark all read</Button>} />
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search notifications..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        <select value={read} onChange={(e) => { setRead(e.target.value as typeof read); setPage(1); }} className="h-10 rounded-md border border-border bg-white px-3 text-sm">
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>
      <div className="space-y-3">
        {visible.map((notification) => (
          <div key={notification.id} className="rounded-lg border border-border bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium">{notification.title}</p>
              <span className="text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
          </div>
        ))}
        {visible.length === 0 ? <p className="text-sm text-muted-foreground">No notifications found.</p> : null}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
          <Button variant="secondary" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
        </div>
      </div>
    </div>
  );
}
