import { requireUser } from "@/lib/auth-session";
import { listHubs, listMyWatchedRequests } from "@/features/hod-approvals/repository";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/filter-bar";
import { RequestTable } from "@/components/request-table";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/ui/empty-state";

export default async function MyWatchesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const result = listMyWatchedRequests(user.id, {
    search: params.search,
    status: params.status,
    hubId: params.hubId,
    page
  });
  const hubs = listHubs(true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Watches"
        description="Requests where you are included as a watcher. These sync automatically when you log in."
      />
      <FilterBar path="/approvals/my-watches" search={params.search} status={params.status} hubId={params.hubId} hubs={hubs} />
      {result.items.length > 0 ? (
        <div className="surface p-2">
          <RequestTable items={result.items} showRequester />
          <Pagination page={result.page} totalPages={result.totalPages} basePath="/approvals/my-watches" query={params} />
        </div>
      ) : (
        <EmptyState title="No watched requests yet" description="Requests you are added to as a watcher will appear here." />
      )}
    </div>
  );
}
