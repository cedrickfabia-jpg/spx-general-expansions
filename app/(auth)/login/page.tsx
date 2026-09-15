import { redirect } from "next/navigation";
import { Building2, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-session";
import { env } from "@/lib/env";
import { DemoLogin } from "@/components/demo-login";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-border bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-lg font-bold text-primary-foreground">
              GE
            </span>
            <h1 className="mt-4 text-xl font-semibold tracking-normal">General Expansions</h1>
            <p className="mt-1 text-sm text-muted-foreground">SPX Expansions Workflows Portal</p>
          </div>

          <div className="mt-8">
            <p className="text-center text-sm text-muted-foreground">
              Sign in with your organizational Google account, e.g. firstname.lastname@spxexpress.com
            </p>
            <a
              href="/api/auth/start"
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Building2 className="h-4 w-4" aria-hidden="true" />
              Sign in with Google
            </a>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-md bg-muted p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">
              Only @{env.orgDomain} Google Workspace accounts can access this application.
            </p>
          </div>

          {env.authDevMode ? <div className="mt-5"><DemoLogin /></div> : null}
        </div>
      </div>
    </div>
  );
}
