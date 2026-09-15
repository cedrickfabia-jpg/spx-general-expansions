"use client";

import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";

const settings = [
  ["App name", "SPX Network Development App"],
  ["Hosting", "Firebase Hosting (free static)"],
  ["Data", "Firestore (free tier)"],
  ["Auth", "Firebase Auth"],
  ["Region", "asia-southeast1"]
];

export default function SettingsPage() {
  const { user } = useAuth();
  if (!user?.roles.includes("ADMINISTRATOR")) return <p className="text-sm text-muted-foreground">Administrator access required.</p>;
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Current application configuration." />
      <div className="rounded-lg border border-border bg-white p-6">
        <dl className="divide-y divide-border">
          {settings.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-3">
              <dt className="text-sm font-medium">{label}</dt>
              <dd className="text-sm text-muted-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
