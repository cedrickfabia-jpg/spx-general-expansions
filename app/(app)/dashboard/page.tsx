import { Workflow } from "lucide-react";
import { requireUser } from "@/lib/auth-session";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-3xl text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <Workflow className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl">
          Welcome to SPX Expansions workflows
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Welcome, {user.name.split(" ")[0]}. Select a workflow from the hamburger menu to begin.
        </p>
      </div>
    </div>
  );
}
