import { requireUser } from "@/lib/auth-session";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/time";
import { queryOne } from "@/lib/db";
import { getSetting } from "@/features/hod-approvals/repository";
import { WatcherPreferences } from "@/components/watcher-preferences";

export default async function ProfilePage() {
  const user = await requireUser();
  const row = queryOne<{ created_at: string; last_login_at: string | null }>(
    `SELECT created_at, last_login_at FROM users WHERE id = ?`,
    [user.id]
  );
  const watcherEmailFrequency = String(getSetting(`watcherEmailFrequency:${user.id}`, "IMMEDIATE"));
  const roleLabels: Record<string, string> = {
    REQUESTER: "Requester",
    HOD_APPROVER: "HOD Approver",
    WATCHER: "Watcher / Stakeholder",
    ADMINISTRATOR: "Administrator"
  };
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Profile" description="Your organizational identity and access roles." />
      <div className="surface p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
            {user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{user.name}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Roles</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {user.roles.map((role) => (
                <Badge key={role} variant="default">{roleLabels[role] ?? role}</Badge>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Account created</dt>
            <dd className="mt-1 text-sm font-medium">{row ? formatDateTime(row.created_at) : "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Last login</dt>
            <dd className="mt-1 text-sm font-medium">{row?.last_login_at ? formatDateTime(row.last_login_at) : "Never"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Account status</dt>
            <dd className="mt-1 text-sm font-medium">{user.active ? "Active" : "Deactivated"}</dd>
          </div>
        </dl>
      </div>
      <div className="surface p-6">
        <p className="section-title">Watcher Preferences</p>
        <p className="mt-1 text-sm text-muted-foreground">Choose how often you receive watcher email updates.</p>
        <div className="mt-4 max-w-sm">
          <WatcherPreferences initialValue={watcherEmailFrequency} />
        </div>
      </div>
    </div>
  );
}
