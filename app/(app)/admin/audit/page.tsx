import { requireAdmin } from "@/lib/auth-session";
import { listAuditLogs } from "@/features/hod-approvals/repository";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/time";
import { Download } from "lucide-react";

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const result = listAuditLogs(page, 50, {
    search: params.search,
    action: params.action,
    from: params.from,
    to: params.to
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" description="Immutable record of authentication, workflow, document, and configuration events." />
      <form method="get" action="/admin/audit" className="surface flex flex-wrap items-end gap-3 p-4">
        <div className="form-field min-w-[180px] flex-1">
          <label htmlFor="audit-search" className="text-xs font-medium text-muted-foreground">Search</label>
          <Input id="audit-search" name="search" defaultValue={params.search ?? ""} placeholder="Action, entity, actor" />
        </div>
        <div className="form-field w-44">
          <label htmlFor="audit-action" className="text-xs font-medium text-muted-foreground">Action</label>
          <Input id="audit-action" name="action" defaultValue={params.action ?? ""} placeholder="e.g. APPROVAL_APPROVED" />
        </div>
        <div className="form-field w-44">
          <label htmlFor="audit-from" className="text-xs font-medium text-muted-foreground">From</label>
          <Input id="audit-from" type="date" name="from" defaultValue={params.from ?? ""} />
        </div>
        <div className="form-field w-44">
          <label htmlFor="audit-to" className="text-xs font-medium text-muted-foreground">To</label>
          <Input id="audit-to" type="date" name="to" defaultValue={params.to ?? ""} />
        </div>
        <Button type="submit" variant="secondary">Apply Filters</Button>
      </form>
      <form method="get" action="/api/admin/audit/export" className="surface flex flex-wrap items-end gap-3 p-4">
        <input type="hidden" name="search" value={params.search ?? ""} />
        <input type="hidden" name="action" value={params.action ?? ""} />
        <input type="hidden" name="from" value={params.from ?? ""} />
        <input type="hidden" name="to" value={params.to ?? ""} />
        <div>
          <p className="text-sm font-medium">Export audit log as CSV</p>
          <p className="text-xs text-muted-foreground">Uses the filters above.</p>
        </div>
        <Button type="submit" variant="secondary">
          <Download className="h-4 w-4" aria-hidden="true" /> Download Audit CSV
        </Button>
      </form>
      <div className="surface p-2">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-xs">{formatDateTime(entry.createdAt)}</TableCell>
                  <TableCell className="max-w-[180px] truncate">
                    <span className="block truncate">{entry.actorName ?? "System"}</span>
                    <span className="block truncate text-xs text-muted-foreground">{entry.actorEmail ?? ""}</span>
                  </TableCell>
                  <TableCell><span className="font-mono text-xs">{entry.action}</span></TableCell>
                  <TableCell className="text-xs">{entry.entityType ?? "-"}</TableCell>
                  <TableCell className="max-w-[160px] truncate font-mono text-xs">{entry.entityId ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pagination page={result.page} totalPages={result.totalPages} basePath="/admin/audit" query={params} />
      </div>
    </div>
  );
}
