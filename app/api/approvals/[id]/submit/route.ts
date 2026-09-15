import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { submitRequest, WorkflowError } from "@/features/hod-approvals/workflow";
import { logger } from "@/lib/logger";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    const requestRow = submitRequest(user.id, id);
    return NextResponse.json({
      id: requestRow.id,
      requestNumber: requestRow.requestNumber,
      status: requestRow.status
    });
  } catch (error) {
    if (error instanceof WorkflowError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(`submit failed for ${id}`, error);
    return NextResponse.json({ error: "Request could not be submitted" }, { status: 500 });
  }
}
