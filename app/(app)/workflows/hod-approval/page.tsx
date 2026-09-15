import Link from "next/link";
import { CheckCircle2, ClipboardList, Clock, ClipboardCheck, Eye, FileText, MessageSquare, Plus, Route, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth-session";
import {
  getAdminDashboardStats,
  getApproverDashboardStats,
  getRequesterDashboardStats,
  listAllRequests,
  listMyRequests,
  listMyWatchedRequests
} from "@/features/hod-approvals/repository";
import { getWorkflow } from "@/lib/workflows";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { RequestTable } from "@/components/request-table";
import { EmptyState } from "@/components/ui/empty-state";

export default async function HODApprovalWorkflowPage() {
  const user = await requireUser();
  const workflow = getWorkflow("hod-approval")!;
  const stats = user.isAdmin
    ? getAdminDashboardStats()
    : user.roles.includes("HOD_APPROVER")
      ? getApproverDashboardStats(user.id)
      : getRequesterDashboardStats(user.id);
  const isWatcherOnly = user.roles.includes("WATCHER") && !user.roles.includes("REQUESTER") && !user.roles.includes("HOD_APPROVER");
  const recent = user.isAdmin
    ? listAllRequests({ page: 1, pageSize: 5 })
    : isWatcherOnly
      ? listMyWatchedRequests(user.id, { page: 1, pageSize: 5 })
      : listMyRequests(user.id, { page: 1, pageSize: 5 });
  const watched = !user.isAdmin && user.roles.includes("WATCHER") && !isWatcherOnly
    ? listMyWatchedRequests(user.id, { page: 1, pageSize: 5 })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={workflow.name}
        description="HOD 1 approves within-budget requests; above-budget requests go to HOD 1 first, then HOD 2."
        actions={<Link href="/approvals/new"><Button><Plus className="h-4 w-4" aria-hidden="true" /> New HOD Approval</Button></Link>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
        <StatCard label="Drafts" value={stats.drafts} icon={<FileText className="h-4 w-4" aria-hidden="true" />} tone="muted" />
        <StatCard label="Pending" value={stats.pending} icon={<Clock className="h-4 w-4" aria-hidden="true" />} tone="warning" />
        <StatCard label="Questions" value={stats.questions} icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />} tone="warning" />
        <StatCard label="Approved" value={stats.approved} icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />} tone="success" />
        <StatCard label="Rejected" value={stats.rejected} icon={<XCircle className="h-4 w-4" aria-hidden="true" />} tone="danger" />
        <StatCard label="Cancelled" value={stats.cancelled} icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />} tone="muted" />
        <StatCard label="Overdue" value={stats.overdue} icon={<Clock className="h-4 w-4" aria-hidden="true" />} tone="danger" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/approvals/my-requests" className="surface p-5 transition-colors hover:border-primary/40 hover:bg-primary/5">
          <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-semibold">My Requests</h2>
          <p className="mt-1 text-sm text-muted-foreground">Requests you created, including drafts.</p>
        </Link>
        <Link href="/approvals/my-approvals" className="surface p-5 transition-colors hover:border-primary/40 hover:bg-primary/5">
          <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-semibold">My Approvals</h2>
          <p className="mt-1 text-sm text-muted-foreground">Approval steps assigned to you.</p>
        </Link>
        {user.roles.includes("WATCHER") ? (
          <Link href="/approvals/my-watches" className="surface p-5 transition-colors hover:border-primary/40 hover:bg-primary/5">
            <Eye className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold">My Watches</h2>
            <p className="mt-1 text-sm text-muted-foreground">Requests where you are a watcher.</p>
          </Link>
        ) : null}
        {user.isAdmin ? (
          <Link href="/admin/routes" className="surface p-5 transition-colors hover:border-primary/40 hover:bg-primary/5">
            <Route className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold">Assign HOD 1 / HOD 2</h2>
            <p className="mt-1 text-sm text-muted-foreground">Configure approvers for this workflow.</p>
          </Link>
        ) : null}
      </div>

      <div className="surface p-2">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="section-title">Recent Requests</h2>
          <Link href="/approvals/my-requests" className="text-sm font-medium text-primary hover:underline">View all</Link>
        </div>
        {recent.items.length > 0 ? (
          <RequestTable items={recent.items} showRequester={user.isAdmin} showApprovalDates />
        ) : (
          <div className="p-4">
            <EmptyState title="No requests yet" description="Your requests will appear here once you create one." />
          </div>
        )}
      </div>

      {watched ? (
        <div className="surface p-2">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="section-title">Requests I Watch</h2>
            <Link href="/approvals/my-watches" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </div>
          {watched.items.length > 0 ? (
            <RequestTable items={watched.items} showRequester />
          ) : (
            <div className="p-4">
              <EmptyState title="No watched requests yet" description="Requests you are added to as a watcher will appear here." />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
