"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, MessageSquare, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ConfirmButton, Dialog } from "@/components/ui/dialog";
import { ALLOWED_DOCUMENT_TYPES } from "@/features/hod-approvals/forms/fields";

type ModalType = "approve" | "reject" | "question" | "withdraw" | "respond" | null;

export function RequestActions({
  requestId,
  status,
  currentStepId,
  canAct,
  isRequester,
  canWithdraw,
  canUpload,
  isWatcher
}: {
  requestId: string;
  status: string;
  currentStepId: string | null;
  canAct: boolean;
  isRequester: boolean;
  canWithdraw: boolean;
  canUpload: boolean;
  isWatcher: boolean;
}) {
  const router = useRouter();
  const [modal, setModal] = React.useState<ModalType>(null);
  const [comment, setComment] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [response, setResponse] = React.useState("");
  const [revision, setRevision] = React.useState({ businessJustification: "", requiredDate: "", targetCompletionDate: "", estimatedAmount: "" });
  const [revisionReason, setRevisionReason] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [documentType, setDocumentType] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  function reset() {
    setModal(null);
    setComment("");
    setReason("");
    setMessage("");
    setResponse("");
    setRevisionReason("");
    setError(null);
  }

  async function call(url: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Action failed");
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      setBusy(false);
    }
  }

  async function uploadDocument() {
    if (!documentType) {
      setError("Select a document type");
      return;
    }
    if (!file) {
      setError("Choose a file to upload");
      return;
    }
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("documentName", documentType);
    try {
      const response = await fetch(`/api/approvals/${requestId}/documents`, {
        method: "POST",
        body: form
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Upload failed");
      setFile(null);
      setDocumentType("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    if (note.trim().length < 2) {
      setError("Comment is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/approvals/${requestId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "addComment", message: note.trim() })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not add comment");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add comment");
      setBusy(false);
    }
  }

  async function stopWatching() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/approvals/${requestId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "removeWatcher" })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not stop watching");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not stop watching");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      {isWatcher ? (
        <div className="surface p-4">
          <p className="section-title">Watcher</p>
          <p className="mt-1 text-sm text-muted-foreground">You are watching this request.</p>
          <Button variant="outline" disabled={busy} onClick={() => void stopWatching()}>
            Stop Watching
          </Button>
        </div>
      ) : null}

      <div className="surface p-4">
        <p className="section-title">Add Comment</p>
        <p className="mt-1 text-sm text-muted-foreground">Add a free-form note without pausing the workflow.</p>
        <div className="mt-3 form-field">
          <Label htmlFor="note">Comment</Label>
          <Textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <Button variant="outline" disabled={busy || note.trim().length < 2} onClick={() => void addNote()}>
          Add Comment
        </Button>
      </div>

      {canAct && currentStepId ? (
        <div className="surface p-4">
          <p className="section-title">Approver Actions</p>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <Button variant="success" onClick={() => setModal("approve")}>
              <Check className="h-4 w-4" aria-hidden="true" /> Approve
            </Button>
            <Button variant="destructive" onClick={() => setModal("reject")}>
              <X className="h-4 w-4" aria-hidden="true" /> Reject
            </Button>
            <Button variant="outline" onClick={() => setModal("question")}>
              <MessageSquare className="h-4 w-4" aria-hidden="true" /> Ask Question
            </Button>
          </div>
        </div>
      ) : null}

      {isRequester && status === "QUESTION_RAISED" ? (
        <div className="surface p-4">
          <p className="section-title">Respond to Question</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Provide a response. You may also update substantive information; the system creates a new revision instead of overwriting the submitted version.
          </p>
          <div className="mt-3 space-y-3">
            <div className="form-field">
              <Label htmlFor="response">Response</Label>
              <Textarea id="response" value={response} onChange={(event) => setResponse(event.target.value)} />
            </div>
            <details className="rounded-md border border-border bg-white p-3">
              <summary className="cursor-pointer text-sm font-medium">Update request information (creates revision)</summary>
              <div className="mt-3 grid gap-3">
                <div className="form-field">
                  <Label htmlFor="rev-justification">Business Justification</Label>
                  <Textarea id="rev-justification" value={revision.businessJustification} onChange={(event) => setRevision({ ...revision, businessJustification: event.target.value })} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="form-field">
                    <Label htmlFor="rev-required">Required Date</Label>
                    <Input id="rev-required" type="date" value={revision.requiredDate} onChange={(event) => setRevision({ ...revision, requiredDate: event.target.value })} />
                  </div>
                  <div className="form-field">
                    <Label htmlFor="rev-target">Target Completion Date</Label>
                    <Input id="rev-target" type="date" value={revision.targetCompletionDate} onChange={(event) => setRevision({ ...revision, targetCompletionDate: event.target.value })} />
                  </div>
                </div>
                <div className="form-field">
                  <Label htmlFor="rev-amount">Estimated Amount</Label>
                  <Input id="rev-amount" type="number" min="0" value={revision.estimatedAmount} onChange={(event) => setRevision({ ...revision, estimatedAmount: event.target.value })} />
                </div>
                <div className="form-field">
                  <Label htmlFor="rev-reason">Revision Reason</Label>
                  <Input id="rev-reason" value={revisionReason} onChange={(event) => setRevisionReason(event.target.value)} placeholder="Why is this change needed?" />
                </div>
              </div>
            </details>
            <Button
              disabled={busy || response.trim().length < 2}
              onClick={() => {
                const revisionData: Record<string, unknown> = {};
                if (revision.businessJustification) revisionData.businessJustification = revision.businessJustification;
                if (revision.requiredDate) revisionData.requiredDate = revision.requiredDate;
                if (revision.targetCompletionDate) revisionData.targetCompletionDate = revision.targetCompletionDate;
                if (revision.estimatedAmount) revisionData.estimatedAmount = revision.estimatedAmount;
                void call(`/api/approvals/${requestId}`, {
                  action: "respondToQuestion",
                  response,
                  revision: Object.keys(revisionData).length > 0 ? { data: revisionData, reason: revisionReason } : undefined
                });
              }}
            >
              Submit Response
            </Button>
          </div>
        </div>
      ) : null}

      {canUpload ? (
        <div className="surface p-4">
          <p className="section-title">Upload Document</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Required before submission: FF Approval, CPO Table, Hub Location Scoring. Optional file 1, Optional file 2, and Optional file 3. PDF files only.
          </p>
          <div className="mt-3 space-y-3">
            <div className="form-field">
              <Label htmlFor="doc-type">Document Type <span className="text-destructive">*</span></Label>
              <Select id="doc-type" value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
                <option value="">Select document type</option>
                {ALLOWED_DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </div>
            <div className="form-field">
              <Label htmlFor="doc-file">File</Label>
              <Input id="doc-file" type="file" accept=".pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </div>
            <Button variant="secondary" disabled={busy || !documentType || !file} onClick={() => void uploadDocument()}>
              <Upload className="h-4 w-4" aria-hidden="true" /> Upload Document
            </Button>
          </div>
        </div>
      ) : null}

      {canWithdraw ? (
        <div className="surface p-4">
          <p className="section-title">Withdraw Request</p>
          <p className="mt-1 text-sm text-muted-foreground">Withdrawal stops the active workflow and notifies approvers.</p>
          <div className="mt-3">
            <ConfirmButton
              label="Withdraw Request"
              description="The workflow will stop and pending approval steps will be cancelled. This cannot be undone."
              confirmLabel="Withdraw"
              onConfirm={() => {
                const reason = window.prompt("Reason for withdrawal (required)");
                if (reason && reason.trim().length >= 5) {
                  return call(`/api/approvals/${requestId}`, { action: "withdraw", reason: reason.trim() });
                }
              }}
              variant="outline"
            />
          </div>
        </div>
      ) : null}

      <Dialog
        open={modal === "approve" || modal === "reject" || modal === "question" || modal === "withdraw"}
        onClose={reset}
        title={modal === "approve" ? "Approve step" : modal === "reject" ? "Reject request" : modal === "question" ? "Ask a question" : "Withdraw request"}
        footer={
          <>
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button
              variant={modal === "reject" ? "destructive" : "primary"}
              disabled={busy || (modal === "reject" && reason.trim().length < 5) || (modal === "question" && message.trim().length < 2)}
              onClick={() => {
                if (modal === "approve") void call(`/api/approvals/${requestId}/actions`, { action: "approve", stepId: currentStepId, comment });
                if (modal === "reject") void call(`/api/approvals/${requestId}/actions`, { action: "reject", stepId: currentStepId, reason });
                if (modal === "question") void call(`/api/approvals/${requestId}/actions`, { action: "askQuestion", stepId: currentStepId, message });
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        {modal === "approve" ? (
          <div className="form-field">
            <Label htmlFor="approve-comment">Comment (optional)</Label>
            <Textarea id="approve-comment" value={comment} onChange={(event) => setComment(event.target.value)} />
          </div>
        ) : null}
        {modal === "reject" ? (
          <div className="form-field">
            <Label htmlFor="reject-reason">Rejection reason <span className="text-destructive">*</span></Label>
            <Textarea id="reject-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
        ) : null}
        {modal === "question" ? (
          <div className="form-field">
            <Label htmlFor="question-message">Question <span className="text-destructive">*</span></Label>
            <Textarea id="question-message" value={message} onChange={(event) => setMessage(event.target.value)} />
          </div>
        ) : null}
        {modal === "withdraw" ? (
          <p className="text-sm text-muted-foreground">Confirm that you want to withdraw this request. A reason is required.</p>
        ) : null}
      </Dialog>
    </div>
  );
}
