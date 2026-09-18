"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { createUserProfile, listUsers, setUserActive, setUserRoles } from "@/lib/data";
import type { AppUser, RoleName } from "@/features/hod-approvals/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { downloadCsv } from "@/lib/csv";
import { AccessDenied } from "@/components/access-denied";
import { cn } from "@/lib/utils";
import Link from "next/link";

function sameRoles(a: RoleName[], b: RoleName[]): boolean {
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.length === sb.length && sa.every((r, i) => r === sb[i]);
}

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [draftUsers, setDraftUsers] = React.useState<AppUser[]>([]);
  const [newUserName, setNewUserName] = React.useState("");
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserRoles, setNewUserRoles] = React.useState<RoleName[]>(["REQUESTER"]);
  const [showInactive, setShowInactive] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function refreshUsers() {
    const fresh = await listUsers();
    setUsers(fresh);
    setDraftUsers(fresh);
  }

  React.useEffect(() => { refreshUsers(); }, []);

  if (!user?.roles.includes("ADMINISTRATOR")) {
    return <AccessDenied message="Administrator access required." />;
  }

  async function addUser() {
    for (const role of ["HOD_1", "HOD_2"] as RoleName[]) {
      if (newUserRoles.includes(role)) {
        for (const other of users) {
          if (other.roles.includes(role)) {
            await setUserRoles(other.id, other.roles.filter((r) => r !== role));
          }
        }
      }
    }
    await createUserProfile(newUserEmail, newUserName, newUserRoles);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserRoles(["REQUESTER"]);
    await refreshUsers();
  }

  function stageRoleToggle(uid: string, role: RoleName) {
    setDraftUsers((prev) => {
      const target = prev.find((u) => u.id === uid);
      if (!target) return prev;
      const adding = !target.roles.includes(role);
      let next = prev;
      if (adding && (role === "HOD_1" || role === "HOD_2")) {
        next = next.map((u) => (u.id !== uid && u.roles.includes(role)) ? { ...u, roles: u.roles.filter((r) => r !== role) } : u);
      }
      return next.map((u) => u.id === uid ? { ...u, roles: adding ? [...u.roles, role] : u.roles.filter((r) => r !== role) } : u);
    });
  }

  function stageActiveToggle(uid: string) {
    setDraftUsers((prev) => prev.map((u) => {
      if (u.id !== uid) return u;
      const nextActive = !u.active;
      return { ...u, active: nextActive, roles: nextActive ? ["WATCHER"] : [] };
    }));
  }

  function discardChanges() {
    setDraftUsers(users);
  }

  const changedUsers = draftUsers.filter((du) => {
    const orig = users.find((u) => u.id === du.id);
    return !!orig && (orig.active !== du.active || !sameRoles(orig.roles, du.roles));
  });
  const hasChanges = changedUsers.length > 0;

  async function saveChanges() {
    setSaving(true);
    try {
      for (const du of changedUsers) {
        const orig = users.find((u) => u.id === du.id)!;
        if (orig.active !== du.active) await setUserActive(du.id, du.active);
        if (!sameRoles(orig.roles, du.roles)) await setUserRoles(du.id, du.roles);
      }
      await refreshUsers();
    } finally {
      setSaving(false);
    }
  }

  const visibleUsers = showInactive ? draftUsers : draftUsers.filter((u) => u.active);
  const roleLabel = (role: RoleName) => role === "HOD_1" ? "HOD 1" : role === "HOD_2" ? "HOD 2" : role.replace(/_/g, " ");

  return (
    <div className="space-y-6">
      <PageHeader title="User Access" description="Define users, assign roles, and control access." actions={<><Link href="/admin/errors"><Button variant="secondary">View Error Logs</Button></Link><Link href="/admin/privacy"><Button variant="secondary">Privacy &amp; Compliance</Button></Link><Link href="/changelog"><Button variant="secondary">Changelog</Button></Link></>} />

      <div className="rounded-lg border border-border bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Define User</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div><Label htmlFor="new-user-name">Name</Label><Input id="new-user-name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} /></div>
          <div><Label htmlFor="new-user-email">Email</Label><Input id="new-user-email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="name@spxexpress.com" /></div>
          <div className="flex flex-wrap items-end gap-3">
            {(["REQUESTER", "HOD_1", "HOD_2", "WATCHER", "ADMINISTRATOR"] as RoleName[]).map((role) => (
              <label key={role} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={newUserRoles.includes(role)} onChange={(e) => setNewUserRoles((prev) => e.target.checked ? [...prev, role] : prev.filter((r) => r !== role))} />
                {roleLabel(role)}
              </label>
            ))}
            <Button onClick={addUser}>Add User</Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Users</h3>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive users</label>
            <Button variant="secondary" onClick={() => downloadCsv("users.csv", ["Name", "Email", "Roles", "Active"], visibleUsers.map((u) => [u.name, u.email, u.roles.join(", "), u.active ? "Yes" : "No"]))}>Export CSV</Button>
          </div>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {visibleUsers.map((u) => {
            const orig = users.find((o) => o.id === u.id);
            const isChanged = !!orig && (orig.active !== u.active || !sameRoles(orig.roles, u.roles));
            return (
              <li key={u.id} className={cn("flex flex-wrap items-center justify-between gap-3 py-3", isChanged && "bg-amber-50")}>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{u.name} {isChanged ? <span className="ml-1 text-xs font-normal text-amber-700">(unsaved)</span> : null}</p>
                  <p className="text-xs text-muted-foreground">{u.email} · {(u.roles.map(roleLabel)).join(", ") || "No roles"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(["REQUESTER", "HOD_1", "HOD_2", "WATCHER", "ADMINISTRATOR"] as RoleName[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => stageRoleToggle(u.id, role)}
                      className={u.roles.includes(role) ? "rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground" : "rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"}
                    >
                      {roleLabel(role)}
                    </button>
                  ))}
                  <Button variant={u.active ? "destructive" : "secondary"} onClick={() => stageActiveToggle(u.id)}>
                    {u.active ? "Remove Access" : "Restore Access"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className={cn("mt-4 flex flex-wrap items-center gap-3 rounded-md border p-3", hasChanges ? "border-amber-300 bg-amber-50" : "border-border bg-muted/40")}>
          <p className={cn("text-sm", hasChanges ? "text-amber-900" : "text-muted-foreground")}>
            {hasChanges
              ? `${changedUsers.length} user${changedUsers.length === 1 ? "" : "s"} changed. Affected users will need to sign out and sign back in to see the change.`
              : "No unsaved changes."}
          </p>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" disabled={!hasChanges || saving} onClick={discardChanges}>Discard</Button>
            <Button disabled={!hasChanges || saving} onClick={saveChanges}>{saving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
