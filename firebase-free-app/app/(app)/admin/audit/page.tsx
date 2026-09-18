"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { listAudit, type FreeAudit } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/time";
import { downloadCsv } from "@/lib/csv";
import { buildAuditPdf } from "@/lib/audit-pdf";
import { AccessDenied } from "@/components/access-denied";

export default function AuditPage() {
  const { user } = useAuth();
  const [logs, setLogs] = React.useState<FreeAudit[]>([]);

  React.useEffect(() => { listAudit().then(setLogs).catch(console.error); }, []);

  if (!user?.roles.includes("ADMINISTRATOR")) {
    return <AccessDenied message="Administrator access required." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" description="Immutable history of meaningful actions." actions={<>
        <Button variant="secondary" onClick={() => downloadCsv("audit-log.csv", ["Time", "Actor", "Action", "Details"], logs.map((log) => [log.createdAt, log.actorEmail, log.action, log.details]))}>Export CSV</Button>
        <Button variant="secondary" onClick={async () => {
          const bytes = await buildAuditPdf(logs);
          const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "audit-log.pdf";
          link.click();
          URL.revokeObjectURL(url);
        }}>Export PDF</Button>
      </>} />
      <div className="overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Details</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                <td className="px-4 py-3">{log.actorEmail}</td>
                <td className="px-4 py-3 font-medium">{log.action.replace(/_/g, " ")}</td>
                <td className="max-w-[300px] truncate px-4 py-3 text-xs text-muted-foreground">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
