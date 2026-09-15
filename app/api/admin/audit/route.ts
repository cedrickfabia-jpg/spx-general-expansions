import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-session";
import { listAuditLogs } from "@/features/hod-approvals/repository";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
  return NextResponse.json(listAuditLogs(page, 50, {
    search: request.nextUrl.searchParams.get("search") ?? undefined,
    action: request.nextUrl.searchParams.get("action") ?? undefined,
    from: request.nextUrl.searchParams.get("from") ?? undefined,
    to: request.nextUrl.searchParams.get("to") ?? undefined
  }));
}
