import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Edit3 } from "lucide-react";
import { requireUser } from "@/lib/auth-session";
import {
  getRequestById,
  getRequestDetail
} from "@/features/hod-approvals/repository";
import { getUserById } from "@/lib/auth";
import { parseJson } from "@/lib/utils";
import { previewApprovalRoute, WorkflowError } from "@/features/hod-approvals/workflow";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { FormDisplay } from "@/components/form-display";
import { RoutePreview } from "@/components/route-preview";
import { SubmitButton } from "@/components/submit-button";
import { formFromRow } from "@/features/hod-approvals/forms/fields";

type PageProps = { params: Promise<{ id: string }> };

export default async function ReviewRequestPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const request = getRequestById(id);
  if (!request) notFound();
  if (request.requesterId !== user.id) notFound();
  if (request.status !== "DRAFT") notFound();

  const detail = getRequestDetail(id);
  const data = parseJson<Record<string, unknown>>(request.dataJson, {});
  const form = formFromRow(data);
  let route;
  try {
    route = previewApprovalRoute(request.hubId, request.cpoBudgetStatus);
  } catch (error) {
    if (error instanceof WorkflowError) {
      route = null;
    } else {
      throw error;
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Before Submission"
        description="Check every section, the approval route, and the assigned HOD approvers before submitting."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/approvals/${id}/edit`}>
              <Button variant="outline">
                <Edit3 className="h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
            </Link>
            <Link href={`/approvals/my-requests`}>
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
            </Link>
          </div>
        }
      />

      <FormDisplay
        data={data}
        hub={detail?.hub ?? null}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="surface p-5">
          <p className="section-title">Approval Route</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {request.cpoBudgetStatus === "ABOVE_CPO_BUDGET"
              ? "Two HOD approvers are required. The second approver is activated only after the first approves."
              : "One HOD approver is required for this request."}
          </p>
          {route ? (
            <div className="mt-4 max-w-md">
              <RoutePreview
                count={route.count}
                approvers={route.steps.map((step) => {
                  const base = getUserById(step.baseUserId);
                  const assigned = getUserById(step.assignedUserId);
                  return {
                    slot: step.slot,
                    name: assigned?.name ?? base?.name ?? "Configured approver",
                    email: assigned?.email ?? base?.email ?? ""
                  };
                })}
              />
            </div>
          ) : (
            <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Approval routing is not configured for this hub yet. Ask an administrator to configure the HOD approvers.
            </p>
          )}
        </div>

        <div className="surface p-5 lg:sticky lg:top-28 lg:self-start">
          <p className="section-title">Submit</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Submitting locks the request, assigns the configured approvers, and notifies HOD Approver 1.
          </p>
          <div className="mt-4">
            <SubmitButton requestId={id} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            The requester must explicitly submit. Drafts never trigger approvals or notifications.
          </p>
        </div>
      </div>
    </div>
  );
}
