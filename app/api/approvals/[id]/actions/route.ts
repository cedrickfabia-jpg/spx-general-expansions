import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { approveStep, askQuestion, rejectStep, WorkflowError } from "@/features/hod-approvals/workflow";
import { logger } from "@/lib/logger";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== "string" || typeof body.stepId !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  try {
    switch (body.action) {
      case "approve":
        return NextResponse.json(approveStep(user.id, body.stepId, body.comment ?? ""));
      case "reject":
        return NextResponse.json(rejectStep(user.id, body.stepId, body.reason ?? ""));
      case "askQuestion":
        return NextResponse.json(askQuestion(user.id, body.stepId, body.message ?? ""));
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof WorkflowError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && "issues" in error) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    logger.error("approval action failed", error);
    return NextResponse.json({ error: "Action could not be completed" }, { status: 500 });
  }
}
