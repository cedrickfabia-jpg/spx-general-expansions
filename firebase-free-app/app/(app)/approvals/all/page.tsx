"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { listAllRequests, type FreeRequest } from "@/lib/data";
import { RequestList } from "@/components/request-list";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";

export default function AllApprovalsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = React.useState<FreeRequest[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user?.roles.includes("ADMINISTRATOR")) return;
    listAllRequests().then((items) => { setRequests(items); setLoading(false); }).catch(console.error);
  }, [user]);

  if (!user?.roles.includes("ADMINISTRATOR")) return <p className="text-sm text-muted-foreground">Administrator access required.</p>;
  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <PageHeader title="All Approvals" description="Every approval request across all hubs." actions={<Button variant="secondary" onClick={() => downloadCsv("all-approvals.csv", ["Request ID", "Title", "Hub", "Requester", "Status", "Submitted"], requests.map((r) => [r.requestNumber || "Draft", r.title, r.hubName, r.requesterName, r.status, r.submittedAt ?? ""]))}>Export CSV</Button>} />
      {requests.length > 0 ? (
        <div className="rounded-lg border border-border bg-white p-2"><RequestList requests={requests} /></div>
      ) : <EmptyState title="No requests" description="No approval requests exist yet." />}
    </div>
  );
}
