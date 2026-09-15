import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { getRequestById, getRequestDetail } from "@/features/hod-approvals/repository";
import { canViewRequest } from "@/features/hod-approvals/permissions";
import { getStorageProvider } from "@/lib/storage";
import { queryOne } from "@/lib/db";
import { logger } from "@/lib/logger";

type RouteContext = { params: Promise<{ id: string; versionId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, versionId } = await context.params;
  const version = queryOne<{
    id: string;
    document_id: string;
    storage_key: string;
    original_filename: string;
    mime_type: string;
  }>(
    `SELECT id, document_id, storage_key, original_filename, mime_type FROM document_versions WHERE id = ?`,
    [versionId]
  );
  if (!version) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  const document = queryOne<{ approval_request_id: string }>(
    `SELECT approval_request_id FROM documents WHERE id = ?`,
    [version.document_id]
  );
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  const request = getRequestById(document.approval_request_id);
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  const detail = getRequestDetail(request.id);
  if (!detail) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (!canViewRequest(user, request, detail.watcherUserIds, detail.steps.map((step) => step.approverId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const data = await getStorageProvider().get(version.storage_key);
    if (!data) return NextResponse.json({ error: "File is missing from storage" }, { status: 404 });
    const safeName = version.original_filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "content-type": version.mime_type,
        "content-disposition": `attachment; filename="${safeName}"`,
        "content-length": String(data.byteLength),
        "cache-control": "private, no-store"
      }
    });
  } catch (error) {
    logger.error(`document download failed for ${versionId}`, error);
    return NextResponse.json({ error: "Document could not be downloaded" }, { status: 500 });
  }
}
