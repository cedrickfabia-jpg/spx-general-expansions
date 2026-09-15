import { requireAdmin } from "@/lib/auth-session";
import { listUsersAdmin, listWorkflowAccess } from "@/features/hod-approvals/repository";
import { PageHeader } from "@/components/ui/page-header";
import { UsersManager } from "@/components/admin/users-manager";
import { WORKFLOWS } from "@/lib/workflows";

export default async function AdminUsersPage() {
  await requireAdmin();
  const result = listUsersAdmin("", 1, 200);
  const workflows = WORKFLOWS.map((workflow) => ({
    id: workflow.id,
    name: workflow.name,
    accessTypes: workflow.accessTypes
  }));
  const workflowAccess = listWorkflowAccess();
  return (
    <div className="space-y-6">
      <PageHeader title="Users & Workflow Access" description="Grant workflow-specific access and manage account status. Permissions are enforced server-side." />
      <UsersManager
        users={result.items.map((user) => ({ id: user.id, name: user.name, email: user.email, active: user.active, roles: user.roles }))}
        workflows={workflows}
        initialWorkflowAccess={workflowAccess.map((item) => ({
          workflowId: item.workflowId,
          userId: item.userId,
          userName: item.userName,
          userEmail: item.userEmail,
          accessType: item.accessType
        }))}
      />
    </div>
  );
}
