import { requireAdmin } from "@/lib/auth-session";
import { listHubs } from "@/features/hod-approvals/repository";
import { PageHeader } from "@/components/ui/page-header";
import { HubsManager } from "@/components/admin/hubs-manager";

export default async function AdminHubsPage() {
  await requireAdmin();
  const hubs = listHubs(true);
  return (
    <div className="space-y-6">
      <PageHeader title="Hubs" description="Add, edit, and activate hubs used by the HOD Approval workflow." />
      <HubsManager initialHubs={hubs.map((hub) => ({ id: hub.id, name: hub.name, active: hub.active }))} />
    </div>
  );
}
