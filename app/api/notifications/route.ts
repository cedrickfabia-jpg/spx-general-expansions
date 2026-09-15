import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
  const result = listNotifications(user.id, page);
  return NextResponse.json({ ...result, unread: getUnreadNotificationCount(user.id) });
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (body?.action === "markAllRead") {
    markAllNotificationsRead(user.id);
    return NextResponse.json({ ok: true });
  }
  if (typeof body?.id === "string") {
    markNotificationRead(body.id, user.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
