import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth-session";
import { listHubs, listMyRequests } from "@/features/hod-approvals/repository";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/filter-bar";
import { RequestTable } from "@/components/request-table";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/ui/empty-state";

export default async function MyRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const result = listMyRequests(user.id, {
    search: params.search,
    status: params.status,
    hubId: params.hubId,
    page
  });
  const hubs = listHubs(true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Requests"
        description="Requests you created, including drafts and completed approvals."
        actions={
          <Link href="/approvals/new">
            <Button>
              <Plus className="h-4 w-4" aria-hidden="true" /> New HOD Approval
            </Button>
          </Link>
        }
      />
      <FilterBar path="/approvals/my-requests" search={params.search} status={params.status} hubId={params.hubId} hubs={hubs} />
      {result.items.length > 0 ? (
        <div className="surface p-2">
          <RequestTable items={result.items} showRequester={false} />
          <Pagination page={result.page} totalPages={result.totalPages} basePath="/approvals/my-requests" query={params} />
        </div>
      ) : (
        <EmptyState
          title="No requests yet"
          description="Create an HOD Approval request to start the workflow."
          action={<Link href="/approvals/new"><Button>New HOD Approval</Button></Link>}
        />
      )}
    </div>
  );
}
