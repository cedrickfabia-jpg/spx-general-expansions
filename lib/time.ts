export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Manila";

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "Not yet";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(new Date(iso));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Not yet";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(iso));
}

export function displayDateOnly(value: string | null | undefined): string {
  if (!value) return "Not specified";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

export function yearInTimezone(iso: string, timeZone = APP_TIMEZONE): number {
  return Number(
    new Intl.DateTimeFormat("en", { timeZone, year: "numeric" }).format(new Date(iso))
  );
}
