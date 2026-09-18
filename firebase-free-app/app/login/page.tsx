"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const demoAccounts = [
  { email: "cedrick.fabia@spxexpress.com", label: "Administrator (Cedrick)", roles: ["ADMINISTRATOR", "HOD_APPROVER"] as const },
  { email: "requester.demo@spxexpress.com", label: "Requester", roles: ["REQUESTER"] as const },
  { email: "hod1.demo@spxexpress.com", label: "HOD Approver 1", roles: ["HOD_APPROVER"] as const },
  { email: "hod2.demo@spxexpress.com", label: "HOD Approver 2", roles: ["HOD_APPROVER"] as const },
  { email: "watcher.demo@spxexpress.com", label: "Watcher", roles: ["WATCHER", "REQUESTER"] as const },
  { email: "admin.demo@spxexpress.com", label: "Administrator", roles: ["ADMINISTRATOR", "HOD_APPROVER"] as const }
];

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInDemo } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function run(kind: string, fn: () => Promise<void>) {
    setBusy(kind);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-lg font-bold text-primary-foreground">ND</span>
          <h1 className="mt-4 text-xl font-semibold tracking-normal">SPX Network Development App</h1>
          <p className="mt-1 text-sm text-muted-foreground">Network Development Workflows Portal</p>
        </div>

        <Button className="mt-6 w-full" disabled={busy !== null} onClick={() => run("google", signInWithGoogle)}>
          <Building2 className="mr-2 h-4 w-4" aria-hidden="true" /> Sign in with Google
        </Button>

        <div className="mt-5 flex items-start gap-2 rounded-md bg-muted p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">Only accounts approved by the administrator can access this application.</p>
        </div>

        {process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true" ? (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Free demo sign in</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => run(account.email, () => signInDemo(account.email, account.label, [...account.roles]))}
                  className="rounded-md border border-border px-3 py-2 text-left text-xs hover:bg-muted disabled:opacity-50"
                >
                  <span className="block font-medium text-foreground">{account.label}</span>
                  <span className="block truncate text-muted-foreground">{account.email}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

      </div>

      <Dialog open={!!error} onClose={() => setError("")} title="Access Denied" footer={<Button onClick={() => setError("")}>OK</Button>}>
        <p className="text-sm text-muted-foreground">{error}</p>
      </Dialog>
    </div>
  );
}
