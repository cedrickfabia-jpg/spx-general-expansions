import Link from "next/link";
import { Download, Users, Building2, Route, Bell, ScrollText } from "lucide-react";
import { requireAdmin } from "@/lib/auth-session";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const sections = [
  { href: "/admin/users", label: "Users & Roles", description: "Activate accounts and assign roles.", icon: Users },
  { href: "/admin/hubs", label: "Hubs", description: "Add, edit, and activate hubs.", icon: Building2 },
  { href: "/admin/routes", label: "HOD Approvers", description: "Configure HOD Approver 1 and 2 per hub.", icon: Route },
  { href: "/admin/settings", label: "Notifications", description: "Configure reminders and escalation.", icon: Bell },
  { href: "/admin/audit", label: "Audit Log", description: "Review immutable audit events.", icon: ScrollText }
];

export default async function AdminIndexPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <PageHeader title="Administration" description="Manage users, routing, hubs, budget configuration, notifications, and audit history." />
      <div className="surface flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="section-title">History Export</p>
          <p className="mt-1 text-sm text-muted-foreground">Download HOD approval history as a CSV file. Optionally filter by request creation date.</p>
        </div>
        <form method="get" action="/api/admin/history/export" className="flex flex-wrap items-end gap-3">
          <div className="form-field">
            <label htmlFor="history-from" className="text-xs font-medium text-muted-foreground">From</label>
            <Input id="history-from" type="date" name="from" />
          </div>
          <div className="form-field">
            <label htmlFor="history-to" className="text-xs font-medium text-muted-foreground">To</label>
            <Input id="history-to" type="date" name="to" />
          </div>
          <Button type="submit" variant="secondary">
            <Download className="h-4 w-4" aria-hidden="true" />
            Download History CSV
          </Button>
        </form>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href} className="surface p-5 transition-colors hover:border-primary/40 hover:bg-primary/5">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="mt-3 text-sm font-semibold">{section.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
