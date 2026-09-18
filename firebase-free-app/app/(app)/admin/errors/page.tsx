"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { listErrorLogs, type FreeErrorLog } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/time";
import { downloadCsv } from "@/lib/csv";
import { AccessDenied } from "@/components/access-denied";

export default function ErrorLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = React.useState<FreeErrorLog[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => { listErrorLogs().then(setLogs).finally(() => setLoading(false)).catch(console.error); }, []);

  if (!user?.roles.includes("ADMINISTRATOR")) return <AccessDenied message="Administrator access required." />;
  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Error Logs" description="Errors captured from the live app." actions={<Button variant="secondary" onClick={() => downloadCsv("error-logs.csv", ["Time", "Context", "Message", "URL"], logs.map((log) => [log.createdAt, log.context, log.message, log.url]))}>Export CSV</Button>} />
      {logs.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Context</th><th className="px-4 py-3">Message</th><th className="px-4 py-3">URL</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3">{log.context}</td>
                  <td className="max-w-[360px] truncate px-4 py-3">{log.message}</td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-xs text-muted-foreground">{log.url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="No errors" description="No errors have been captured yet." />}
    </div>
  );
}
