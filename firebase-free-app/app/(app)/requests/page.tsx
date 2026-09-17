"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { subscribeMyRequests, type FreeRequest } from "@/lib/data";
import type { RequestListItem } from "@/features/hod-approvals/repository";
import { RequestTable } from "@/components/request-table";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CsvExportButton } from "@/components/csv-export-button";
import { Input } from "@/components/ui/input";

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
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeMyRequests(user.id, (items) => { setRequests(items); setLoading(false); });
    return unsubscribe;
  }, [user]);

  const filtered = requests.filter((request) => {
    const text = `${request.title} ${request.requestNumber ?? ""} ${request.hubName}`.toLowerCase();
    const matchesSearch = !search || text.includes(search.toLowerCase());
    const matchesStatus = !status || request.status === status;
    return matchesSearch && matchesStatus;
  });
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Requests"
        description="Requests you created, including drafts and completed approvals."
        actions={<>
          <CsvExportButton requests={requests} filename="my-requests.csv" />
          <Link href="/requests/new"><Button><Plus className="mr-2 h-4 w-4" aria-hidden="true" /> New HOD Approval</Button></Link>
        </>}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search requests..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-10 rounded-md border border-border bg-white px-3 text-sm">
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="QUESTION_RAISED">Question Raised</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
      {visible.length > 0 ? (
        <div className="rounded-lg border border-border bg-white p-2">
          <RequestTable items={visible.map(toListItem)} showRequester={false} />
        </div>
      ) : (
        <EmptyState title="No requests found" description="Try a different search or filter." />
      )}
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
