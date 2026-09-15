import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { assertAllowedEmail, upsertUserForDevLogin } from "@/lib/auth";
import { issueSessionForUser } from "@/lib/auth-session";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  if (!env.authDevMode) {
    return NextResponse.json({ error: "Development login is disabled" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  try {
    const normalized = assertAllowedEmail(email);
    const user = upsertUserForDevLogin({ email: normalized });
    if (!user.active) {
      return NextResponse.json({ error: "This account is deactivated" }, { status: 403 });
    }
    await issueSessionForUser(user);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.warn("dev login rejected", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sign in failed" },
      { status: 400 }
    );
  }
}
