"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getRequest, listDocuments, listRevisions, listSteps, type FreeDocument, type FreeRequest, type FreeRevision, type FreeStep } from "@/lib/data";
import { ALLOWED_DOCUMENT_TYPES, DOCUMENT_UPLOAD_INSTRUCTION, DOCUMENT_UPLOAD_LINKS, REQUIRED_DOCUMENT_TYPES } from "@/features/hod-approvals/forms/fields";
import { FormDisplay } from "@/components/form-display";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime } from "@/lib/time";
import { LoadingState } from "@/components/loading-state";

function ReviewContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const [request, setRequest] = React.useState<FreeRequest | null>(null);
  const [steps, setSteps] = React.useState<FreeStep[]>([]);
  const [documents, setDocuments] = React.useState<FreeDocument[]>([]);
  const [revisions, setRevisions] = React.useState<FreeRevision[]>([]);

  React.useEffect(() => {
    if (!id) return;
    Promise.all([getRequest(id), listSteps(id), listDocuments(id), listRevisions(id)]).then(([req, stepList, docList, revisionList]) => {
      setRequest(req);
      setSteps(stepList);
      setDocuments(docList);
      setRevisions(revisionList);
    }).catch(console.error);
  }, [id]);

  if (!request || !user) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Review Request" description="Read-only summary for review." />
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{request.title}</h1>
        <StatusBadge status={request.status} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Request Details</h2>
          <div className="mt-4"><FormDisplay data={request.formData} /></div>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold">Approval Steps</h2>
            <ul className="mt-3 space-y-2">
              {steps.map((step) => <li key={step.id} className="text-sm">{step.sequence}. {step.approverName} · {step.status.replace(/_/g, " ")}</li>)}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold">Documents</h2>
            <p className="mt-2 text-xs text-muted-foreground">{DOCUMENT_UPLOAD_INSTRUCTION}</p>
            <div className="mt-3 space-y-2">
              {ALLOWED_DOCUMENT_TYPES.map((type) => {
                const isRequired = (REQUIRED_DOCUMENT_TYPES as readonly string[]).includes(type);
                const url = String(request.formData[`uploadUrl_${type}`] ?? "").trim();
                return (
                  <div key={type} className="text-sm">
                    <span className="font-medium">{type}{isRequired ? <span className="text-red-600"> *</span> : null}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={DOCUMENT_UPLOAD_LINKS[type]} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Open folder</a>
                      <span className="text-xs text-muted-foreground">{url ? `URL ID: ${url}` : "No URL ID provided"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {documents.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm">
                {documents.map((document) => <li key={document.id}>{document.documentName} v{document.versionNumber}</li>)}
              </ul>
            ) : null}
          </div>
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold">Revisions</h2>
            <ul className="mt-3 space-y-2">
              {revisions.map((revision) => <li key={revision.id} className="text-sm">v{revision.versionNumber} · {revision.reason} · {formatDateTime(revision.createdAt)}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return <ReviewContent />;
}
