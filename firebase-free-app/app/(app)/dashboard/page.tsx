"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { listApprovalsForUser, listMyRequests, listNotifications } from "@/lib/data";

export default function DashboardPage() {
  const { user } = useAuth();
  const [counts, setCounts] = React.useState({ requests: 0, approvals: 0, notifications: 0 });

  React.useEffect(() => {
    if (!user) return;
    Promise.all([listMyRequests(user.id), listApprovalsForUser(user.id), listNotifications(user.id)])
      .then(([requests, approvals, notifications]) => setCounts({
        requests: requests.length,
        approvals: approvals.filter((r) => r.status === "PENDING_APPROVAL" || r.status === "QUESTION_RAISED").length,
        notifications: notifications.filter((n) => !n.read).length
      }))
      .catch(console.error);
  }, [user]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome, {user?.name.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-muted-foreground">SPX Expansions HOD Approval workflow</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-white p-5">
          <p className="text-sm text-muted-foreground">My Requests</p>
          <p className="mt-2 text-3xl font-semibold">{counts.requests}</p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5">
          <p className="text-sm text-muted-foreground">Pending Approvals</p>
          <p className="mt-2 text-3xl font-semibold">{counts.approvals}</p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5">
          <p className="text-sm text-muted-foreground">Unread Notifications</p>
          <p className="mt-2 text-3xl font-semibold">{counts.notifications}</p>
        </div>
      </div>
    </div>
  );
}
