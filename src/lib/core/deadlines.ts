/**
 * Contract deadline math. Dates are plain "YYYY-MM-DD" strings so time zones
 * never shift a deadline by a day.
 *
 * Business days skip Saturdays, Sundays and U.S. federal holidays. Check your
 * contract's definition: some contracts count state holidays too, and the
 * attorney or agent should always confirm deadlines.
 */

export type ISODate = string;

function parse(d: ISODate): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function fmt(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month, 1 + offset + (n - 1) * 7));
}

function lastWeekday(year: number, month: number, weekday: number): Date {
  const last = new Date(Date.UTC(year, month + 1, 0));
  const offset = (last.getUTCDay() - weekday + 7) % 7;
  return new Date(Date.UTC(year, month + 1, -offset));
}

/** Observed date: Saturday holidays move to Friday, Sunday holidays to Monday. */
function observed(d: Date): Date {
  const day = d.getUTCDay();
  if (day === 6) return new Date(d.getTime() - 86400000);
  if (day === 0) return new Date(d.getTime() + 86400000);
  return d;
}

export function federalHolidays(year: number): Set<ISODate> {
  const fixed = [
    [0, 1], // New Year's Day
    [5, 19], // Juneteenth
    [6, 4], // Independence Day
    [10, 11], // Veterans Day
    [11, 25], // Christmas
  ].map(([m, d]) => observed(new Date(Date.UTC(year, m, d))));
  const floating = [
    nthWeekday(year, 0, 1, 3), // MLK Day
    nthWeekday(year, 1, 1, 3), // Washington's Birthday
    lastWeekday(year, 4, 1), // Memorial Day
    nthWeekday(year, 8, 1, 1), // Labor Day
    nthWeekday(year, 9, 1, 2), // Columbus Day
    nthWeekday(year, 10, 4, 4), // Thanksgiving
  ];
  return new Set([...fixed, ...floating].map(fmt));
}

export function isBusinessDay(d: ISODate): boolean {
  const date = parse(d);
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  return !federalHolidays(date.getUTCFullYear()).has(d);
}

export function addDays(d: ISODate, n: number): ISODate {
  return fmt(new Date(parse(d).getTime() + n * 86400000));
}

/** Counts forward n business days, not counting the start date. */
export function addBusinessDays(d: ISODate, n: number): ISODate {
  let cur = d;
  let left = n;
  while (left > 0) {
    cur = addDays(cur, 1);
    if (isBusinessDay(cur)) left -= 1;
  }
  return cur;
}

export interface ContractTerms {
  acceptance: ISODate;
  closing: ISODate;
  earnestMoneyBusinessDays?: number;
  attorneyReviewBusinessDays?: number;
  inspectionBusinessDays?: number;
  /** Calendar days for the mortgage contingency; omit for cash. */
  mortgageContingencyDays?: number;
  hasHoa?: boolean;
}

export interface Milestone {
  kind: string;
  label: string;
  due: ISODate;
}

export function contractMilestones(t: ContractTerms): Milestone[] {
  const list: Milestone[] = [
    { kind: "accepted", label: "Contract accepted", due: t.acceptance },
    { kind: "earnest_money", label: "Earnest money due", due: addBusinessDays(t.acceptance, t.earnestMoneyBusinessDays ?? 3) },
    { kind: "attorney_review", label: "Attorney review ends", due: addBusinessDays(t.acceptance, t.attorneyReviewBusinessDays ?? 5) },
    { kind: "inspection", label: "Inspection period ends", due: addBusinessDays(t.acceptance, t.inspectionBusinessDays ?? 5) },
  ];
  if (t.hasHoa) list.push({ kind: "hoa_docs", label: "HOA documents reviewed", due: addBusinessDays(t.acceptance, 10) });
  if (t.mortgageContingencyDays) list.push({ kind: "mortgage", label: "Mortgage commitment", due: addDays(t.acceptance, t.mortgageContingencyDays) });
  list.push({ kind: "walkthrough", label: "Final walkthrough", due: addDays(t.closing, -1) });
  list.push({ kind: "closing", label: "Closing", due: t.closing });
  return list.sort((a, b) => a.due.localeCompare(b.due));
}

/** Whole days from `from` to `to` (negative if past). */
export function daysUntil(from: ISODate, to: ISODate): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86400000);
}

export interface HolidayInfo {
  /** The day it's observed for federal offices (and for business-day counting). */
  date: ISODate;
  name: string;
  /** The calendar date, if different (e.g. July 4 on a Saturday is observed Friday July 3). */
  actual?: ISODate;
  /** Federal Reserve banks close. They don't close on a Friday for a Saturday holiday. */
  banksClosed: boolean;
}

/** Federal holidays with names, plus whether Federal Reserve banks are closed that day. */
export function holidaysWithNames(year: number): HolidayInfo[] {
  const fixed: [number, number, string][] = [
    [0, 1, "New Year's Day"],
    [5, 19, "Juneteenth"],
    [6, 4, "Independence Day"],
    [10, 11, "Veterans Day"],
    [11, 25, "Christmas Day"],
  ];
  const out: HolidayInfo[] = fixed.map(([m, d, name]) => {
    const actual = new Date(Date.UTC(year, m, d));
    const obs = observed(actual);
    const moved = obs.getTime() !== actual.getTime();
    // Banks: Sunday holidays move to Monday; Saturday holidays aren't moved (banks stay open Friday).
    const banksClosed = actual.getUTCDay() !== 6;
    return { date: fmt(obs), name: moved ? `${name} (observed)` : name, actual: moved ? fmt(actual) : undefined, banksClosed };
  });
  const floating: [Date, string][] = [
    [nthWeekday(year, 0, 1, 3), "Martin Luther King Jr. Day"],
    [nthWeekday(year, 1, 1, 3), "Washington's Birthday (Presidents' Day)"],
    [lastWeekday(year, 4, 1), "Memorial Day"],
    [nthWeekday(year, 8, 1, 1), "Labor Day"],
    [nthWeekday(year, 9, 1, 2), "Columbus Day / Indigenous Peoples' Day"],
    [nthWeekday(year, 10, 4, 4), "Thanksgiving Day"],
  ];
  out.push(...floating.map(([d, name]) => ({ date: fmt(d), name, banksClosed: true })));
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Banking day: a weekday when Federal Reserve banks are open. */
export function isBankingDay(d: ISODate): boolean {
  const day = parse(d).getUTCDay();
  if (day === 0 || day === 6) return false;
  const year = Number(d.slice(0, 4));
  return !holidaysWithNames(year).some((h) => h.date === d && h.banksClosed);
}
