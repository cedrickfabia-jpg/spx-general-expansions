"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { createDraft, listHubs, submitRequest, uploadDocumentFile } from "@/lib/data";
import type { Hub } from "@/features/hod-approvals/types";
import { RequestForm } from "@/components/request-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewRequestPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [hubs, setHubs] = React.useState<Hub[]>([]);

  React.useEffect(() => { listHubs().then(setHubs).catch(console.error); }, []);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="New HOD Approval" description="Complete the request details, then attach the required documents before submitting." />
      <div className="rounded-lg border border-border bg-white p-6">
        <RequestForm
          hubs={hubs}
          onSubmit={async (formData, hub) => {
            const id = await createDraft(user, formData, hub);
            router.push(`/request?id=${id}`);
          }}
          onSaveAndReview={async (formData, hub) => {
            const id = await createDraft(user, formData, hub);
            router.push(`/request?id=${id}`);
          }}
          onSaveAndSubmit={async (formData, hub, files) => {
            const id = await createDraft(user, formData, hub);
            for (const type of Object.keys(files)) {
              const file = files[type];
              if (file) await uploadDocumentFile(user, id, file, type);
            }
            await submitRequest(user, id);
            return id;
          }}
          submitLabel="Save Draft"
        />
      </div>
    </div>
  );
}
