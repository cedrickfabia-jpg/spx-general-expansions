"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { downloadCsv } from "@/lib/csv";
import type { FreeRequest } from "@/lib/data";

export function CsvExportButton({
  requests,
  filename,
  showRequester = false
}: {
  requests: FreeRequest[];
  filename: string;
  showRequester?: boolean;
}) {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [status, setStatus] = React.useState("");

  function exportCsv() {
    const filtered = requests.filter((request) => {
      const date = request.submittedAt || request.createdAt;
      if (from && date < new Date(`${from}T00:00:00`).toISOString()) return false;
      if (to && date > new Date(`${to}T23:59:59`).toISOString()) return false;
      if (status && request.status !== status) return false;
      return true;
    });
    const headers = ["Request ID", "Title", "Hub", ...(showRequester ? ["Requester"] : []), "Status", "Submitted"];
    const rows = filtered.map((request) => [
      request.requestNumber || "Draft",
      request.title,
      request.hubName,
      ...(showRequester ? [request.requesterName] : []),
      request.status,
      request.submittedAt ?? ""
    ]);
    downloadCsv(filename, headers, rows);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <Label htmlFor="csv-from">From</Label>
        <Input id="csv-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
      </div>
      <div>
        <Label htmlFor="csv-to">To</Label>
        <Input id="csv-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
      </div>
      <div>
        <Label htmlFor="csv-status">Status</Label>
        <select id="csv-status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-md border border-border bg-white px-2 text-sm">
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="QUESTION_RAISED">Question Raised</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
      <Button variant="secondary" onClick={exportCsv}><Download className="mr-2 h-4 w-4" aria-hidden="true" /> Export CSV</Button>
    </div>
  );
}
