import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-session";
import { getRequestById, listDocumentsForRequest } from "@/features/hod-approvals/repository";
import { parseJson } from "@/lib/utils";
import { formFromRow } from "@/features/hod-approvals/forms/fields";
import { PageHeader } from "@/components/ui/page-header";
import { RequestForm } from "@/components/request-form";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditRequestPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const request = getRequestById(id);
  if (!request) notFound();
  if (request.requesterId !== user.id) notFound();
  if (request.status !== "DRAFT") notFound();
  const data = parseJson<Record<string, unknown>>(request.dataJson, {});
  const initial = formFromRow(data);
  const uploadedDocuments = listDocumentsForRequest(request.id).map((document) => document.documentName);
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Draft ${request.requestNumber ?? request.id}`}
        description="Keep working on this draft or move to review before submitting."
        actions={<span className="text-sm text-muted-foreground">Draft</span>}
      />
      <RequestForm initial={initial} requestId={request.id} initialDocuments={uploadedDocuments} />
    </div>
  );
}
