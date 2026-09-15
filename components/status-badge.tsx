import { Badge } from "@/components/ui/badge";
import type { RequestStatus } from "@/features/hod-approvals/types";

const labels: Record<RequestStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  QUESTION_RAISED: "Question Raised",
  REJECTED: "Rejected",
  APPROVED: "Approved",
  CANCELLED: "Cancelled"
};

const variants: Record<RequestStatus, "muted" | "warning" | "info" | "danger" | "success"> = {
  DRAFT: "muted",
  PENDING_APPROVAL: "warning",
  QUESTION_RAISED: "info",
  REJECTED: "danger",
  APPROVED: "success",
  CANCELLED: "muted"
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
