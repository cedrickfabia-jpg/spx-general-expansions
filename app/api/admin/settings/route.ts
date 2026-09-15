import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-session";
import { getSetting, setSetting } from "@/features/hod-approvals/repository";
import { auditLog } from "@/lib/audit";

export async function GET() {
  await requireAdmin();
  return NextResponse.json({
    reminderAfterDays: getSetting("reminderAfterDays", 1),
    reminderEveryDays: getSetting("reminderEveryDays", 1),
    escalationAfterDays: getSetting("escalationAfterDays", 7),
    remindersEnabled: getSetting("remindersEnabled", true)
  });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const settings = {
    reminderAfterDays: Number(body.reminderAfterDays ?? 1),
    reminderEveryDays: Number(body.reminderEveryDays ?? 1),
    escalationAfterDays: Number(body.escalationAfterDays ?? 7),
    remindersEnabled: Boolean(body.remindersEnabled)
  };
  for (const [key, value] of Object.entries(settings)) {
    setSetting(key, value, admin.id);
  }
  auditLog({ actorId: admin.id, action: "NOTIFICATION_SETTINGS_UPDATED", entityType: "app_settings", metadata: settings });
  return NextResponse.json(settings);
}
