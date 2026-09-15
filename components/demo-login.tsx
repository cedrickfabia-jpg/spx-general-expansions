"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const demoAccounts = [
  { email: "requester.demo@spxexpress.com", label: "Requester" },
  { email: "hod1.demo@spxexpress.com", label: "HOD Approver 1" },
  { email: "hod2.demo@spxexpress.com", label: "HOD Approver 2" },
  { email: "watcher.demo@spxexpress.com", label: "Watcher" },
  { email: "admin.demo@spxexpress.com", label: "Administrator" }
];

export function DemoLogin() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function login(value: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Sign in failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-border pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Local development demo</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {demoAccounts.map((account) => (
          <button
            key={account.email}
            type="button"
            disabled={busy}
            onClick={() => login(account.email)}
            className="rounded-md border border-border px-3 py-2 text-left text-xs hover:bg-muted disabled:opacity-50"
          >
            <span className="block font-medium text-foreground">{account.label}</span>
            <span className="block truncate text-muted-foreground">{account.email}</span>
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void login(email);
        }}
      >
        <div className="flex-1">
          <Label htmlFor="dev-email" className="sr-only">
            Demo email
          </Label>
          <Input id="dev-email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="anyone@spxexpress.com" />
        </div>
        <Button type="submit" variant="secondary" disabled={busy}>
          Sign in
        </Button>
      </form>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
