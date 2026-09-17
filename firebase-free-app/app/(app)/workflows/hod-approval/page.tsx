"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getRequest, listDocuments, listSteps, subscribeMyRequests, subscribeWatchedRequests, type FreeDocument, type FreeRequest, type FreeStep } from "@/lib/data";
import { RequestList } from "@/components/request-list";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/time";

export default function HODApprovalWorkflowPage() {
  const { user } = useAuth();
  const [requests, setRequests] = React.useState<FreeRequest[]>([]);
  const [watched, setWatched] = React.useState<FreeRequest[]>([]);
  const [summary, setSummary] = React.useState<{ request: FreeRequest; steps: FreeStep[]; documents: FreeDocument[] } | null>(null);
  const [summaryError, setSummaryError] = React.useState("");

  React.useEffect(() => {
    if (!user) return;
    const unsubRequests = subscribeMyRequests(user.id, setRequests);
    const unsubWatched = subscribeWatchedRequests(user.email, setWatched);
    return () => { unsubRequests(); unsubWatched(); };
  }, [user]);

  async function openSummary(id: string) {
    setSummaryError("");
    try {
      const [request, steps, documents] = await Promise.all([getRequest(id), listSteps(id), listDocuments(id)]);
      if (request) setSummary({ request, steps, documents });
    } catch (error) {
      setSummary(null);
      setSummaryError(error instanceof Error ? error.message : "Could not load request summary");
    }
  }

  const activeStep = summary?.steps.find((step) => step.status === "ACTIVE");
  const questionStep = summary?.steps.find((step) => step.status === "QUESTION_RAISED");
  const completedSteps = summary?.steps.filter((step) => step.status === "APPROVED").length ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center px-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white shadow-sm">ND</span>
        <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl">Welcome to SPX Network Development App</h1>
        <p className="mt-3 text-base text-muted-foreground">{user?.name}</p>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Requests</h2>
        <Link href="/requests/new"><Button><Plus className="mr-2 h-4 w-4" aria-hidden="true" /> New HOD Approval</Button></Link>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-white lg:col-span-2">
          <ul className="divide-y divide-border">
            {requests.map((request) => (
              <li key={request.id}>
                <button type="button" onClick={() => openSummary(request.id)} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-muted">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{request.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{request.requestNumber || "Draft"} · {request.hubName}</p>
                  </div>
                  <StatusBadge status={request.status} />
                </button>
              </li>
            ))}
            {requests.length === 0 ? <li className="px-4 py-6 text-sm text-muted-foreground">No requests yet.</li> : null}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-white p-5">
          {summary ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold">{summary.request.title}</h3>
                  <StatusBadge status={summary.request.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{summary.request.requestNumber || "Draft"} · {summary.request.hubName}</p>
              </div>
              <div className="border-t border-border pt-3 text-sm">
                <p><span className="font-medium">Region:</span> {String(summary.request.formData.region ?? "-")}</p>
                <p><span className="font-medium">Hub Name:</span> {String(summary.request.formData.hubName ?? "-")}</p>
                <p><span className="font-medium">CPO Budget:</span> {String(summary.request.cpoBudgetStatus ?? "-").replace(/_/g, " ")}</p>
                <p><span className="font-medium">Submitted:</span> {summary.request.submittedAt ? formatDateTime(summary.request.submittedAt) : "Not submitted"}</p>
              </div>
              <div className="border-t border-border pt-3">
                <h4 className="text-sm font-semibold">Approval Status</h4>
                <p className="mt-2 text-sm">
                  {summary.request.status === "PENDING_APPROVAL" && activeStep ? `Currently with HOD Approver ${activeStep.sequence} (${activeStep.approverName}).` : null}
                  {summary.request.status === "QUESTION_RAISED" ? `Question raised by HOD Approver ${questionStep?.sequence ?? 1} (${questionStep?.approverName ?? ""}).` : null}
                  {summary.request.status === "DRAFT" ? "Not submitted yet." : null}
                  {summary.request.status === "APPROVED" ? "Fully approved." : null}
                  {summary.request.status === "REJECTED" ? "Rejected." : null}
                  {summary.request.status === "CANCELLED" ? "Cancelled." : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Step {completedSteps} of {summary.steps.length || 1} completed</p>
                <ul className="mt-2 space-y-1">
                  {summary.steps.map((step) => (
                    <li key={step.id} className="text-xs text-muted-foreground">
                      HOD {step.sequence}: {step.approverName} · {step.status.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{summary.documents.length}</span> document(s) attached
              </div>
              <Link href={`/request?id=${summary.request.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                Open Full Request <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{summaryError || "Select a request to see the summary and approval status."}</p>
          )}
        </div>
      </div>
      {user?.roles.includes("WATCHER") ? (
        <>
          <h2 className="text-xl font-semibold">My Watches</h2>
          <div className="rounded-lg border border-border bg-white p-2">
            <RequestList requests={watched} />
          </div>
        </>
      ) : null}
    </div>
  );
}
