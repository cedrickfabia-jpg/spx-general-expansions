import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { createDraft, WorkflowError } from "@/features/hod-approvals/workflow";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  try {
    const requestRow = createDraft(user.id, body);
    return NextResponse.json({ id: requestRow.id, status: requestRow.status }, { status: 201 });
  } catch (error) {
    if (error instanceof WorkflowError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && "issues" in error) {
      const zodError = error as { issues?: Array<{ message: string }> };
      return NextResponse.json({ error: zodError.issues?.[0]?.message ?? "Validation failed" }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("FOREIGN KEY")) {
      return NextResponse.json({ error: "The hub or watcher selected is not valid" }, { status: 400 });
    }
    logger.error("create draft failed", error);
    return NextResponse.json({ error: "Could not save draft" }, { status: 500 });
  }
}
