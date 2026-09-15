"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { actOnStep, getRequest, listDocuments, listSteps, respondToQuestion, submitRequest, uploadDocumentFile, withdrawRequest, type FreeDocument, type FreeRequest, type FreeStep } from "@/lib/data";
import { FORM_FIELDS, REQUIRED_DOCUMENT_TYPES } from "@/features/hod-approvals/forms/fields";
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
  const [comment, setComment] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function refresh() {
    if (!id) return;
    const [req, stepList, docList] = await Promise.all([getRequest(id), listSteps(id), listDocuments(id)]);
    setRequest(req);
    setSteps(stepList);
    setDocuments(docList);
  }

  React.useEffect(() => { refresh().catch(console.error); }, [id]);

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
  const activeStep = steps.find((s) => s.status === "ACTIVE");
  const canApprove = activeStep?.approverId === user.id && request.status === "PENDING_APPROVAL";
  const canAnswer = isRequester && request.status === "QUESTION_RAISED";
  const canEdit = isRequester && (request.status === "DRAFT" || request.status === "QUESTION_RAISED");
  const canUpload = (isRequester || isAdmin) && (request.status === "DRAFT" || request.status === "QUESTION_RAISED");

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
          {request.status === "DRAFT" && isRequester ? (
            <Button disabled={busy} onClick={() => run(() => submitRequest(user!, request!.id))}>Submit for approval</Button>
          ) : null}
          {request.status === "DRAFT" && isRequester ? (
            <Button variant="secondary" disabled={busy} onClick={() => { const reason = prompt("Reason for withdrawal:"); if (reason) run(() => withdrawRequest(user!, request!.id, reason)); }}>Withdraw</Button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Request Details</h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FORM_FIELDS.filter((f) => request.formData[f.key] !== undefined && String(request.formData[f.key]).trim() !== "").map((field) => (
              <div key={field.key}>
                <dt className="text-xs font-medium uppercase text-muted-foreground">{field.label}</dt>
                <dd className="mt-1 text-sm text-foreground">{String(request.formData[field.key])}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-4">
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
                {REQUIRED_DOCUMENT_TYPES.map((name) => (
                  <div key={name}>
                    <Label htmlFor={name}>{name}</Label>
                    <Input id={name} type="file" onChange={(e) => upload(e.target.files?.[0] ?? null, name)} disabled={busy} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

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
        </div>
      </div>
    </div>
  );
}

export default function RequestPage() {
  return <RequestContent />;
}
