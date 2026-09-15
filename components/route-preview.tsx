import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RoutePreviewApprover {
  slot: number;
  name: string;
  email: string;
}

export function RoutePreview({
  count,
  approvers,
  compact = false
}: {
  count: number;
  approvers: RoutePreviewApprover[];
  compact?: boolean;
}) {
  const nodes = [
    { label: "Requester", sub: "Submits the request" },
    ...approvers.map((approver) => ({
      label: `HOD Approver ${approver.slot}`,
      sub: approver.name,
      email: approver.email
    })),
    { label: "Final Approval", sub: "Request becomes approved" }
  ];

  return (
    <div className={cn("flex flex-col", compact ? "gap-1" : "gap-2")}>
      {nodes.map((node, index) => (
        <div key={`${node.label}-${index}`}>
          <div
            className={cn(
              "rounded-md border border-border bg-white px-3 py-2",
              node.label.startsWith("HOD") ? "border-primary/30 bg-primary/5" : "bg-muted/50",
              node.label === "Final Approval" && "border-success/30 bg-success/5"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{node.label}</p>
                <p className="truncate text-xs text-muted-foreground">{node.sub}</p>
                {"email" in node && node.email ? (
                  <p className="truncate text-[11px] text-muted-foreground">{node.email}</p>
                ) : null}
              </div>
            </div>
          </div>
          {index < nodes.length - 1 ? (
            <div className="flex justify-center py-0.5">
              <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </div>
          ) : null}
        </div>
      ))}
      {count === 2 ? (
        <p className="mt-1 text-xs text-muted-foreground">HOD Approver 2 is activated only after HOD Approver 1 approves.</p>
      ) : null}
    </div>
  );
}
