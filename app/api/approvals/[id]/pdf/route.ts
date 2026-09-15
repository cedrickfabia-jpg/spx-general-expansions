import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { getRequestDetail } from "@/features/hod-approvals/repository";
import { canViewRequest } from "@/features/hod-approvals/permissions";
import { buildHodApprovalPdf } from "@/lib/hod-approval-pdf";
import { logger } from "@/lib/logger";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const detail = getRequestDetail(id);
  if (!detail) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (detail.request.status !== "APPROVED") {
    return NextResponse.json({ error: "The HOD Approval PDF is available after the request is approved" }, { status: 400 });
  }
  const stepApproverIds = detail.steps.map((step) => [step.approverId, step.originalApproverId]).flat();
  if (!canViewRequest(user, detail.request, detail.watcherUserIds, stepApproverIds)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const bytes = await buildHodApprovalPdf(id);
    const filename = `HOD-Approval-${detail.request.requestNumber ?? id}.pdf`;
    return new NextResponse(bytes as unknown as BodyInit, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    logger.error(`pdf generation failed for ${id}`, error);
    return NextResponse.json({ error: "Could not generate the PDF" }, { status: 500 });
  }
}
