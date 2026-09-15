"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

export interface RouteUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export function RoutesManager({
  users,
  initialApprovers,
  workflowName
}: {
  users: RouteUser[];
  initialApprovers: Array<{ slot: 1 | 2; userId: string; userName: string; userEmail: string }>;
  workflowName: string;
}) {
  const [hod1UserId, setHod1UserId] = React.useState(initialApprovers.find((item) => item.slot === 1)?.userId ?? "");
  const [hod2UserId, setHod2UserId] = React.useState(initialApprovers.find((item) => item.slot === 2)?.userId ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  function userLabel(user: RouteUser): string {
    return `${user.name} (${user.email})`;
  }

  async function saveSlot(slot: 1 | 2, userId: string) {
    const response = await fetch("/api/admin/routes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workflowId: "hod-approval", slot, approverUserId: userId })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not save approver");
    return result;
  }

  async function saveAssignments() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (!hod1UserId) throw new Error("HOD 1 is required");
      if (!hod2UserId) throw new Error("HOD 2 is required");
      if (hod1UserId === hod2UserId) throw new Error("HOD 1 and HOD 2 must be different users");
      await saveSlot(1, hod1UserId);
      await saveSlot(2, hod2UserId);
      setSuccess("HOD 1 and HOD 2 assignments saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save assignments");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="surface p-5">
        <p className="section-title">Assign HOD 1 and HOD 2</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {workflowName}: within-budget requests go to HOD 1 only. Above-budget requests go to HOD 1 first, then HOD 2. One user per slot.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="form-field">
            <label className="text-xs font-medium text-muted-foreground">HOD 1</label>
            <Select value={hod1UserId} onChange={(event) => setHod1UserId(event.target.value)}>
              <option value="">Select HOD 1 user</option>
              {users.map((user) => <option key={user.id} value={user.id}>{userLabel(user)}</option>)}
            </Select>
          </div>
          <div className="form-field">
            <label className="text-xs font-medium text-muted-foreground">HOD 2</label>
            <Select value={hod2UserId} onChange={(event) => setHod2UserId(event.target.value)}>
              <option value="">Select HOD 2 user</option>
              {users.map((user) => <option key={user.id} value={user.id}>{userLabel(user)}</option>)}
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <Button disabled={saving} onClick={() => void saveAssignments()}>Save Assignments</Button>
        </div>
        {error ? <p className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
        {success ? <p className="mt-3 rounded-md bg-success/10 p-3 text-sm text-success-foreground">{success}</p> : null}
      </div>

      <div className="surface overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Slot</th>
              <th className="px-4 py-3">User</th>
            </tr>
          </thead>
          <tbody>
            {[{ slot: 1 as const, userId: hod1UserId }, { slot: 2 as const, userId: hod2UserId }].map((item) => {
              const user = users.find((candidate) => candidate.id === item.userId);
              return (
                <tr key={item.slot} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">HOD {item.slot}</td>
                  <td className="px-4 py-3">{user ? `${user.name} (${user.email})` : "Not assigned"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
