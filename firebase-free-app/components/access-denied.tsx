"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function AccessDenied({ message = "You do not have access to this page." }: { message?: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);

  function close() {
    setOpen(false);
    router.replace("/dashboard");
  }

  return (
    <Dialog open={open} onClose={close} title="Access Denied" footer={<Button onClick={close}>OK</Button>}>
      <p className="text-sm text-muted-foreground">{message}</p>
    </Dialog>
  );
}
