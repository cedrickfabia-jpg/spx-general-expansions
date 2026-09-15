import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { upsertUserFromGoogle } from "@/lib/auth";
import { issueSessionForUser } from "@/lib/auth-session";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("oauth_state")?.value;
  cookieStore.delete("oauth_state");
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=state", env.appUrl));
  }
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: env.googleRedirectUri,
        grant_type: "authorization_code"
      })
    });
    if (!tokenResponse.ok) {
      throw new Error(`Google token exchange failed with ${tokenResponse.status}`);
    }
    const tokens = (await tokenResponse.json()) as { access_token: string };
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { authorization: `Bearer ${tokens.access_token}` }
    });
    if (!userInfoResponse.ok) {
      throw new Error(`Google userinfo failed with ${userInfoResponse.status}`);
    }
    const profile = (await userInfoResponse.json()) as {
      sub: string;
      email: string;
      name: string;
      picture?: string;
    };
    const user = upsertUserFromGoogle({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture
    });
    if (!user.active) {
      return NextResponse.redirect(new URL("/login?error=inactive", env.appUrl));
    }
    await issueSessionForUser(user);
    return NextResponse.redirect(new URL("/dashboard", env.appUrl));
  } catch (error) {
    logger.error("google oauth callback failed", error);
    return NextResponse.redirect(new URL("/login?error=oauth", env.appUrl));
  }
}
