"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { listMyRequests, type FreeRequest } from "@/lib/data";
import type { RequestListItem } from "@/features/hod-approvals/repository";
import { RequestTable } from "@/components/request-table";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { downloadCsv } from "@/lib/csv";

function toListItem(request: FreeRequest): RequestListItem {
  return {
    request: {
      id: request.id,
      requestNumber: request.requestNumber || null,
      title: request.title,
      status: request.status,
      submittedAt: request.submittedAt,
      updatedAt: request.submittedAt ?? request.createdAt
    },
    hubName: request.hubName,
    requesterName: request.requesterName
  };
}

export default function MyRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = React.useState<FreeRequest[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;
    listMyRequests(user.id).then((items) => { setRequests(items); setLoading(false); }).catch(console.error);
  }, [user]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Requests"
        description="Requests you created, including drafts and completed approvals."
        actions={<>
          <Button variant="secondary" onClick={() => downloadCsv("my-requests.csv", ["Request ID", "Title", "Hub", "Status", "Submitted"], requests.map((r) => [r.requestNumber || "Draft", r.title, r.hubName, r.status, r.submittedAt ?? ""]))}>Export CSV</Button>
          <Link href="/requests/new"><Button><Plus className="mr-2 h-4 w-4" aria-hidden="true" /> New HOD Approval</Button></Link>
        </>}
      />
      {requests.length > 0 ? (
        <div className="rounded-lg border border-border bg-white p-2">
          <RequestTable items={requests.map(toListItem)} showRequester={false} />
        </div>
      ) : (
        <EmptyState title="No requests yet" description="Create an HOD Approval request to start the workflow." action={<Link href="/requests/new"><Button>New HOD Approval</Button></Link>} />
      )}
    </div>
  );
}
