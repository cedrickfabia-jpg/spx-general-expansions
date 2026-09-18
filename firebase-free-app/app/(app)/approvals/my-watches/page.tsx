"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { listWatchedRequests, type FreeRequest } from "@/lib/data";
import { RequestList } from "@/components/request-list";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CsvExportButton } from "@/components/csv-export-button";
import { StatCard } from "@/components/ui/stat-card";

export default function MyWatchesPage() {
  const { user } = useAuth();
  const [requests, setRequests] = React.useState<FreeRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    if (!user) return;
    listWatchedRequests(user.email).then((items) => { setRequests(items); setLoading(false); }).catch(console.error);
  }, [user]);

  const filtered = requests.filter((request) => {
    const text = `${request.title} ${request.requestNumber ?? ""} ${request.hubName} ${request.requesterName}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (!status || request.status === status);
  });
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) return <LoadingState />;

  const pendingCount = requests.filter((r) => r.status === "PENDING_APPROVAL" || r.status === "QUESTION_RAISED").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED" || r.status === "CANCELLED").length;

  return (
    <div className="space-y-6">
      <PageHeader title="My Watches" description="Requests where you are listed as a watcher." actions={<CsvExportButton requests={requests} filename="my-watches.csv" />} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Watched" value={requests.length} />
        <StatCard label="Pending Approval" value={pendingCount} tone="warning" />
        <StatCard label="Approved" value={approvedCount} tone="success" />
        <StatCard label="Rejected / Cancelled" value={rejectedCount} tone="danger" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search requests..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-10 rounded-md border border-border bg-white px-3 text-sm">
          <option value="">All statuses</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="QUESTION_RAISED">Question Raised</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
      {visible.length > 0 ? (
        <div className="rounded-lg border border-border bg-white p-2"><RequestList requests={visible} /></div>
      ) : <EmptyState title="No watched requests found" description="Try a different search or filter." />}
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
