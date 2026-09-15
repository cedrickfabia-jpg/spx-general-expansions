import { requireUser } from "@/lib/auth-session";
import { PageHeader } from "@/components/ui/page-header";
import { RequestForm } from "@/components/request-form";

export default async function NewRequestPage() {
  await requireUser();
  return (
    <div className="space-y-6">
      <PageHeader
        title="New HOD Approval"
        description="Complete the request form. You can save it as a draft and continue later."
      />
      <RequestForm />
    </div>
  );
}
