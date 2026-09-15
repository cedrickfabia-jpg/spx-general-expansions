"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

export function WatcherPreferences({ initialValue }: { initialValue: string }) {
  const [value, setValue] = React.useState(initialValue);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    setMessage(null);
    setError(null);
    const response = await fetch("/api/notifications/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ watcherEmailFrequency: value })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "Could not save preference");
      return;
    }
    setMessage("Watcher email preference saved.");
  }

  return (
    <div className="space-y-3">
      <div className="form-field">
        <label htmlFor="watcher-frequency" className="text-xs font-medium text-muted-foreground">
          Watcher Email Frequency
        </label>
        <Select id="watcher-frequency" value={value} onChange={(event) => setValue(event.target.value)}>
          <option value="IMMEDIATE">Immediate updates</option>
          <option value="OFF">Off (in-app notifications only)</option>
        </Select>
      </div>
      <Button variant="secondary" onClick={() => void save()}>Save Preference</Button>
      {message ? <p className="text-sm text-success">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
