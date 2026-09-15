import { requireUser } from "@/lib/auth-session";
import { listHubs, listMyApprovals } from "@/features/hod-approvals/repository";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/filter-bar";
import { RequestTable } from "@/components/request-table";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/ui/empty-state";

export default async function MyApprovalsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const result = listMyApprovals(user.id, {
    search: params.search,
    status: params.status,
    hubId: params.hubId,
    page
  });
  const hubs = listHubs(true);

  return (
    <div className="space-y-6">
      <PageHeader title="My Approvals" description="Requests where you are assigned as an HOD approver." />
      <FilterBar path="/approvals/my-approvals" search={params.search} status={params.status} hubId={params.hubId} hubs={hubs} />
      {result.items.length > 0 ? (
        <div className="surface p-2">
          <RequestTable items={result.items} />
          <Pagination page={result.page} totalPages={result.totalPages} basePath="/approvals/my-approvals" query={params} />
        </div>
      ) : (
        <EmptyState title="No assigned approvals" description="Requests assigned to you will appear here when HOD approvers are configured." />
      )}
    </div>
  );
}
