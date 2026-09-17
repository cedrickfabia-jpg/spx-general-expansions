"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { actOnStep, addComment, getRequest, listActions, listComments, listDocuments, listRevisions, listSteps, respondToQuestion, submitRequest, subscribeActions, subscribeComments, subscribeDocuments, subscribeRevisions, subscribeRequest, subscribeSteps, uploadDocumentFile, withdrawRequest, type FreeAction, type FreeComment, type FreeDocument, type FreeRequest, type FreeRevision, type FreeStep } from "@/lib/data";
import { OPTIONAL_DOCUMENT_TYPES, REQUIRED_DOCUMENT_TYPES } from "@/features/hod-approvals/forms/fields";
import { FormDisplay } from "@/components/form-display";
import { buildHodApprovalPdf } from "@/lib/client-pdf";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatDateTime } from "@/lib/time";

function RequestContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const [request, setRequest] = React.useState<FreeRequest | null>(null);
  const [steps, setSteps] = React.useState<FreeStep[]>([]);
  const [documents, setDocuments] = React.useState<FreeDocument[]>([]);
  const [comments, setComments] = React.useState<FreeComment[]>([]);
  const [revisions, setRevisions] = React.useState<FreeRevision[]>([]);
  const [actions, setActions] = React.useState<FreeAction[]>([]);
  const [newComment, setNewComment] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function refresh() {
    if (!id) return;
    const [req, stepList, docList, commentList, revisionList, actionList] = await Promise.all([getRequest(id), listSteps(id), listDocuments(id), listComments(id), listRevisions(id), listActions(id)]);
    setRequest(req);
    setSteps(stepList);
    setDocuments(docList);
    setComments(commentList);
    setRevisions(revisionList);
    setActions(actionList);
  }

  React.useEffect(() => {
    if (!id) return;
    const unsubscribers = [
      subscribeRequest(id, setRequest),
      subscribeSteps(id, setSteps),
      subscribeDocuments(id, setDocuments),
      subscribeComments(id, setComments),
      subscribeRevisions(id, setRevisions),
      subscribeActions(id, setActions)
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [id]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (!request || !user) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const isRequester = request.requesterId === user.id;
  const isAdmin = user.roles.includes("ADMINISTRATOR");
  const canManage = isRequester || isAdmin;
  const activeStep = steps.find((s) => s.status === "ACTIVE");
  const questionStep = steps.find((s) => s.status === "QUESTION_RAISED");
  const canApprove = activeStep?.approverId === user.id && request.status === "PENDING_APPROVAL";
  const canAnswer = isRequester && request.status === "QUESTION_RAISED";
  const canEdit = canManage && (request.status === "DRAFT" || request.status === "QUESTION_RAISED");
  const canUpload = canManage && (request.status === "DRAFT" || request.status === "QUESTION_RAISED");

  async function upload(file: File | null, documentName: string) {
    if (!file) return;
    await run(() => uploadDocumentFile(user!, request!.id, file, documentName));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{request.title}</h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{request.requestNumber || "Draft"} · {request.hubName} · Submitted {request.submittedAt ? formatDateTime(request.submittedAt) : "not yet"}</p>
        </div>
        <div className="flex gap-2">
          {canEdit ? <Link href={`/request/edit?id=${request.id}`}><Button variant="secondary">Edit</Button></Link> : null}
          <Link href={`/request/review?id=${request.id}`}><Button variant="secondary">Review</Button></Link>
          {request.status === "APPROVED" ? (
            <Button onClick={async () => {
              const bytes = await buildHodApprovalPdf(request!, steps, documents);
              const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `HOD-Approval-${request.requestNumber || request.id}.pdf`;
              link.click();
              URL.revokeObjectURL(url);
            }}>Download PDF</Button>
          ) : null}
          {request.status === "DRAFT" && canManage ? (
            <Button disabled={busy} onClick={() => run(() => submitRequest(user!, request!.id))}>Submit for approval</Button>
          ) : null}
          {request.status === "DRAFT" && canManage ? (
            <Button variant="secondary" disabled={busy} onClick={() => { const reason = prompt("Reason for withdrawal:"); if (reason) run(() => withdrawRequest(user!, request!.id, reason)); }}>Withdraw</Button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Request Details</h2>
          <div className="mt-4"><FormDisplay data={request.formData} /></div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold">Approval Status</h2>
            <div className="mt-3">
              <StatusBadge status={request.status} />
            </div>
            <p className="mt-3 text-sm text-foreground">
              {request.status === "DRAFT" ? "Not submitted yet. Complete the required documents and submit for approval." : null}
              {request.status === "PENDING_APPROVAL" && activeStep ? `Currently with HOD Approver ${activeStep.sequence} (${activeStep.approverName}).` : null}
              {request.status === "QUESTION_RAISED" ? `Question raised by HOD Approver ${questionStep?.sequence ?? "1"} (${questionStep?.approverName ?? ""}). Waiting for the requester to respond.` : null}
              {request.status === "APPROVED" ? "Fully approved." : null}
              {request.status === "REJECTED" ? "Rejected." : null}
              {request.status === "CANCELLED" ? "Cancelled." : null}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Step {steps.filter((s) => s.status === "APPROVED").length} of {steps.length || 1} completed.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold">Approval Steps</h2>
            <ol className="mt-3 space-y-3">
              {steps.map((step) => (
                <li key={step.id} className="border-l-2 border-border pl-3">
                  <p className="text-sm font-medium">{step.sequence === 1 ? "HOD Approver 1" : "HOD Approver 2"} · {step.approverName}</p>
                  <p className="text-xs text-muted-foreground">{step.status.replace(/_/g, " ")} {step.completedAt ? `· ${formatDateTime(step.completedAt)}` : ""}</p>
                  {step.comment ? <p className="mt-1 text-xs text-muted-foreground">{step.comment}</p> : null}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold">Documents</h2>
            <ul className="mt-3 space-y-2">
              {documents.map((document) => (
                <li key={document.id} className="text-sm">
                  <a href={document.downloadUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">{document.documentName} v{document.versionNumber}</a>
                  <span className="ml-2 text-xs text-muted-foreground">{document.originalFilename}</span>
                </li>
              ))}
            </ul>
            {canUpload ? (
              <div className="mt-4 space-y-3">
                {[...REQUIRED_DOCUMENT_TYPES, ...OPTIONAL_DOCUMENT_TYPES].map((name) => (
                  <div key={name}>
                    <Label htmlFor={name}>{name}{(REQUIRED_DOCUMENT_TYPES as readonly string[]).includes(name) ? <span className="text-red-600"> *</span> : null}</Label>
                    <Input id={name} type="file" onChange={(e) => upload(e.target.files?.[0] ?? null, name)} disabled={busy} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {revisions.length > 0 ? (
            <div className="rounded-lg border border-border bg-white p-5">
              <h2 className="text-sm font-semibold">Revisions</h2>
              <ul className="mt-3 space-y-3">
                {revisions.map((revision) => (
                  <li key={revision.id} className="border-l-2 border-border pl-3">
                    <p className="text-sm font-medium">Version {revision.versionNumber} · {revision.createdByName}</p>
                    <p className="text-xs text-muted-foreground">{revision.reason} · {formatDateTime(revision.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {actions.length > 0 ? (
            <div className="rounded-lg border border-border bg-white p-5">
              <h2 className="text-sm font-semibold">Timeline</h2>
              <ol className="mt-3 space-y-3">
                {actions.map((action) => (
                  <li key={action.id} className="border-l-2 border-border pl-3">
                    <p className="text-sm font-medium">{action.action.replace(/_/g, " ")} · {action.actorName}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(action.createdAt)}{action.comment ? ` · ${action.comment}` : ""}</p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {canApprove ? (
            <div className="rounded-lg border border-border bg-white p-5">
              <h2 className="text-sm font-semibold">Approver Action</h2>
              <Label htmlFor="comment">Comment</Label>
              <Input id="comment" value={comment} onChange={(e) => setComment(e.target.value)} />
              <div className="mt-3 flex gap-2">
                <Button disabled={busy} onClick={() => run(() => actOnStep(user!, activeStep!.id, "approve", comment))}>Approve</Button>
                <Button variant="secondary" disabled={busy} onClick={() => run(() => actOnStep(user!, activeStep!.id, "reject", comment))}>Reject</Button>
                <Button variant="secondary" disabled={busy} onClick={() => run(() => actOnStep(user!, activeStep!.id, "question", comment))}>Ask Question</Button>
              </div>
            </div>
          ) : null}

          {canAnswer ? (
            <div className="rounded-lg border border-border bg-white p-5">
              <h2 className="text-sm font-semibold">Respond to Question</h2>
              <Label htmlFor="answer">Answer</Label>
              <Input id="answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
              <Button className="mt-3" disabled={busy || !answer} onClick={() => run(() => respondToQuestion(user!, request!.id, answer))}>Send response</Button>
            </div>
          ) : null}

          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold">Comments</h2>
            <ul className="mt-3 space-y-2">
              {comments.map((comment) => (
                <li key={comment.id} className="rounded-md bg-muted p-3 text-sm">
                  <p className="font-medium">{comment.authorName}</p>
                  <p className="mt-1 text-muted-foreground">{comment.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(comment.createdAt)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment" />
              <Button disabled={busy || !newComment} onClick={() => run(async () => { await addComment(user!, request!.id, newComment); setNewComment(""); })}>Add</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RequestPage() {
  return <RequestContent />;
}
