import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export async function GET() {
  if (!env.googleClientId || !env.googleClientSecret) {
    return NextResponse.redirect(new URL("/login", env.appUrl));
  }
  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600
  });
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account"
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
