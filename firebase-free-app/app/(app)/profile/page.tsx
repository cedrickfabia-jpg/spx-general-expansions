"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { updateUserName, updateUserPreferences } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = React.useState("");
  const [inAppEnabled, setInAppEnabled] = React.useState(true);
  const [emailEnabled, setEmailEnabled] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => { if (user) setName(user.name); }, [user]);

  if (!user) return null;

  async function save() {
    await updateUserName(user!.id, name);
    await updateUserPreferences(user!.id, { inAppEnabled, emailEnabled });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="Profile" description="Your account details and roles." />
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="space-y-3">
          <div><Label htmlFor="email">Email</Label><Input id="email" value={user.email} readOnly /></div>
          <div><Label htmlFor="name">Display name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Roles</Label><p className="text-sm">{user.roles.join(", ")}</p></div>
          <div className="space-y-2">
            <Label>Notification Preferences</Label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={inAppEnabled} onChange={(e) => setInAppEnabled(e.target.checked)} /> In-app notifications</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} /> Email notifications</label>
          </div>
          <Button onClick={save}>Save profile</Button>
          {saved ? <p className="text-sm text-success">Saved</p> : null}
        </div>
      </div>
    </div>
  );
}
