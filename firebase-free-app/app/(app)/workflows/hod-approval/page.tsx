"use client";

import { PageHeader } from "@/components/ui/page-header";

export default function HODApprovalWorkflowPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="HOD Approval Workflow" description="How the Network Development HOD Approval process works." />
      <div className="rounded-lg border border-border bg-white p-6">
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>Requester completes the HOD Approval form.</li>
          <li>Required documents are uploaded before submission.</li>
          <li>Within CPO Budget routes to one HOD approver.</li>
          <li>Above CPO Budget routes to two HOD approvers sequentially.</li>
          <li>Approvers approve, reject, or raise questions.</li>
          <li>Questions pause the workflow until the requester responds.</li>
          <li>Every action is recorded in the audit log.</li>
        </ol>
      </div>
    </div>
  );
}
