import fs from "node:fs";
import path from "node:path";

function loadDotEnv(): void {
  if (process.env.APP_NAME) return;
  try {
    const file = path.join(process.cwd(), ".env");
    const content = fs.readFileSync(file, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env is optional in environments that provide real configuration
  }
}

loadDotEnv();

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const env = {
  appName: process.env.APP_NAME ?? "General Expansions",
  appUrl: process.env.APP_URL ?? "https://www.generalexpansions.com",
  appTimezone: process.env.APP_TIMEZONE ?? "Asia/Manila",
  orgDomain: process.env.ORG_DOMAIN ?? "spxexpress.com",
  sessionSecret: process.env.SESSION_SECRET ?? "local-development-session-secret-change-me",
  sessionCookie: process.env.SESSION_COOKIE ?? "gex_session",
  sessionMaxAgeDays: Number(process.env.SESSION_MAX_AGE_DAYS ?? 7),
  authDevMode: bool(process.env.AUTH_DEV_MODE, !googleConfigured),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? `${process.env.APP_URL ?? "https://www.generalexpansions.com"}/api/auth/callback`,
  databaseProvider: process.env.DATABASE_PROVIDER ?? "sqlite",
  databaseUrl: process.env.DATABASE_URL ?? "file:./data/app.db",
  storageProvider: process.env.STORAGE_PROVIDER ?? "local",
  storagePath: process.env.STORAGE_PATH ?? "./data/storage",
  maxFileSizeBytes: Number(process.env.MAX_FILE_SIZE_MB ?? 25) * 1024 * 1024,
  emailProvider: process.env.EMAIL_PROVIDER ?? "console",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "General Expansions <no-reply@spxexpress.com>",
  httpMailWebhookUrl: process.env.HTTP_MAIL_WEBHOOK_URL ?? "",
  reminderAfterDays: Number(process.env.REMINDER_AFTER_DAYS ?? 1),
  reminderEveryDays: Number(process.env.REMINDER_EVERY_DAYS ?? 1),
  escalationAfterDays: Number(process.env.ESCALATION_AFTER_DAYS ?? 7),
  remindersEnabled: bool(process.env.REMINDERS_ENABLED, true)
};
