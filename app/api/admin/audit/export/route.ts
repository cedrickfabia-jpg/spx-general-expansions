import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-session";
import { listAuditLogs } from "@/features/hod-approvals/repository";

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
  return text;
}

export async function GET(request: NextRequest) {
  await requireAdmin();
  const filters = {
    search: request.nextUrl.searchParams.get("search") ?? undefined,
    action: request.nextUrl.searchParams.get("action") ?? undefined,
    from: request.nextUrl.searchParams.get("from") ?? undefined,
    to: request.nextUrl.searchParams.get("to") ?? undefined
  };
  const result = listAuditLogs(1, 10000, filters);
  const headers = ["Time", "Actor", "Action", "Entity Type", "Entity ID", "Metadata"];
  const lines = [
    headers,
    ...result.items.map((entry) => [
      entry.createdAt,
      entry.actorEmail ?? entry.actorName ?? "System",
      entry.action,
      entry.entityType ?? "",
      entry.entityId ?? "",
      entry.metadata ? JSON.stringify(entry.metadata) : ""
    ])
  ].map((line) => line.map(csvCell).join(","));
  const csv = "\uFEFF" + lines.join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="hod-approval-audit-log.csv"'
    }
  });
}
