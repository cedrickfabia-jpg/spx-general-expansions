"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type { RoleName } from "@/features/hod-approvals/types";

export interface UserAdminView {
  id: string;
  name: string;
  email: string;
  active: boolean;
  roles: RoleName[];
}

export interface WorkflowAccessAdminView {
  workflowId: string;
  userId: string;
  userName: string;
  userEmail: string;
  accessType: string;
}

export interface WorkflowOption {
  id: string;
  name: string;
  accessTypes: Array<{ id: string; label: string }>;
}

const allRoles: RoleName[] = ["REQUESTER", "HOD_APPROVER", "WATCHER", "ADMINISTRATOR"];

export function UsersManager({
  users: initialUsers,
  workflows,
  initialWorkflowAccess
}: {
  users: UserAdminView[];
  workflows: WorkflowOption[];
  initialWorkflowAccess: WorkflowAccessAdminView[];
}) {
  const [users, setUsers] = React.useState(initialUsers);
  const [workflowId, setWorkflowId] = React.useState(workflows[0]?.id ?? "");
  const [accessList, setAccessList] = React.useState(initialWorkflowAccess);
  const [search, setSearch] = React.useState("");
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState("");
  const [accessType, setAccessType] = React.useState(workflows[0]?.accessTypes[0]?.id ?? "");
  const [grantError, setGrantError] = React.useState<string | null>(null);
  const [grantSuccess, setGrantSuccess] = React.useState<string | null>(null);
  const [granting, setGranting] = React.useState(false);

  const selectedWorkflow = workflows.find((workflow) => workflow.id === workflowId);

  async function patch(userId: string, body: Record<string, unknown>) {
    setSavingId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        const updated = (await response.json()) as UserAdminView;
        setUsers((current) => current.map((user) => (user.id === userId ? { ...updated, roles: updated.roles } : user)));
      }
    } finally {
      setSavingId(null);
    }
  }

  async function grantAccess() {
    setGranting(true);
    setGrantError(null);
    setGrantSuccess(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, accessType, workflowId })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not grant access");
      const mapped: UserAdminView = {
        id: result.id,
        name: result.name,
        email: result.email,
        active: result.active,
        roles: result.roles
      };
      setUsers((current) => {
        const exists = current.some((user) => user.id === mapped.id);
        return exists ? current.map((user) => (user.id === mapped.id ? mapped : user)) : [mapped, ...current];
      });
      setAccessList((current) => {
        const filtered = current.filter((item) => !(item.workflowId === workflowId && item.userId === mapped.id));
        return [
          ...filtered,
          {
            workflowId,
            userId: mapped.id,
            userName: mapped.name,
            userEmail: mapped.email,
            accessType
          }
        ];
      });
      setEmail("");
      setAccessType(selectedWorkflow?.accessTypes[0]?.id ?? "");
      setGrantSuccess(`${mapped.email} now has ${selectedWorkflow?.accessTypes.find((item) => item.id === accessType)?.label ?? accessType} access in ${selectedWorkflow?.name ?? workflowId}.`);
    } catch (err) {
      setGrantError(err instanceof Error ? err.message : "Could not grant access");
    } finally {
      setGranting(false);
    }
  }

  const visible = users.filter((user) => user.name.toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase()));
  const workflowAccess = accessList.filter((item) => item.workflowId === workflowId);

  return (
    <div className="space-y-4">
      <div className="surface p-5">
        <p className="section-title">Workflow Access</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Access is segmented per workflow. All other org emails get Watcher access by default.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_220px_auto]">
          <Select value={workflowId} onChange={(event) => setWorkflowId(event.target.value)} aria-label="Workflow">
            {workflows.map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.name}</option>)}
          </Select>
          <Select value={accessType} onChange={(event) => setAccessType(event.target.value)} aria-label="Access type">
            {selectedWorkflow?.accessTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </Select>
          <Button variant="secondary" disabled={!selectedWorkflow} onClick={() => setEmail("")}>Reset</Button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@spxexpress.com"
            aria-label="Organizational email"
          />
          <Button disabled={granting || !email.trim()} onClick={() => void grantAccess()}>
            Grant Access
          </Button>
        </div>
        {grantError ? <p className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{grantError}</p> : null}
        {grantSuccess ? <p className="mt-3 rounded-md bg-success/10 p-3 text-sm text-success-foreground">{grantSuccess}</p> : null}
      </div>

      <div className="surface overflow-x-auto p-2">
        <p className="px-4 py-3 section-title">Users with access to {selectedWorkflow?.name ?? workflowId}</p>
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Access Type</th>
            </tr>
          </thead>
          <tbody>
            {workflowAccess.map((item) => (
              <tr key={`${item.workflowId}-${item.userId}`} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{item.userName}</p>
                  <p className="text-xs text-muted-foreground">{item.userEmail}</p>
                </td>
                <td className="px-4 py-3"><Badge variant="default">{item.accessType}</Badge></td>
              </tr>
            ))}
            {workflowAccess.length === 0 ? (
              <tr><td colSpan={2} className="px-4 py-8 text-center text-sm text-muted-foreground">No explicit access granted yet for this workflow.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search all users by name or email" />
      <div className="surface overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((user) => (
              <tr key={user.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {allRoles.map((role) => {
                      const checked = user.roles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            const nextRoles = checked ? user.roles.filter((item) => item !== role) : [...user.roles, role];
                            void patch(user.id, { roles: nextRoles });
                          }}
                          disabled={savingId === user.id}
                          className="rounded border border-border px-2 py-1 text-xs disabled:opacity-50"
                          title={checked ? `Remove ${role}` : `Add ${role}`}
                        >
                          <Badge variant={checked ? "default" : "muted"}>{role}</Badge>
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.active ? "success" : "muted"}>{user.active ? "Active" : "Deactivated"}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={savingId === user.id}
                    onClick={() => void patch(user.id, { active: !user.active })}
                  >
                    {user.active ? "Deactivate" : "Activate"}
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
