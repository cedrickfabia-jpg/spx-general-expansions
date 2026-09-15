"use client";

import * as React from "react";
import { emptyForm, FORM_FIELDS } from "@/features/hod-approvals/forms/fields";
import type { Hub } from "@/features/hod-approvals/types";
import type { FreeRequest } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

interface RequestFormProps {
  hubs: Hub[];
  initial?: FreeRequest | null;
  onSubmit: (formData: Record<string, unknown>, hub: Hub) => Promise<void>;
  submitLabel?: string;
}

export function RequestForm({ hubs, initial, onSubmit, submitLabel = "Save request" }: RequestFormProps) {
  const [formData, setFormData] = React.useState<Record<string, unknown>>(() => (initial?.formData ?? emptyForm()) as Record<string, unknown>);
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [hubId, setHubId] = React.useState(initial?.hubId ?? "");
  const [watchers, setWatchers] = React.useState((initial?.watcherEmails ?? []).join(", "));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  function setValue(key: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const hub = hubs.find((h) => h.id === hubId);
    if (!hub) {
      setError("Select a hub");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit({ ...formData, title, watcherEmails: watchers.split(",").map((s) => s.trim()).filter(Boolean) }, hub);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="hub">Hub</Label>
          <select
            id="hub"
            value={hubId}
            onChange={(e) => setHubId(e.target.value)}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            required
          >
            <option value="">Select hub</option>
            {hubs.filter((h) => h.active).map((hub) => (
              <option key={hub.id} value={hub.id}>{hub.name} ({hub.code})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FORM_FIELDS.map((field) => {
          const value = String(formData[field.key] ?? "");
          if (field.type === "textarea") {
            return (
              <div key={field.key} className={field.key === "utilization" || field.key === "otherConcerns" ? "sm:col-span-2" : ""}>
                <Label htmlFor={field.key}>{field.label}</Label>
                <textarea
                  id={field.key}
                  value={value}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                  required={field.required}
                />
              </div>
            );
          }
          if (field.type === "select") {
            const options = field.key === "cpoBudgetStatus" ? ["WITHIN_CPO_BUDGET", "ABOVE_CPO_BUDGET"] : (field.options ?? []);
            return (
              <div key={field.key}>
                <Label htmlFor={field.key}>{field.label}</Label>
                <select
                  id={field.key}
                  value={value}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                  required={field.required}
                >
                  <option value="">Select...</option>
                  {options.map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}
                </select>
              </div>
            );
          }
          return (
            <div key={field.key}>
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input id={field.key} value={value} onChange={(e) => setValue(field.key, e.target.value)} required={field.required} />
            </div>
          );
        })}
      </div>

      <div>
        <Label htmlFor="watchers">Watcher emails (comma separated)</Label>
        <Input id="watchers" value={watchers} onChange={(e) => setWatchers(e.target.value)} placeholder="watcher@spxexpress.com" />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={busy}>{submitLabel}</Button>
    </form>
  );
}
