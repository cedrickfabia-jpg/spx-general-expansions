import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { requireUser } from "@/lib/auth-session";
import { getRequestDetail } from "@/features/hod-approvals/repository";
import { getUserById } from "@/lib/auth";
import { canActOnStep, canUploadDocuments, canViewRequest, canWithdraw } from "@/features/hod-approvals/permissions";
import { formatBytes, parseJson } from "@/lib/utils";
import { formatDateTime } from "@/lib/time";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { FormDisplay } from "@/components/form-display";
import { RoutePreview } from "@/components/route-preview";
import { ApprovalTimeline } from "@/components/timeline";
import { RequestActions } from "@/components/request-actions";
import { formFromRow } from "@/features/hod-approvals/forms/fields";
import type { RequestStatus } from "@/features/hod-approvals/types";

type PageProps = { params: Promise<{ id: string }> };

export default async function ApprovalDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const detail = getRequestDetail(id);
  if (!detail) notFound();
  const { request } = detail;
  const stepApproverIds = detail.steps.map((step) => [step.approverId, step.originalApproverId]).flat();
  if (!canViewRequest(user, request, detail.watcherUserIds, stepApproverIds)) notFound();

  const data = parseJson<Record<string, unknown>>(request.dataJson, {});
  const form = formFromRow(data);
  const isRequester = request.requesterId === user.id;
  const currentStep = detail.currentStep;

  return (
    <div className="space-y-6">
      <PageHeader
        title={request.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">{request.requestNumber ?? "Draft"}</span>
            <StatusBadge status={request.status as RequestStatus} />
            <span className="text-muted-foreground">Created {formatDateTime(request.createdAt)}</span>
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {request.status === "APPROVED" ? (
              <a href={`/api/approvals/${request.id}/pdf`}>
                <Button>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  HOD Approval PDF
                </Button>
              </a>
            ) : null}
            <Link href="/approvals/my-requests">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Requests
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <div className="surface p-5">
            <p className="section-title">Request Overview</p>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Requester</dt>
                <dd className="mt-0.5 text-sm font-medium">{detail.requester?.name ?? "Unknown"}</dd>
                <dd className="text-xs text-muted-foreground">{detail.requester?.email ?? ""}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Hub</dt>
                <dd className="mt-0.5 text-sm font-medium">{detail.hub?.name ?? "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Submitted</dt>
                <dd className="mt-0.5 text-sm font-medium">{request.submittedAt ? formatDateTime(request.submittedAt) : "Not submitted"}</dd>
              </div>
            </dl>
          </div>

          <FormDisplay data={data} hub={detail.hub} />

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="surface p-5">
              <p className="section-title">Approval Route</p>
              <div className="mt-4 max-w-md">
                <RoutePreview
                  count={request.requiredApproverCount ?? (request.cpoBudgetStatus === "ABOVE_CPO_BUDGET" ? 2 : 1)}
                  approvers={detail.steps.map((step) => {
                    const assigned = getUserById(step.approverId);
                    return {
                      slot: step.sequence,
                      name: assigned?.name ?? "Configured approver",
                      email: assigned?.email ?? ""
                    };
                  })}
                />
              </div>
            </div>
            <div className="surface p-5">
              <p className="section-title">Approval Timeline</p>
              <div className="mt-4">
                <ApprovalTimeline detail={detail} />
              </div>
            </div>
          </div>

          {detail.documents.length > 0 ? (
            <div className="surface p-5">
              <p className="section-title">Documents</p>
              <div className="mt-3 space-y-3">
                {detail.documents.map((document) => (
                  <div key={document.id} className="rounded-md border border-border bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{document.documentName}</p>
                          <p className="text-xs text-muted-foreground">
                            {document.versions.length} version{document.versions.length === 1 ? "" : "s"} · uploaded {formatDateTime(document.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    {document.versions.map((version) => {
                      const uploader = getUserById(version.uploadedBy);
                      return (
                        <div key={version.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/60 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm">
                              <span className="font-mono text-xs">v{version.versionNumber}</span>{" "}
                              <span className="font-medium">{version.originalFilename}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatBytes(version.fileSize)} · {uploader?.name ?? "Unknown"} · {formatDateTime(version.createdAt)}
                            </p>
                          </div>
                          <a
                            href={`/api/approvals/${request.id}/documents/${version.id}/download`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {detail.comments.length > 0 ? (
            <div className="surface p-5">
              <p className="section-title">Questions &amp; Comments</p>
              <div className="mt-3 space-y-3">
                {detail.comments.map((comment) => {
                  const author = getUserById(comment.authorId);
                  return (
                    <div key={comment.id} className="rounded-md border border-border bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={comment.type === "QUESTION" ? "warning" : "default"}>
                          {comment.type === "QUESTION" ? "Question" : comment.type === "RESPONSE" ? "Response" : "Note"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatDateTime(comment.createdAt)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm">{comment.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{author?.name ?? "Unknown"}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {detail.revisions.length > 1 ? (
            <div className="surface p-5">
              <p className="section-title">Revision History</p>
              <div className="mt-3 space-y-3">
                {detail.revisions.map((revision) => {
                  const author = getUserById(revision.createdBy);
                  const revisionData = parseJson<Record<string, unknown>>(revision.dataJson, {});
                  return (
                    <details key={revision.id} className="rounded-md border border-border bg-white p-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        Version {revision.versionNumber} · {revision.reason} · {author?.name ?? "Unknown"} · {formatDateTime(revision.createdAt)}
                      </summary>
                      <div className="mt-3">
                        <FormDisplay data={revisionData} hub={detail.hub} />
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <RequestActions
            requestId={request.id}
            status={request.status}
            currentStepId={currentStep?.id ?? null}
            canAct={currentStep ? canActOnStep(user, request, currentStep) : false}
            isRequester={isRequester}
            canWithdraw={canWithdraw(user, request)}
            canUpload={canUploadDocuments(user, request)}
            isWatcher={detail.watcherUserIds.includes(user.id)}
          />
        </div>
      </div>
    </div>
  );
}
