"use client";

import * as React from "react";
import { emptyForm, FORM_FIELDS, OPTIONAL_DOCUMENT_TYPES, REQUIRED_DOCUMENT_TYPES } from "@/features/hod-approvals/forms/fields";
import type { Hub } from "@/features/hod-approvals/types";
import { saveHub, type FreeRequest } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

interface RequestFormProps {
  hubs: Hub[];
  initial?: FreeRequest | null;
  onSubmit: (formData: Record<string, unknown>, hub: Hub) => Promise<void>;
  submitLabel?: string;
  onSaveAndReview?: (formData: Record<string, unknown>, hub: Hub) => Promise<void>;
  onSaveAndSubmit?: (formData: Record<string, unknown>, hub: Hub, files: Record<string, File | null>) => Promise<string>;
}

function FieldLabel({ label, required }: { label: string; required: boolean }) {
  return (
    <Label>
      {label}
      {required ? <span className="text-red-600"> *</span> : null}
    </Label>
  );
}

export function RequestForm({ hubs, initial, onSubmit, submitLabel = "Save Draft", onSaveAndReview, onSaveAndSubmit }: RequestFormProps) {
  const [formData, setFormData] = React.useState<Record<string, unknown>>(() => (initial?.formData ?? emptyForm()) as Record<string, unknown>);
  const [watchers, setWatchers] = React.useState((initial?.watcherEmails ?? []).join(", "));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [files, setFiles] = React.useState<Record<string, File | null>>(Object.fromEntries([...REQUIRED_DOCUMENT_TYPES, ...OPTIONAL_DOCUMENT_TYPES].map((type) => [type, null])));

  function setValue(key: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function resolveHub(): Promise<Hub> {
    const region = String(formData.region ?? "").trim().toUpperCase();
    const hubName = String(formData.hubName ?? "").trim();
    let hub = hubs.find((h) => h.name.toUpperCase() === hubName.toUpperCase()) ?? hubs.find((h) => h.code.toUpperCase() === region) ?? hubs.find((h) => h.active) ?? hubs[0];
    if (!hub) {
      const id = await saveHub({ name: hubName || region || "New Hub", code: region || "NEW", active: true });
      hub = { id, name: hubName || region || "New Hub", code: region || "NEW", active: true, createdAt: "", updatedAt: "" };
    }
    return hub;
  }

  function validateFiles(): string | null {
    for (const [type, file] of Object.entries(files) as Array<[string, File | null]>) {
      const isRequired = (REQUIRED_DOCUMENT_TYPES as readonly string[]).includes(type);
      if (isRequired && !file) return `Required document missing: ${type}`;
      if (file && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        return `${type} must be a PDF file.`;
      }
    }
    return null;
  }

  function missingRequiredField(): string | null {
    for (const field of FORM_FIELDS) {
      if (!field.required) continue;
      const value = String(formData[field.key] ?? "").trim();
      if (!value) return field.label;
    }
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const hub = await resolveHub();
      const title = `HOD Approval - ${String(formData.region ?? "").trim().toUpperCase()}`;
      await onSubmit({ ...formData, title, watcherEmails: watchers.split(",").map((s) => s.trim()).filter(Boolean) }, hub);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {[...new Set(FORM_FIELDS.map((field) => field.section))].map((section) => (
        <section key={section} className="rounded-lg border border-border bg-white p-5">
          <h3 className="border-b border-border pb-2 text-sm font-semibold uppercase tracking-wide text-primary">{section}</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FORM_FIELDS.filter((field) => field.section === section).map((field) => {
              const value = String(formData[field.key] ?? "");
              if (field.type === "textarea") {
                return (
                  <div key={field.key} className="sm:col-span-2">
                    <FieldLabel label={field.label} required={field.required} />
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
                    <FieldLabel label={field.label} required={field.required} />
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
                  <FieldLabel label={field.label} required={field.required} />
                  <Input id={field.key} value={value} onChange={(e) => setValue(field.key, e.target.value)} required={field.required} />
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div>
        <Label htmlFor="watchers">Watcher emails (comma separated)</Label>
        <Input id="watchers" value={watchers} onChange={(e) => setWatchers(e.target.value)} placeholder="watcher@spxexpress.com" />
      </div>

      <div className="rounded-md border border-border bg-muted/40 p-4">
        <h3 className="text-sm font-semibold">Documents</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[...REQUIRED_DOCUMENT_TYPES, ...OPTIONAL_DOCUMENT_TYPES].map((type) => (
            <div key={type}>
              <Label htmlFor={`file-${type}`}>{type}{(REQUIRED_DOCUMENT_TYPES as readonly string[]).includes(type) ? <span className="text-red-600"> *</span> : null}</Label>
              <Input
                id={`file-${type}`}
                type="file"
                accept="application/pdf,.pdf"
                required={(REQUIRED_DOCUMENT_TYPES as readonly string[]).includes(type)}
                onChange={(e) => setFiles((prev) => ({ ...prev, [type]: e.target.files?.[0] ?? null }))}
              />
            </div>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        {onSaveAndSubmit ? (
          <Button type="button" disabled={busy} onClick={async () => {
            const missingField = missingRequiredField();
            if (missingField) {
              setError(`Approval request will not push through. Missing required field: ${missingField}`);
              return;
            }
            const validationError = validateFiles();
            if (validationError) { setError(validationError); return; }
            setBusy(true);
            setError("");
            try {
              const hub = await resolveHub();
              const title = `HOD Approval - ${String(formData.region ?? "").trim().toUpperCase()}`;
              const id = await onSaveAndSubmit({ ...formData, title, watcherEmails: watchers.split(",").map((s) => s.trim()).filter(Boolean) }, hub, files);
              window.location.href = `/request?id=${id}`;
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to submit request");
              setBusy(false);
            }
          }}>Submit for Approval</Button>
        ) : null}
        {onSaveAndReview ? (
          <Button type="button" disabled={busy} onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const hub = await resolveHub();
              const title = `HOD Approval - ${String(formData.region ?? "").trim().toUpperCase()}`;
              await onSaveAndReview({ ...formData, title, watcherEmails: watchers.split(",").map((s) => s.trim()).filter(Boolean) }, hub);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to save request");
              setBusy(false);
            }
          }}>Save &amp; Review</Button>
        ) : null}
        <Button type="submit" variant="secondary" disabled={busy}>{submitLabel}</Button>
      </div>
    </form>
  );
}
