"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { createUserProfile, deleteHub, getRoutesForHub, listHubs, listReplaceableSteps, listUsers, replaceApprover, saveHub, saveRoute, setUserRoles, updateWorkflowAccess, WORKFLOW_ACCESS_TYPES, type FreeStep } from "@/lib/data";
import type { AppUser, Hub, RoleName } from "@/features/hod-approvals/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { downloadCsv } from "@/lib/csv";

type Tab = "hubs" | "users" | "routes" | "replacements" | "workflow";

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
  const [replaceableSteps, setReplaceableSteps] = React.useState<Array<{ step: FreeStep; requestId: string; requestTitle: string }>>([]);
  const [workflowUserId, setWorkflowUserId] = React.useState("");
  const [workflowAccessTypes, setWorkflowAccessTypes] = React.useState<string[]>([]);

  async function refreshHubs() { setHubs(await listHubs()); }
  async function refreshUsers() { setUsers(await listUsers()); }
  async function refreshReplaceableSteps() { setReplaceableSteps(await listReplaceableSteps()); }

  React.useEffect(() => { refreshHubs(); refreshUsers(); refreshReplaceableSteps(); }, []);
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

  async function doReplace(stepId: string, newApproverId: string) {
    const approver = users.find((u) => u.id === newApproverId);
    if (!approver) return;
    await replaceApprover(user!, stepId, approver.id, approver.name, approver.email);
    await refreshReplaceableSteps();
  }

  async function saveWorkflowAccess() {
    if (!workflowUserId) return;
    await updateWorkflowAccess(workflowUserId, "hod-approval", workflowAccessTypes);
    await refreshUsers();
  }

  const hodUsers = users.filter((u) => u.roles.includes("HOD_APPROVER"));

  return (
    <div className="space-y-6">
      <PageHeader title="Administration" description="Manage hubs, users, and approver routes." />
      <div className="flex gap-2">
        {(["hubs", "users", "routes", "replacements", "workflow"] as Tab[]).map((name) => (
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
            <Button variant="secondary" className="mt-2" onClick={() => downloadCsv("hubs.csv", ["Name", "Code", "Active"], hubs.map((hub) => [hub.name, hub.code, hub.active ? "Yes" : "No"]))}>Export CSV</Button>
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
          <Button variant="secondary" className="mt-2" onClick={() => downloadCsv("users.csv", ["Name", "Email", "Roles", "Active"], users.map((u) => [u.name, u.email, u.roles.join(", "), u.active ? "Yes" : "No"]))}>Export CSV</Button>
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
            <Button variant="secondary" className="mt-2" onClick={() => downloadCsv("routes.csv", ["Slot", "Approver Name", "Approver Email"], routes.map((route) => [String(route.slot), String(route.approverName ?? ""), String(route.approverEmail ?? "")]))}>Export CSV</Button>
            <ul className="mt-3 space-y-2">
              {routes.map((route) => (
                <li key={String(route.id)} className="text-sm">Slot {String(route.slot)}: {String(route.approverName ?? route.approverUserId)}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "replacements" ? (
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-sm font-semibold">Approver Replacement</h2>
          <p className="mt-1 text-xs text-muted-foreground">Reassign an active approval step to another HOD approver.</p>
          <ul className="mt-4 divide-y divide-border">
            {replaceableSteps.map(({ step, requestTitle }) => (
              <li key={step.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{requestTitle}</p>
                  <p className="text-xs text-muted-foreground">HOD {step.sequence} · {step.approverName} · {step.status.replace(/_/g, " ")}</p>
                </div>
                <select
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) doReplace(step.id, e.target.value); }}
                  className="rounded-md border border-border bg-white px-2 py-1.5 text-sm"
                >
                  <option value="">Replace with...</option>
                  {users.filter((u) => u.roles.includes("HOD_APPROVER") && u.id !== step.approverId).map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </li>
            ))}
            {replaceableSteps.length === 0 ? <li className="py-4 text-sm text-muted-foreground">No active steps to replace.</li> : null}
          </ul>
        </div>
      ) : null}

      {tab === "workflow" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold">Workflow Access Assignment</h2>
            <p className="mt-1 text-xs text-muted-foreground">Assign access types for HOD Approval Workflow.</p>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="workflow-user">User</Label>
                <select id="workflow-user" value={workflowUserId} onChange={(e) => { setWorkflowUserId(e.target.value); const user = users.find((u) => u.id === e.target.value); setWorkflowAccessTypes(user?.workflowAccess?.["hod-approval"] ?? []); }} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm">
                  <option value="">Select user</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-3">
                {WORKFLOW_ACCESS_TYPES.map((access) => (
                  <label key={access.id} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={workflowAccessTypes.includes(access.id)} onChange={(e) => setWorkflowAccessTypes((prev) => e.target.checked ? [...prev, access.id] : prev.filter((id) => id !== access.id))} />
                    {access.label}
                  </label>
                ))}
              </div>
              <Button onClick={saveWorkflowAccess}>Save workflow access</Button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold">Current Assignments</h2>
            <ul className="mt-3 divide-y divide-border">
              {users.map((u) => (
                <li key={u.id} className="py-2 text-sm">
                  <span className="font-medium">{u.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{(u.workflowAccess?.["hod-approval"] ?? []).join(", ") || "No access assigned"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
