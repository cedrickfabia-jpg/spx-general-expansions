import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/time";
import type { RequestListItem } from "@/features/hod-approvals/repository";
import type { RequestStatus } from "@/features/hod-approvals/types";

export function RequestTable({
  items,
  showRequester = true,
  showApprovalDates = false
}: {
  items: RequestListItem[];
  showRequester?: boolean;
  showApprovalDates?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Hub</TableHead>
            {showRequester ? <TableHead>Requester</TableHead> : null}
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Updated</TableHead>
            {showApprovalDates ? (
              <>
                <TableHead>Approved HOD 1</TableHead>
                <TableHead>Approved HOD 2</TableHead>
                <TableHead>Rejected</TableHead>
              </>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.request.id}>
              <TableCell className="font-mono text-xs">
                <Link href={`/request?id=${item.request.id}`} className="font-medium text-primary hover:underline">
                  {item.request.requestNumber ?? "Draft"}
                </Link>
              </TableCell>
              <TableCell className="max-w-[260px]">
                <Link href={`/request?id=${item.request.id}`} className="block truncate font-medium hover:underline">
                  {item.request.title}
                </Link>
              </TableCell>
              <TableCell>{item.hubName}</TableCell>
              {showRequester ? <TableCell className="max-w-[180px] truncate">{item.requesterName}</TableCell> : null}
              <TableCell>
                <StatusBadge status={item.request.status as RequestStatus} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {item.request.submittedAt ? formatDateTime(item.request.submittedAt) : "Not submitted"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {formatDateTime(item.request.updatedAt)}
              </TableCell>
              {showApprovalDates ? (
                <>
                  <TableCell className="whitespace-nowrap text-xs">
                    {item.approver1ApprovedAt ? (
                      <span title={`${item.approver1Name ?? "HOD Approver 1"} approved`}>
                        {formatDateTime(item.approver1ApprovedAt)}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {item.approver2ApprovedAt ? (
                      <span title={`${item.approver2Name ?? "HOD Approver 2"} approved`}>
                        {formatDateTime(item.approver2ApprovedAt)}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {item.rejectedAt ? (
                      <span title={`${item.rejectedByName ?? "Approver"} rejected`}>
                        {formatDateTime(item.rejectedAt)}
                      </span>
                    ) : "-"}
                  </TableCell>
                </>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
