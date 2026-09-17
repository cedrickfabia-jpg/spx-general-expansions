"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { createUserProfile, deleteHub, getRoutesForHub, listHubs, listUsers, saveHub, saveRoute, setUserActive, setUserRoles } from "@/lib/data";
import type { AppUser, Hub, RoleName } from "@/features/hod-approvals/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { downloadCsv } from "@/lib/csv";

type Tab = "hubs" | "users" | "routes";

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = React.useState<Tab>("hubs");
  const [hubs, setHubs] = React.useState<Hub[]>([]);
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [hubName, setHubName] = React.useState("");
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
    const code = (hubName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)) || "HUB";
    await saveHub({ name: hubName, code, active: true });
    setHubName("");
    await refreshHubs();
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

  async function saveSelectedRoute() {
    if (!selectedHub) return;
    if (!slot1 || !slot2) {
      window.alert("Assign one account for HOD 1 and one account for HOD 2.");
      return;
    }
    if (slot1 === slot2) {
      window.alert("HOD 1 and HOD 2 must be different accounts.");
      return;
    }
    const approver1 = users.find((u) => u.id === slot1);
    const approver2 = users.find((u) => u.id === slot2);
    await saveRoute(selectedHub, 1, slot1, approver1?.name ?? "", approver1?.email ?? "");
    await saveRoute(selectedHub, 2, slot2, approver2?.name ?? "", approver2?.email ?? "");
    setRoutes(await getRoutesForHub(selectedHub));
  }


  const hod1Users = users.filter((u) => u.roles.includes("HOD_1"));
  const hod2Users = users.filter((u) => u.roles.includes("HOD_2"));

  return (
    <div className="space-y-6">
      <PageHeader title="Administration" description="Manage hubs, users, and approver routes." />
      <div className="flex gap-2">
        {(["hubs", "users", "routes"] as Tab[]).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={tab === name
              ? "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm"
              : "rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"}
          >
            {name[0].toUpperCase() + name.slice(1)}
          </button>
        ))}
      </div>

      {tab === "hubs" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold">Add Hub</h2>
            <div className="mt-3 space-y-3">
              <div><Label htmlFor="hub-name">Hub Name</Label><Input id="hub-name" value={hubName} onChange={(e) => setHubName(e.target.value)} /></div>
              <Button onClick={addHub}>Add hub</Button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold">Hubs</h2>
            <Button variant="secondary" className="mt-2" onClick={() => downloadCsv("hubs.csv", ["Name", "Code", "Active"], hubs.map((hub) => [hub.name, hub.code, hub.active ? "Yes" : "No"]))}>Export CSV</Button>
            <ul className="mt-3 space-y-2">
              {hubs.map((hub) => (
                <li key={hub.id} className="flex items-center justify-between border-b border-border pb-2 text-sm">
                  <span>{hub.name}</span>
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
              {(["REQUESTER", "HOD_1", "HOD_2", "WATCHER", "ADMINISTRATOR"] as RoleName[]).map((role) => (
                <label key={role} className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={newUserRoles.includes(role)} onChange={(e) => setNewUserRoles((prev) => e.target.checked ? [...prev, role] : prev.filter((r) => r !== role))} />
                  {role === "HOD_1" ? "HOD 1" : role === "HOD_2" ? "HOD 2" : role.replace(/_/g, " ")}
                </label>
              ))}
              <Button onClick={addUser}>Add User</Button>
            </div>
          </div>
          <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Users</h3>
          <Button variant="secondary" className="mt-2" onClick={() => downloadCsv("users.csv", ["Name", "Email", "Roles", "Active"], users.map((u) => [u.name, u.email, u.roles.join(", "), u.active ? "Yes" : "No"]))}>Export CSV</Button>
          <ul className="mt-3 divide-y divide-border">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex gap-2">
                  {(["REQUESTER", "HOD_1", "HOD_2", "WATCHER", "ADMINISTRATOR"] as RoleName[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(u.id, role)}
                      className={u.roles.includes(role) ? "rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground" : "rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"}
                    >
                      {role === "HOD_1" ? "HOD 1" : role === "HOD_2" ? "HOD 2" : role.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
                <Button variant={u.active ? "destructive" : "secondary"} onClick={() => toggleActive(u.id, !u.active)}>
                  {u.active ? "Remove Access" : "Restore Access"}
                </Button>
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
              <div><Label htmlFor="slot1">HOD 1</Label><select id="slot1" value={slot1} onChange={(e) => setSlot1(e.target.value)} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"><option value="">Select user</option>{hod1Users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              <div><Label htmlFor="slot2">HOD 2</Label><select id="slot2" value={slot2} onChange={(e) => setSlot2(e.target.value)} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"><option value="">Select user</option>{hod2Users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              <Button onClick={saveSelectedRoute}>Save route</Button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold">Saved Routes</h2>
            <Button variant="secondary" className="mt-2" onClick={() => downloadCsv("routes.csv", ["Slot", "Approver Name", "Approver Email"], routes.map((route) => [String(route.slot), String(route.approverName ?? ""), String(route.approverEmail ?? "")]))}>Export CSV</Button>
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
