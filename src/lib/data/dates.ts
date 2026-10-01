/** Date helpers that always use the app's home time zone. */
import { addDays, type ISODate } from "@/lib/core/deadlines";

export const APP_TIME_ZONE = "America/Chicago";

export function todayISO(tz = APP_TIME_ZONE): ISODate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** The next Saturday on or after today. */
export function nextSaturday(from: ISODate = todayISO()): ISODate {
  const day = new Date(`${from}T12:00:00Z`).getUTCDay();
  return addDays(from, (6 - day + 7) % 7 || 7);
}

export function weekdayOf(d: ISODate): number {
  return new Date(`${d}T12:00:00Z`).getUTCDay();
}

export function prettyDate(d: ISODate, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }): string {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
}

/** Minutes after midnight in the app time zone for an ISO timestamp. */
export function minutesOfDay(iso: string, tz = APP_TIME_ZONE): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** ISO date (YYYY-MM-DD) in the app time zone for an ISO timestamp. */
export function dateOf(iso: string, tz = APP_TIME_ZONE): ISODate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** Build an ISO timestamp for a local date and minutes after midnight in the app time zone. */
export function toTimestamp(date: ISODate, minutes: number, tz = APP_TIME_ZONE): string {
  // Find the zone's UTC offset on that date, then build the instant.
  const guess = new Date(`${date}T12:00:00Z`);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" })
      .formatToParts(guess)
      .map((x) => [x.type, Number(x.value)]),
  );
  const localAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const offsetMin = Math.round((localAsUtc - guess.getTime()) / 60000);
  const utc = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), 0, minutes) - offsetMin * 60000;
  return new Date(utc).toISOString();
}
