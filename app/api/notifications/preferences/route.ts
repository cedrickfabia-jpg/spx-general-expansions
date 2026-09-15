import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { setSetting } from "@/features/hod-approvals/repository";

export async function PUT(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const value = body?.watcherEmailFrequency;
  if (value !== "IMMEDIATE" && value !== "OFF") {
    return NextResponse.json({ error: "Invalid watcher email frequency" }, { status: 400 });
  }
  setSetting(`watcherEmailFrequency:${user.id}`, value, user.id);
  return NextResponse.json({ watcherEmailFrequency: value });
}
