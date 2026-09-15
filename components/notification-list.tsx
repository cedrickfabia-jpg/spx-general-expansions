"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/time";
import type { NotificationRow } from "@/features/hod-approvals/types";

export function NotificationList({ items }: { items: NotificationRow[] }) {
  const router = useRouter();

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "markAllRead" })
    });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {items.map((notification) => {
        const unread = notification.readAt === null;
        const href = notification.entityId ? `/approvals/${notification.entityId}` : "/notifications";
        return (
          <Link
            key={notification.id}
            href={href}
            className={`block rounded-md border border-border bg-white p-4 transition-colors hover:bg-muted/40 ${unread ? "border-l-4 border-l-primary" : ""}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{notification.title}</p>
              <span className="text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
            {unread ? <span className="mt-2 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">New</span> : null}
          </Link>
        );
      })}
      <div className="flex justify-end pt-1">
        <Button variant="outline" size="sm" onClick={() => void markAllRead()}>
          <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all as read
        </Button>
      </div>
    </div>
  );
}
