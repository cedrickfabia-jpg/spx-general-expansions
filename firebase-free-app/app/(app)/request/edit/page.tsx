"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getRequest, listHubs, updateDraft } from "@/lib/data";
import type { Hub } from "@/features/hod-approvals/types";
import { RequestForm } from "@/components/request-form";
import { PageHeader } from "@/components/ui/page-header";

function EditContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const [hubs, setHubs] = React.useState<Hub[]>([]);
  const [request, setRequest] = React.useState<Awaited<ReturnType<typeof getRequest>>>(null);

  React.useEffect(() => {
    Promise.all([listHubs(), getRequest(id)]).then(([hubList, req]) => { setHubs(hubList); setRequest(req); }).catch(console.error);
  }, [id]);

  if (!user || !request) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Request" description="Update the request details. Submitted requests become read-only." />
      <div className="rounded-lg border border-border bg-white p-6">
        <RequestForm
          hubs={hubs}
          initial={request}
          onSubmit={async (formData, hub) => { await updateDraft(request.id, formData, hub); router.push(`/request?id=${request.id}`); }}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}

export default function EditRequestPage() {
  return <EditContent />;
}
