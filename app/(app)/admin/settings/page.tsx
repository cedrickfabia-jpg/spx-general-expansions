import { requireAdmin } from "@/lib/auth-session";
import { getSetting } from "@/features/hod-approvals/repository";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const initial = {
    reminderAfterDays: Number(getSetting("reminderAfterDays", 1)),
    reminderEveryDays: Number(getSetting("reminderEveryDays", 1)),
    escalationAfterDays: Number(getSetting("escalationAfterDays", 7)),
    remindersEnabled: Boolean(getSetting("remindersEnabled", true))
  };
  return (
    <div className="space-y-6">
      <PageHeader title="Notification Settings" description="Configure reminder and escalation schedules. Workflow actions never depend on email delivery." />
      <SettingsForm initial={initial} />
    </div>
  );
}
