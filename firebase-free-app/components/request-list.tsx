import type { FreeRequest } from "@/lib/data";
import type { RequestListItem } from "@/features/hod-approvals/repository";
import { RequestTable } from "@/components/request-table";

function toListItem(request: FreeRequest): RequestListItem {
  return {
    request: {
      id: request.id,
      requestNumber: request.requestNumber || null,
      title: request.title,
      status: request.status,
      submittedAt: request.submittedAt,
      updatedAt: request.submittedAt ?? request.createdAt
    },
    hubName: request.hubName,
    requesterName: request.requesterName
  };
}

export function RequestList({ requests, showRequester = true }: { requests: FreeRequest[]; showRequester?: boolean }) {
  return <RequestTable items={requests.map(toListItem)} showRequester={showRequester} />;
}
