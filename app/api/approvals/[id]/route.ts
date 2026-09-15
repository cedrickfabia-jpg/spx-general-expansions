import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import {
  addComment,
  cancelDraft,
  removeSelfFromWatchers,
  respondToQuestion,
  updateDraft,
  withdrawRequest,
  WorkflowError
} from "@/features/hod-approvals/workflow";
import { logger } from "@/lib/logger";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  try {
    switch (body.action) {
      case "updateDraft":
        return NextResponse.json(updateDraft(user.id, id, body.data));
      case "cancelDraft":
        return NextResponse.json(cancelDraft(user.id, id, body.reason ?? ""));
      case "withdraw":
        return NextResponse.json(withdrawRequest(user.id, id, body.reason ?? ""));
      case "respondToQuestion":
        return NextResponse.json(
          respondToQuestion(user.id, id, body.response ?? "", body.revision ?? undefined)
        );
      case "addComment":
        return NextResponse.json(addComment(user.id, id, body.message ?? ""));
      case "removeWatcher":
        return NextResponse.json(removeSelfFromWatchers(user.id, id));
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
    logger.error(`approval patch failed for ${id}`, error);
    return NextResponse.json({ error: "Request could not be updated" }, { status: 500 });
  }
}
