import { requireAdmin } from "@/lib/auth-session";
import { listAllRequests, listHubs } from "@/features/hod-approvals/repository";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/filter-bar";
import { RequestTable } from "@/components/request-table";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { BulkCsvExport } from "@/components/admin/bulk-csv-export";

export default async function AllRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const result = listAllRequests({
    search: params.search,
    status: params.status,
    hubId: params.hubId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    approverEmail: params.approver,
    watcherEmail: params.watcher,
    page
  });
  const hubs = listHubs(true);

  return (
    <div className="space-y-6">
      <PageHeader title="All Requests" description="Administrator view of every HOD Approval request." />
      <FilterBar
        path="/approvals/all"
        search={params.search}
        status={params.status}
        hubId={params.hubId}
        hubs={hubs}
        dateFrom={params.dateFrom}
        dateTo={params.dateTo}
        approver={params.approver}
        watcher={params.watcher}
        showAdvancedFilters
      />
      {result.items.length > 0 ? (
        <div className="space-y-4">
          <BulkCsvExport
            items={result.items.map((item) => ({
              id: item.request.id,
              requestNumber: item.request.requestNumber,
              title: item.request.title
            }))}
          />
          <div className="surface p-2">
            <RequestTable items={result.items} />
            <Pagination page={result.page} totalPages={result.totalPages} basePath="/approvals/all" query={params} />
          </div>
        </div>
      ) : (
        <EmptyState title="No requests found" description="Adjust the filters or create a new request." />
      )}
    </div>
  );
}
