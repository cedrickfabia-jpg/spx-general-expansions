import { requireAdmin } from "@/lib/auth-session";
import { listUsersAdmin, listWorkflowApprovers } from "@/features/hod-approvals/repository";
import { PageHeader } from "@/components/ui/page-header";
import { RoutesManager } from "@/components/admin/routes-manager";
import { getWorkflow } from "@/lib/workflows";

export default async function AdminRoutesPage() {
  await requireAdmin();
  const usersResult = listUsersAdmin("", 1, 300);
  const workflow = getWorkflow("hod-approval")!;
  const approvers = listWorkflowApprovers("hod-approval");
  const users = usersResult.items;
  return (
    <div className="space-y-6">
      <PageHeader title="HOD Approver Routing" description="Assign the HOD 1 and HOD 2 users for this workflow. Within-budget requests stop at HOD 1; above-budget requests continue to HOD 2." />
      <RoutesManager
        users={users.map((user) => ({ id: user.id, name: user.name, email: user.email, roles: user.roles }))}
        initialApprovers={approvers.map((approver) => {
          const user = users.find((candidate) => candidate.id === approver.userId);
          return {
            slot: approver.slot,
            userId: approver.userId,
            userName: user?.name ?? "",
            userEmail: user?.email ?? ""
          };
        })}
        workflowName={workflow.name}
      />
    </div>
  );
}
