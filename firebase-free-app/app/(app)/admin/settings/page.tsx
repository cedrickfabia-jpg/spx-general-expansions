"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { getSettings, saveSettings, type AppSettings } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LoadingState } from "@/components/loading-state";
import { AccessDenied } from "@/components/access-denied";

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = React.useState<AppSettings | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => { getSettings().then(setSettings).catch(console.error); }, []);

  if (!user?.roles.includes("ADMINISTRATOR")) return <AccessDenied message="Administrator access required." />;
  if (!settings) return <LoadingState />;

  async function save() {
    await saveSettings(settings!);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Application configuration." />
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="space-y-4">
          <div><Label htmlFor="app-name">App Name</Label><Input id="app-name" value={settings.appName} onChange={(e) => setSettings({ ...settings, appName: e.target.value })} /></div>
          <div><Label htmlFor="app-url">App URL</Label><Input id="app-url" value={settings.appUrl} onChange={(e) => setSettings({ ...settings, appUrl: e.target.value })} /></div>
          <div><Label htmlFor="retention-months">Archive After (months)</Label><Input id="retention-months" type="number" min={1} value={settings.retentionMonths} onChange={(e) => setSettings({ ...settings, retentionMonths: Number(e.target.value) })} /></div>
          <Button onClick={save}>{saved ? "Saved" : "Save settings"}</Button>
        </div>
      </div>
    </div>
  );
}
