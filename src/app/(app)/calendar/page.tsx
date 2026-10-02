import Link from "next/link";
import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { dateOf, minutesOfDay, prettyDate, todayISO } from "@/lib/data/dates";
import { addDays, holidaysWithNames, isBankingDay, isBusinessDay, type HolidayInfo } from "@/lib/core/deadlines";
import { upcomingAnniversaries } from "@/lib/core/remember";
import { formatClock } from "@/lib/core/time";
import { BackLink } from "@/components/ui";

export const metadata: Metadata = { title: "Calendar" };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Item = { kind: "showing" | "deal" | "anniversary"; time?: number; title: string; sub: string; href: string };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; day?: string }> }) {
  const sp = await searchParams;
  const today = todayISO();
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(sp.day ?? "") ? sp.day! : month === today.slice(0, 7) ? today : first;
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);

  const r = repo();
  const [requests, deals, clients] = await Promise.all([r.listRequests(), r.listDeals(), r.listClients()]);
  const holidays = new Map<string, HolidayInfo>([...holidaysWithNames(y - 1), ...holidaysWithNames(y), ...holidaysWithNames(y + 1)].map((h) => [h.date, h]));
  const items = new Map<string, Item[]>();
  const add = (d: string, it: Item) => items.set(d, [...(items.get(d) ?? []), it]);
  for (const x of requests) {
    if (x.status === "cancelled" || x.status === "declined") continue;
    add(dateOf(x.startsAt), { kind: "showing", time: minutesOfDay(x.startsAt), title: x.address, sub: `${x.direction === "sent" ? "Showing" : "Showing request"} · ${x.status === "approved" ? "Confirmed" : x.status === "countered" ? "New time proposed" : "Pending"}`, href: x.direction === "sent" ? "/showings?tab=sent" : "/showings" });
  }
  for (const d of deals) for (const ms of d.milestones) if (!ms.done) add(ms.due, { kind: "deal", title: ms.label, sub: d.address, href: `/deals/${d.id}` });
  for (const a of upcomingAnniversaries(clients, first, 400)) add(a.date, { kind: "anniversary", title: `${a.client.name}'s home anniversary`, sub: `${a.years} year${a.years > 1 ? "s" : ""} · REmember`, href: "/remember" });

  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i))];
  const dayHoliday = holidays.get(selected);
  const actualHoliday = [...holidays.values()].find((h) => h.actual === selected);
  const dayItems = (items.get(selected) ?? []).sort((a, b) => (a.time ?? 9999) - (b.time ?? 9999));
  const monthHolidays = [...holidays.values()].filter((h) => h.date.startsWith(month) || h.actual?.startsWith(month));
  const dot = { showing: "var(--blue-deep)", deal: "#b98a00", anniversary: "#8e44ad" } as const;

  return (
    <main className="page">
      <BackLink href="/today" label="Today" />
      <header className="between">
        <Link href={`/calendar?month=${prev}`} className="btn" aria-label="Previous month">‹</Link>
        <h1 className="page-title" style={{ fontSize: 22 }}>{prettyDate(first, { month: "long", year: "numeric" })}</h1>
        <Link href={`/calendar?month=${next}`} className="btn" aria-label="Next month">›</Link>
      </header>

      <div className="card" style={{ padding: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }} role="grid" aria-label="Month">
          {WEEKDAYS.map((w) => <span key={w} className="tiny strong muted" style={{ textAlign: "center", padding: "4px 0" }}>{w}</span>)}
          {cells.map((d, i) => {
            if (!d) return <span key={`e${i}`} />;
            const h = holidays.get(d);
            const weekend = !isBusinessDay(d) && !h;
            const its = items.get(d) ?? [];
            const kinds = [...new Set(its.map((x) => x.kind))];
            return (
              <Link
                key={d}
                href={`/calendar?month=${month}&day=${d}`}
                aria-current={d === selected ? "date" : undefined}
                aria-label={`${prettyDate(d, { weekday: "long", month: "long", day: "numeric" })}${h ? `, ${h.name}` : ""}${its.length ? `, ${its.length} item${its.length > 1 ? "s" : ""}` : ""}`}
                style={{
                  minHeight: 54, borderRadius: 10, padding: "4px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  color: "var(--ink)", textDecoration: "none",
                  background: d === selected ? "var(--ink)" : h ? "var(--red-soft)" : weekend ? "var(--ground)" : "transparent",
                  border: d === today ? "2px solid var(--blue)" : "2px solid transparent",
                }}
              >
                <span className="small strong tabular" style={{ color: d === selected ? "#fff" : h ? "var(--red)" : weekend ? "var(--muted)" : "var(--ink)" }}>{Number(d.slice(8))}</span>
                {h && <span style={{ fontSize: 8, fontWeight: 900, color: d === selected ? "#fff" : "var(--red)", lineHeight: 1 }}>HOLIDAY</span>}
                <span className="row" style={{ gap: 2 }}>{kinds.map((k) => <span key={k} className="dot" style={{ width: 6, height: 6, background: dot[k] }} />)}</span>
              </Link>
            );
          })}
        </div>
        <div className="row tiny" style={{ flexWrap: "wrap", gap: 10, padding: "8px 4px 0" }}>
          <span className="row" style={{ gap: 4 }}><span className="dot" style={{ background: "var(--red)" }} /> Federal holiday</span>
          <span className="row" style={{ gap: 4 }}><span className="dot" style={{ background: dot.showing }} /> Showing</span>
          <span className="row" style={{ gap: 4 }}><span className="dot" style={{ background: dot.deal }} /> Deal date</span>
          <span className="row" style={{ gap: 4 }}><span className="dot" style={{ background: dot.anniversary }} /> REmember</span>
        </div>
      </div>

      <section className="card">
        <span className="strong">{prettyDate(selected, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
        <div className="chips">
          <span className={`pill ${isBusinessDay(selected) ? "blue" : "red"}`}>{isBusinessDay(selected) ? "Business day" : "Not a business day"}</span>
          <span className={`pill ${isBankingDay(selected) ? "blue" : "red"}`}>{isBankingDay(selected) ? "Banks open" : "Banks closed"}</span>
        </div>
        {dayHoliday && <span className="small"><span className="strong" style={{ color: "var(--red)" }}>{dayHoliday.name}</span>{!dayHoliday.banksClosed ? " · Federal offices closed; Federal Reserve banks stay open (holiday falls on Saturday)" : ""}</span>}
        {actualHoliday && <span className="small muted">{actualHoliday.name.replace(" (observed)", "")} falls today; it&apos;s observed {prettyDate(actualHoliday.date)}.</span>}
        {dayItems.length === 0 && <span className="small muted">Nothing scheduled.</span>}
        {dayItems.map((it, k) => (
          <Link key={k} href={it.href} className="row" style={{ color: "var(--ink)", gap: 10 }}>
            <span className="dot" style={{ background: dot[it.kind] }} />
            <span className="tabular small strong" style={{ width: 64 }}>{it.time !== undefined ? formatClock(it.time) : "All day"}</span>
            <span className="stack" style={{ gap: 0 }}><span className="strong small">{it.title}</span><span className="tiny muted">{it.sub}</span></span>
          </Link>
        ))}
      </section>

      {monthHolidays.length > 0 && (
        <section className="stack">
          <h2 className="section-label">Holidays this month</h2>
          <ul className="list">
            {monthHolidays.map((h) => (
              <li key={h.date} className="between small">
                <span className="strong">{h.name}</span>
                <span className="muted tabular">{prettyDate(h.date)}{h.banksClosed ? "" : " · banks open"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="tiny muted" style={{ margin: 0 }}>Business days skip weekends and federal holidays; contract deadlines count these. Federal Reserve banks close on federal holidays, except they stay open the Friday before a Saturday holiday. Always confirm deadlines with your contract.</p>
    </main>
  );
}
