"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function SettingsForm({ initial }: { initial: { reminderAfterDays: number; reminderEveryDays: number; escalationAfterDays: number; remindersEnabled: boolean } }) {
  const [form, setForm] = React.useState(initial);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    setMessage(null);
    setError(null);
    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form)
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not save settings");
      return;
    }
    setForm(result);
    setMessage("Notification settings saved.");
  }

  return (
    <div className="surface max-w-xl p-5">
      <p className="section-title">Reminder &amp; Escalation Settings</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="form-field">
          <Label htmlFor="reminder-after">Reminder after (days)</Label>
          <Input id="reminder-after" type="number" min="1" value={form.reminderAfterDays} onChange={(event) => setForm({ ...form, reminderAfterDays: Number(event.target.value) })} />
        </div>
        <div className="form-field">
          <Label htmlFor="reminder-every">Repeat every (days)</Label>
          <Input id="reminder-every" type="number" min="1" value={form.reminderEveryDays} onChange={(event) => setForm({ ...form, reminderEveryDays: Number(event.target.value) })} />
        </div>
        <div className="form-field">
          <Label htmlFor="escalation">Escalate after (days)</Label>
          <Input id="escalation" type="number" min="1" value={form.escalationAfterDays} onChange={(event) => setForm({ ...form, escalationAfterDays: Number(event.target.value) })} />
        </div>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.remindersEnabled} onChange={(event) => setForm({ ...form, remindersEnabled: event.target.checked })} />
        Enable automated reminders
      </label>
      {message ? <p className="mt-3 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <Button className="mt-4" onClick={() => void save()}>Save Settings</Button>
    </div>
  );
}
