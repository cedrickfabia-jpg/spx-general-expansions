"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { createUserProfile, deleteHub, getRoutesForHub, listHubs, listUsers, saveHub, saveRoute, setUserRoles } from "@/lib/data";
import type { AppUser, Hub, RoleName } from "@/features/hod-approvals/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Tab = "hubs" | "users" | "routes";

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = React.useState<Tab>("hubs");
  const [hubs, setHubs] = React.useState<Hub[]>([]);
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [hubName, setHubName] = React.useState("");
  const [hubCode, setHubCode] = React.useState("");
  const [selectedHub, setSelectedHub] = React.useState("");
  const [routes, setRoutes] = React.useState<Array<Record<string, unknown>>>([]);
  const [slot1, setSlot1] = React.useState("");
  const [slot2, setSlot2] = React.useState("");
  const [newUserName, setNewUserName] = React.useState("");
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserRoles, setNewUserRoles] = React.useState<RoleName[]>(["REQUESTER"]);

  async function refreshHubs() { setHubs(await listHubs()); }
  async function refreshUsers() { setUsers(await listUsers()); }

  React.useEffect(() => { refreshHubs(); refreshUsers(); }, []);
  React.useEffect(() => { if (selectedHub) getRoutesForHub(selectedHub).then(setRoutes).catch(console.error); }, [selectedHub]);

  if (!user?.roles.includes("ADMINISTRATOR")) {
    return <p className="text-sm text-muted-foreground">Administrator access required.</p>;
  }

  async function addHub() {
    await saveHub({ name: hubName, code: hubCode, active: true });
    setHubName("");
    setHubCode("");
    await refreshHubs();
  }

  async function updateRoles(uid: string, roles: RoleName[]) {
    await setUserRoles(uid, roles);
    await refreshUsers();
  }

  async function addUser() {
    await createUserProfile(newUserEmail, newUserName, newUserRoles);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserRoles(["REQUESTER"]);
    await refreshUsers();
  }

  async function saveSelectedRoute() {
    if (!selectedHub) return;
    if (slot1) {
      const approver = users.find((u) => u.id === slot1);
      await saveRoute(selectedHub, 1, slot1, approver?.name ?? "", approver?.email ?? "");
    }
    if (slot2) {
      const approver = users.find((u) => u.id === slot2);
      await saveRoute(selectedHub, 2, slot2, approver?.name ?? "", approver?.email ?? "");
    }
    setRoutes(await getRoutesForHub(selectedHub));
  }

  const hodUsers = users.filter((u) => u.roles.includes("HOD_APPROVER"));

  return (
    <div className="space-y-6">
      <PageHeader title="Administration" description="Manage hubs, users, and approver routes." />
      <div className="flex gap-2">
        {(["hubs", "users", "routes"] as Tab[]).map((name) => (
          <Button key={name} variant={tab === name ? "primary" : "secondary"} onClick={() => setTab(name)}>{name[0].toUpperCase() + name.slice(1)}</Button>
        ))}
      </div>

      {tab === "hubs" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold">Add Hub</h2>
            <div className="mt-3 space-y-3">
              <div><Label htmlFor="hub-name">Hub Name</Label><Input id="hub-name" value={hubName} onChange={(e) => setHubName(e.target.value)} /></div>
              <div><Label htmlFor="hub-code">Code</Label><Input id="hub-code" value={hubCode} onChange={(e) => setHubCode(e.target.value)} /></div>
              <Button onClick={addHub}>Add hub</Button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold">Hubs</h2>
            <ul className="mt-3 space-y-2">
              {hubs.map((hub) => (
                <li key={hub.id} className="flex items-center justify-between border-b border-border pb-2 text-sm">
                  <span>{hub.name} <span className="text-xs text-muted-foreground">({hub.code})</span></span>
                  <Button variant="secondary" onClick={async () => { await deleteHub(hub.id); await refreshHubs(); }}>Delete</Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "users" ? (
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-sm font-semibold">Define User</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><Label htmlFor="new-user-name">Name</Label><Input id="new-user-name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} /></div>
            <div><Label htmlFor="new-user-email">Email</Label><Input id="new-user-email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="name@spxexpress.com" /></div>
            <div className="flex items-end gap-2">
              {(["REQUESTER", "HOD_APPROVER", "WATCHER", "ADMINISTRATOR"] as RoleName[]).map((role) => (
                <label key={role} className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={newUserRoles.includes(role)} onChange={(e) => setNewUserRoles((prev) => e.target.checked ? [...prev, role] : prev.filter((r) => r !== role))} />
                  {role.replace(/_/g, " ")}
                </label>
              ))}
              <Button onClick={addUser}>Add User</Button>
            </div>
          </div>
          <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Users</h3>
          <ul className="mt-3 divide-y divide-border">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex gap-2">
                  {(["REQUESTER", "HOD_APPROVER", "WATCHER", "ADMINISTRATOR"] as RoleName[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => updateRoles(u.id, u.roles.includes(role) ? u.roles.filter((r) => r !== role) : [...u.roles, role])}
                      className={u.roles.includes(role) ? "rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground" : "rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"}
                    >
                      {role.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          </div>
        </div>
      ) : null}

      {tab === "routes" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold">Configure Route</h2>
            <div className="mt-3 space-y-3">
              <div>
                <Label htmlFor="route-hub">Hub</Label>
                <select id="route-hub" value={selectedHub} onChange={(e) => setSelectedHub(e.target.value)} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm">
                  <option value="">Select hub</option>
                  {hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}
                </select>
              </div>
              <div><Label htmlFor="slot1">HOD 1</Label><select id="slot1" value={slot1} onChange={(e) => setSlot1(e.target.value)} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"><option value="">Select user</option>{hodUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              <div><Label htmlFor="slot2">HOD 2</Label><select id="slot2" value={slot2} onChange={(e) => setSlot2(e.target.value)} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"><option value="">Select user</option>{hodUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              <Button onClick={saveSelectedRoute}>Save route</Button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold">Saved Routes</h2>
            <ul className="mt-3 space-y-2">
              {routes.map((route) => (
                <li key={String(route.id)} className="text-sm">Slot {String(route.slot)}: {String(route.approverName ?? route.approverUserId)}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
