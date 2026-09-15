"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface HubView {
  id: string;
  name: string;
  active: boolean;
}

export function HubsManager({ initialHubs }: { initialHubs: HubView[] }) {
  const [hubs, setHubs] = React.useState(initialHubs);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function addHub() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/hubs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create hub");
      setHubs((current) => [...current, result]);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create hub");
    } finally {
      setBusy(false);
    }
  }

  async function updateHub(id: string, active: boolean) {
    const hub = hubs.find((item) => item.id === id);
    if (!hub) return;
    const response = await fetch(`/api/admin/hubs/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: hub.name, active })
    });
    if (response.ok) {
      const updated = (await response.json()) as HubView;
      setHubs((current) => current.map((item) => (item.id === id ? updated : item)));
    }
  }

  return (
    <div className="space-y-4">
      <div className="surface p-4">
        <p className="section-title">Add Hub</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="form-field">
            <Label htmlFor="hub-name">Name</Label>
            <Input id="hub-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <Button className="self-end" onClick={() => void addHub()} disabled={busy || !name}>Add Hub</Button>
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="surface overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {hubs.map((hub) => (
              <tr key={hub.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{hub.name}</td>
                <td className="px-4 py-3"><Badge variant={hub.active ? "success" : "muted"}>{hub.active ? "Active" : "Inactive"}</Badge></td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => void updateHub(hub.id, !hub.active)}>
                    {hub.active ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
