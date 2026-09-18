"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { acknowledgeCompliance } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { AccessDenied } from "@/components/access-denied";

export default function PrivacyPage() {
  const { user } = useAuth();
  const [saved, setSaved] = React.useState(false);

  if (!user?.roles.includes("ADMINISTRATOR")) return <AccessDenied message="Administrator access required." />;

  async function acknowledge() {
    await acknowledgeCompliance(user!.id);
    setSaved(true);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Privacy and Compliance" description="Data retention and access policy." />
      <div className="rounded-lg border border-border bg-white p-6">
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>Completed, rejected, and cancelled requests are archived after 6 months.</li>
          <li>Users only see requests they are assigned to or tagged in.</li>
          <li>Administrators can see all requests and logs.</li>
          <li>Audit logs cannot be edited or deleted.</li>
          <li>Only @spxexpress.com accounts can use the app.</li>
        </ul>
        <Button className="mt-6" onClick={acknowledge}>{saved ? "Acknowledged" : "Acknowledge policy"}</Button>
      </div>
    </div>
  );
}
