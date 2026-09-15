import { CheckCircle2, Clock, MessageSquare, XCircle, Ban } from "lucide-react";
import { formatDateTime } from "@/lib/time";
import { getUserById } from "@/lib/auth";
import type { ApprovalStepRow } from "@/features/hod-approvals/types";
import type { RequestDetail } from "@/features/hod-approvals/repository";
import { cn } from "@/lib/utils";

interface TimelineItem {
  title: string;
  detail: string;
  timestamp: string | null;
  tone: "default" | "success" | "danger" | "warning" | "muted";
  icon: "clock" | "check" | "x" | "question" | "ban";
}

export function ApprovalTimeline({ detail }: { detail: RequestDetail }) {
  const { request } = detail;
  const items: TimelineItem[] = [];

  if (request.createdAt) {
    items.push({
      title: "Created",
      detail: `Draft created by ${detail.requester?.name ?? "Requester"}`,
      timestamp: request.createdAt,
      tone: "muted",
      icon: "clock"
    });
  }
  if (request.submittedAt) {
    items.push({
      title: "Submitted",
      detail: `Submitted by ${detail.requester?.name ?? "Requester"}`,
      timestamp: request.submittedAt,
      tone: "default",
      icon: "clock"
    });
  }

  for (const step of detail.steps) {
    const approver = getUserById(step.approverId);
    const label = `HOD Approver ${step.sequence}`;
    if (step.status === "APPROVED") {
      items.push({
        title: `${label} - Approved`,
        detail: approver ? `${approver.name} approved this step` : "Approved",
        timestamp: step.completedAt,
        tone: "success",
        icon: "check"
      });
    } else if (step.status === "REJECTED") {
      items.push({
        title: `${label} - Rejected`,
        detail: approver ? `${approver.name} rejected this step` : "Rejected",
        timestamp: step.completedAt,
        tone: "danger",
        icon: "x"
      });
    } else if (step.status === "CANCELLED") {
      items.push({
        title: `${label} - Cancelled`,
        detail: "This approval step was cancelled",
        timestamp: step.completedAt,
        tone: "muted",
        icon: "ban"
      });
    } else if (step.status === "ACTIVE") {
      items.push({
        title: `${label} - ${request.status === "QUESTION_RAISED" ? "Question Pending" : "Pending"}`,
        detail: approver ? `Waiting for ${approver.name}` : "Waiting for approver",
        timestamp: step.activatedAt,
        tone: "warning",
        icon: "clock"
      });
    } else {
      items.push({
        title: `${label} - Queued`,
        detail: approver ? `Assigned to ${approver.name}` : "Assigned",
        timestamp: null,
        tone: "muted",
        icon: "clock"
      });
    }
  }

  for (const comment of detail.comments) {
    const author = getUserById(comment.authorId);
    items.push({
      title: comment.type === "QUESTION" ? "Question raised" : comment.type === "RESPONSE" ? "Requester responded" : "Note",
      detail: `${author?.name ?? "User"}: ${comment.message}`,
      timestamp: comment.createdAt,
      tone: comment.type === "QUESTION" ? "warning" : "default",
      icon: "question"
    });
  }

  if (request.status === "REJECTED") {
    items.push({
      title: "Request closed",
      detail: request.rejectionReason ?? "Request was rejected",
      timestamp: request.completedAt,
      tone: "danger",
      icon: "x"
    });
  }
  if (request.status === "CANCELLED") {
    items.push({
      title: "Request cancelled",
      detail: request.cancellationReason ?? "Request was cancelled",
      timestamp: request.completedAt,
      tone: "muted",
      icon: "ban"
    });
  }
  if (request.status === "APPROVED") {
    items.push({
      title: "Final Approval",
      detail: "HOD approval fully granted",
      timestamp: request.completedAt,
      tone: "success",
      icon: "check"
    });
  }

  const icons = {
    clock: Clock,
    check: CheckCircle2,
    x: XCircle,
    question: MessageSquare,
    ban: Ban
  };

  return (
    <ol className="relative space-y-5 border-l border-border pl-5">
      {items.map((item, index) => {
        const Icon = icons[item.icon];
        const toneClass = {
          default: "text-foreground",
          success: "text-success",
          danger: "text-destructive",
          warning: "text-accent-foreground",
          muted: "text-muted-foreground"
        }[item.tone];
        return (
          <li key={index} className="relative">
            <span className={cn("absolute -left-[29px] top-0 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-white", toneClass)}>
              <Icon className="h-3 w-3" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{item.title}</p>
                {item.timestamp ? <span className="text-xs text-muted-foreground">{formatDateTime(item.timestamp)}</span> : null}
              </div>
              <p className="text-sm text-muted-foreground">{item.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
