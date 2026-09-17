"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { createUserProfile, listUsers, setUserActive, setUserRoles } from "@/lib/data";
import type { AppUser, RoleName } from "@/features/hod-approvals/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { downloadCsv } from "@/lib/csv";

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [newUserName, setNewUserName] = React.useState("");
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserRoles, setNewUserRoles] = React.useState<RoleName[]>(["REQUESTER"]);
  const [showInactive, setShowInactive] = React.useState(false);

  async function refreshUsers() { setUsers(await listUsers()); }

  React.useEffect(() => { refreshUsers(); }, []);

  if (!user?.roles.includes("ADMINISTRATOR")) {
    return <p className="text-sm text-muted-foreground">Administrator access required.</p>;
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

  async function toggleRole(uid: string, role: RoleName) {
    const target = users.find((u) => u.id === uid);
    if (!target) return;
    const adding = !target.roles.includes(role);
    if (adding && (role === "HOD_1" || role === "HOD_2")) {
      for (const other of users) {
        if (other.id !== uid && other.roles.includes(role)) {
          await setUserRoles(other.id, other.roles.filter((r) => r !== role));
        }
      }
    }
    const newRoles = adding ? [...target.roles, role] : target.roles.filter((r) => r !== role);
    await setUserRoles(uid, newRoles);
    await refreshUsers();
  }

  async function toggleActive(uid: string, active: boolean) {
    await setUserActive(uid, active);
    await setUserRoles(uid, active ? ["WATCHER"] : []);
    await refreshUsers();
  }

  const visibleUsers = showInactive ? users : users.filter((u) => u.active);
  const roleLabel = (role: RoleName) => role === "HOD_1" ? "HOD 1" : role === "HOD_2" ? "HOD 2" : role.replace(/_/g, " ");

  return (
    <div className="space-y-6">
      <PageHeader title="User Access" description="Define users, assign roles, and control access." />

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
          {visibleUsers.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.email} · {(u.roles.map(roleLabel)).join(", ") || "No roles"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(["REQUESTER", "HOD_1", "HOD_2", "WATCHER", "ADMINISTRATOR"] as RoleName[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(u.id, role)}
                    className={u.roles.includes(role) ? "rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground" : "rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"}
                  >
                    {roleLabel(role)}
                  </button>
                ))}
                <Button variant={u.active ? "destructive" : "secondary"} onClick={() => toggleActive(u.id, !u.active)}>
                  {u.active ? "Remove Access" : "Restore Access"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
