import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { uploadDocumentVersion, WorkflowError } from "@/features/hod-approvals/workflow";
import { getStorageProvider } from "@/lib/storage";
import { logger } from "@/lib/logger";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }
  const documentNameValue = form?.get("documentName");
  const documentName = typeof documentNameValue === "string" ? documentNameValue : undefined;
  const data = Buffer.from(await file.arrayBuffer());
  try {
    const result = await uploadDocumentVersion(user.id, id, {
      documentName,
      originalFilename: file.name,
      mimeType: file.type,
      size: file.size,
      data
    }, getStorageProvider());
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof WorkflowError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(`document upload failed for ${id}`, error);
    return NextResponse.json({ error: "Document could not be uploaded" }, { status: 500 });
  }
}
