"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/dialog";

export function SubmitButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    setError(null);
    const response = await fetch(`/api/approvals/${requestId}/submit`, { method: "POST" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "Could not submit the request");
      return;
    }
    router.push(`/approvals/${requestId}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <ConfirmButton
        label="Submit Request"
        description="Submitting activates the first HOD approver and starts the approval workflow. The submitted request becomes read-only."
        confirmLabel="Submit"
        onConfirm={submit}
        variant="primary"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
