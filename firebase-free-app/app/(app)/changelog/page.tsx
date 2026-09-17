"use client";

import { PageHeader } from "@/components/ui/page-header";

const changes = [
  "Live app released on Firebase free plan",
  "HOD Approval workflow with CPO routing",
  "PDF generation for approved requests",
  "Real-time request and notification updates",
  "Role-based navigation",
  "Administrator super account",
  "Firestore backups and restore workflow",
  "Uptime and performance monitoring",
  "Error logs viewer",
  "Audit CSV and PDF export",
  "6-month data archive",
  "Privacy and compliance policy"
];

export default function ChangelogPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Changelog" description="Recent changes and releases." />
      <div className="rounded-lg border border-border bg-white p-6">
        <ol className="list-disc space-y-2 pl-5 text-sm">
          {changes.map((change) => <li key={change}>{change}</li>)}
        </ol>
      </div>
    </div>
  );
}
