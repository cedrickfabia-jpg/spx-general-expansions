"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { listApprovalsForUser, type FreeRequest } from "@/lib/data";
import type { RequestListItem } from "@/features/hod-approvals/repository";
import { RequestTable } from "@/components/request-table";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

function toListItem(request: FreeRequest): RequestListItem {
  return {
    request: { id: request.id, requestNumber: request.requestNumber || null, title: request.title, status: request.status, submittedAt: request.submittedAt, updatedAt: request.submittedAt ?? request.createdAt },
    hubName: request.hubName,
    requesterName: request.requesterName
  };
}

export default function MyApprovalsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = React.useState<FreeRequest[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;
    listApprovalsForUser(user.id).then((items) => { setRequests(items); setLoading(false); }).catch(console.error);
  }, [user]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <PageHeader title="My Approvals" description="Requests assigned to you for HOD approval." />
      {requests.length > 0 ? (
        <div className="rounded-lg border border-border bg-white p-2">
          <RequestTable items={requests.map(toListItem)} />
        </div>
      ) : (
        <EmptyState title="No approvals assigned" description="Requests routed to you will appear here." action={<Link href="/dashboard" className="text-sm text-primary hover:underline">Go to dashboard</Link>} />
      )}
    </div>
  );
}
