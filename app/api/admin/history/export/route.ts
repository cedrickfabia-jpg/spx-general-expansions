import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-session";
import { exportApprovalHistory } from "@/features/hod-approvals/repository";

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
  return text;
}

export async function GET(request: NextRequest) {
  await requireAdmin();
  const fromValue = request.nextUrl.searchParams.get("from") ?? "";
  const toValue = request.nextUrl.searchParams.get("to") ?? "";
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const from = datePattern.test(fromValue) ? fromValue : undefined;
  const to = datePattern.test(toValue) ? toValue : undefined;
  const idsValue = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsValue.split(",").map((value) => value.trim()).filter(Boolean);
  const rows = exportApprovalHistory({ from, to, ids: ids.length > 0 ? ids : undefined });
  const headers = [
    "Request Number",
    "Title",
    "Status",
    "CPO Budget Status",
    "Hub",
    "Requester",
    "Requester Email",
    "Submitted At",
    "Completed At",
    "Rejection Reason",
    "HOD Approver 1",
    "HOD Approver 1 Email",
    "HOD Approver 1 Approved At",
    "HOD Approver 2",
    "HOD Approver 2 Email",
    "HOD Approver 2 Approved At",
    "Rejected By",
    "Rejected At"
  ];
  const lines = [
    headers,
    ...rows.map((row) => [
      row.requestNumber,
      row.title,
      row.status,
      row.cpoBudgetStatus,
      row.hubName,
      row.requesterName,
      row.requesterEmail,
      row.submittedAt,
      row.completedAt,
      row.rejectionReason,
      row.approver1Name,
      row.approver1Email,
      row.approver1ApprovedAt,
      row.approver2Name,
      row.approver2Email,
      row.approver2ApprovedAt,
      row.rejectedByName,
      row.rejectedAt
    ])
  ].map((line) => line.map(csvCell).join(","));
  const csv = "\uFEFF" + lines.join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="hod-approval-history.csv"'
    }
  });
}
