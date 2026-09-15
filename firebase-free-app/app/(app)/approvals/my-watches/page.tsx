"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { listWatchedRequests, type FreeRequest } from "@/lib/data";
import { RequestList } from "@/components/request-list";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function MyWatchesPage() {
  const { user } = useAuth();
  const [requests, setRequests] = React.useState<FreeRequest[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;
    listWatchedRequests(user.email).then((items) => { setRequests(items); setLoading(false); }).catch(console.error);
  }, [user]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <PageHeader title="My Watches" description="Requests where you are listed as a watcher." />
      {requests.length > 0 ? (
        <div className="rounded-lg border border-border bg-white p-2"><RequestList requests={requests} /></div>
      ) : <EmptyState title="No watched requests" description="Requests that include you as a watcher will appear here." />}
    </div>
  );
}
