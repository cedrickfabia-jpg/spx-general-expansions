"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { listMyRequests, listWatchedRequests, type FreeRequest } from "@/lib/data";
import { RequestList } from "@/components/request-list";
import { Button } from "@/components/ui/button";

export default function HODApprovalWorkflowPage() {
  const { user } = useAuth();
  const [requests, setRequests] = React.useState<FreeRequest[]>([]);
  const [watched, setWatched] = React.useState<FreeRequest[]>([]);

  React.useEffect(() => {
    if (!user) return;
    Promise.all([listMyRequests(user.id), listWatchedRequests(user.email)]).then(([mine, watchedItems]) => { setRequests(mine); setWatched(watchedItems); }).catch(console.error);
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center px-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white shadow-sm">ND</span>
        <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl">Welcome to SPX Network Development App</h1>
        <p className="mt-3 text-base text-muted-foreground">{user?.name}</p>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Requests</h2>
        <Link href="/requests/new"><Button><Plus className="mr-2 h-4 w-4" aria-hidden="true" /> New HOD Approval</Button></Link>
      </div>
      <div className="rounded-lg border border-border bg-white p-2">
        <RequestList requests={requests} showRequester={false} />
      </div>
      {user?.roles.includes("WATCHER") ? (
        <>
          <h2 className="text-xl font-semibold">My Watches</h2>
          <div className="rounded-lg border border-border bg-white p-2">
            <RequestList requests={watched} />
          </div>
        </>
      ) : null}
    </div>
  );
}
