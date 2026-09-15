"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  emptyForm,
  ALLOWED_DOCUMENT_TYPES,
  FORM_FIELDS,
  formFromRow,
  OPTIONAL_DOCUMENT_TYPES,
  REQUIRED_DOCUMENT_TYPES
} from "@/features/hod-approvals/forms/fields";
import type { HODApprovalFormData } from "@/features/hod-approvals/types";

export function RequestForm({
  initial,
  requestId,
  initialDocuments = []
}: {
  initial?: HODApprovalFormData;
  requestId?: string;
  initialDocuments?: string[];
}) {
  const router = useRouter();
  const [form, setForm] = React.useState<HODApprovalFormData>(() =>
    initial ? formFromRow(initial as unknown as Record<string, unknown>) : emptyForm()
  );
  const [watcherText, setWatcherText] = React.useState(
    initial ? initial.watcherEmails.join(", ") : ""
  );
  const [files, setFiles] = React.useState<Record<string, File | null>>(
    Object.fromEntries(ALLOWED_DOCUMENT_TYPES.map((type) => [type, null]))
  );
  const [uploaded, setUploaded] = React.useState<string[]>(initialDocuments);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  function update<K extends keyof HODApprovalFormData>(key: K, value: HODApprovalFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateWatchers(value: string) {
    setWatcherText(value);
    setForm((current) => ({
      ...current,
      watcherEmails: value
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    }));
  }

  async function save(): Promise<string> {
    setError(null);
    const url = requestId ? `/api/approvals/${requestId}` : "/api/approvals";
    const method = requestId ? "PATCH" : "POST";
    const body = requestId
      ? { action: "updateDraft", data: form }
      : { ...form };
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error ?? "Could not save the request");
    }
    return result.id ?? requestId ?? "";
  }

  async function uploadPendingFiles(id: string) {
    for (const type of ALLOWED_DOCUMENT_TYPES) {
      const file = files[type];
      if (!file || uploaded.includes(type)) continue;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentName", type);
      const response = await fetch(`/api/approvals/${id}/documents`, {
        method: "POST",
        body: formData
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error ?? `Could not upload ${type}`);
      }
      setUploaded((current) => [...current, type]);
      setFiles((current) => ({ ...current, [type]: null }));
    }
  }

  async function saveAndContinue(toReview: boolean) {
    if (toReview) {
      const missing = REQUIRED_DOCUMENT_TYPES.filter(
        (type) => !uploaded.includes(type) && !files[type]
      );
      if (missing.length > 0) {
        setError(`Upload the required files before review: ${missing.join(", ")}`);
        return;
      }
    }
    setBusy(toReview ? "review" : "save");
    try {
      const id = await save();
      await uploadPendingFiles(id);
      router.push(toReview ? `/approvals/${id}/review` : `/approvals/${id}/edit`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the request");
      setBusy(null);
    }
  }

  async function deleteDraft() {
    if (!requestId) return;
    setBusy("delete");
    setError(null);
    const response = await fetch(`/api/approvals/${requestId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "cancelDraft", reason: "Draft deleted by requester" })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "Could not delete draft");
      setBusy(null);
      return;
    }
    router.push("/approvals/my-requests");
    router.refresh();
  }

  const sections = Array.from(new Set(FORM_FIELDS.map((field) => field.section)));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-6">
        {sections.map((section) => (
          <div key={section} className="surface p-5">
            <p className="section-title">{section}</p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FORM_FIELDS.filter((item) => item.section === section).map((item) => (
                <div key={item.key} className={cn("form-field", item.type === "textarea" && "sm:col-span-2")}>
                  <Label htmlFor={item.key}>
                    {item.label} {item.required ? <span className="text-destructive">*</span> : null}
                  </Label>
                  {item.key === "cpoBudgetStatus" ? (
                    <Select
                      id={item.key}
                      value={String(form.cpoBudgetStatus ?? "")}
                      onChange={(event) => update("cpoBudgetStatus", event.target.value as HODApprovalFormData["cpoBudgetStatus"])}
                    >
                      <option value="">Select CPO Budget Status</option>
                      <option value="WITHIN_CPO_BUDGET">Within CPO Budget</option>
                      <option value="ABOVE_CPO_BUDGET">Above CPO Budget</option>
                    </Select>
                  ) : item.key === "region" ? (
                    <Input
                      id={item.key}
                      value={String(form[item.key] ?? "")}
                      onChange={(event) => update("region", event.target.value.toUpperCase())}
                      placeholder={item.placeholder}
                    />
                  ) : item.options ? (
                    <Select
                      id={item.key}
                      value={String(form[item.key] ?? "")}
                      onChange={(event) => update(item.key, event.target.value)}
                    >
                      <option value="">Select {item.label.toLowerCase()}</option>
                      {item.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  ) : item.type === "textarea" ? (
                    <Textarea
                      id={item.key}
                      value={String(form[item.key] ?? "")}
                      onChange={(event) => update(item.key, event.target.value)}
                      placeholder={item.placeholder}
                    />
                  ) : (
                    <Input
                      id={item.key}
                      value={String(form[item.key] ?? "")}
                      onChange={(event) => update(item.key, event.target.value)}
                      placeholder={item.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="surface p-5">
          <p className="section-title">Watchers</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Comma-separated @spxexpress.com emails. Watchers receive email notifications and can view the request after login.
          </p>
          <div className="mt-3 form-field">
            <Label htmlFor="watchers">Watcher emails <span className="text-destructive">*</span></Label>
            <Textarea
              id="watchers"
              value={watcherText}
              onChange={(event) => updateWatchers(event.target.value)}
              placeholder="watcher1@spxexpress.com, watcher2@spxexpress.com"
            />
          </div>
        </div>

        <div className="surface p-5">
          <p className="section-title">Required Uploads</p>
          <p className="mt-1 text-sm text-muted-foreground">
            FF Approval, CPO Table, and Hub Location Scoring are required before submission.
          </p>
          <div className="mt-4 grid gap-4">
            {REQUIRED_DOCUMENT_TYPES.map((type) => {
              const isUploaded = uploaded.includes(type);
              const selectedFile = files[type];
              return (
                <div key={`${type}-${isUploaded ? "uploaded" : "pending"}`} className="grid gap-2 sm:grid-cols-[1fr_1fr] sm:items-center">
                  <div>
                    <Label htmlFor={`upload-${type}`}>{type} <span className="text-destructive">*</span></Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isUploaded
                        ? "Uploaded"
                        : selectedFile
                          ? `Ready: ${selectedFile.name}`
                          : "Required"}
                    </p>
                  </div>
                  <Input
                    id={`upload-${type}`}
                    type="file"
                    accept=".pdf"
                    onChange={(event) =>
                      setFiles((current) => ({ ...current, [type]: event.target.files?.[0] ?? null }))
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface p-5">
          <p className="section-title">Optional Uploads</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional file 1, Optional file 2, and Optional file 3 are optional. PDF files only.
          </p>
          <div className="mt-4 grid gap-4">
            {OPTIONAL_DOCUMENT_TYPES.map((type) => {
              const isUploaded = uploaded.includes(type);
              const selectedFile = files[type];
              return (
                <div key={`${type}-${isUploaded ? "uploaded" : "pending"}`} className="grid gap-2 sm:grid-cols-[1fr_1fr] sm:items-center">
                  <div>
                    <Label htmlFor={`upload-${type}`}>{type}</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isUploaded ? "Uploaded" : selectedFile ? `Ready: ${selectedFile.name}` : "Optional"}
                    </p>
                  </div>
                  <Input
                    id={`upload-${type}`}
                    type="file"
                    accept=".pdf"
                    onChange={(event) =>
                      setFiles((current) => ({ ...current, [type]: event.target.files?.[0] ?? null }))
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? <p className="mb-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-col gap-2">
              <Button onClick={() => void saveAndContinue(true)} disabled={busy !== null}>
                <Send className="h-4 w-4" aria-hidden="true" />
                Save &amp; Review
              </Button>
              <Button variant="secondary" onClick={() => void saveAndContinue(false)} disabled={busy !== null}>
                <Save className="h-4 w-4" aria-hidden="true" />
                Save Draft
              </Button>
              {requestId ? (
                <ConfirmButton
                  label="Delete Draft"
                  description="This draft will be cancelled. This action cannot be undone."
                  confirmLabel="Delete Draft"
                  onConfirm={deleteDraft}
                  variant="outline"
                  disabled={busy !== null}
                />
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
