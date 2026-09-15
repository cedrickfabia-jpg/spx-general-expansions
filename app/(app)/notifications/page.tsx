import { requireUser } from "@/lib/auth-session";
import { listNotifications } from "@/lib/notifications";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationList } from "@/components/notification-list";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/ui/empty-state";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const result = listNotifications(user.id, page);

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Approval assignments, questions, responses, and workflow events." />
      {result.items.length > 0 ? (
        <div className="space-y-4">
          <NotificationList items={result.items} />
          <Pagination page={result.page} totalPages={result.totalPages} basePath="/notifications" query={params} />
        </div>
      ) : (
        <EmptyState title="No notifications" description="New workflow events will appear here." />
      )}
    </div>
  );
}
