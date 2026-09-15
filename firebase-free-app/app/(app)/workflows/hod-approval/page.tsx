"use client";

import { useAuth } from "@/lib/auth";

export default function HODApprovalWorkflowPage() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white shadow-sm">ND</span>
      <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl">Welcome to SPX Network Development App</h1>
      <p className="mt-3 text-base text-muted-foreground">{user?.name}</p>
    </div>
  );
}
