import type { RequestStatus } from "@/features/hod-approvals/types";

export interface RequestListItem {
  request: {
    id: string;
    requestNumber: string | null;
    title: string;
    status: RequestStatus;
    submittedAt: string | null;
    updatedAt: string;
  };
  hubName: string;
  requesterName: string;
  approver1ApprovedAt?: string | null;
  approver2ApprovedAt?: string | null;
  approver1Name?: string | null;
  approver2Name?: string | null;
  rejectedAt?: string | null;
  rejectedByName?: string | null;
}
