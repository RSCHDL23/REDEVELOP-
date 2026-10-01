import Link from "next/link";
import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { dateOf, minutesOfDay, prettyDate, todayISO } from "@/lib/data/dates";
import { daysUntil } from "@/lib/core/deadlines";
import { formatClock } from "@/lib/core/time";
import { Initials } from "@/components/ui";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const r = repo();
  const [me, requests, deals] = await Promise.all([r.getMe(), r.listRequests(), r.listDeals()]);
  const today = todayISO();
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const toApprove = requests.filter((x) => x.direction === "incoming" && x.status === "pending");
  const upcoming = deals.flatMap((d) => d.milestones.filter((m) => !m.done && daysUntil(today, m.due) >= 0 && daysUntil(today, m.due) <= 4).map((m) => ({ deal: d, m })));
  const agenda = [
    ...requests.filter((x) => dateOf(x.startsAt) === today && x.status !== "cancelled" && x.status !== "declined").map((x) => ({
      key: x.id, minutes: minutesOfDay(x.startsAt), kind: x.direction === "sent" ? "Showing" : "Showing request", title: x.address,
      sub: x.direction === "sent" ? `${x.buyerLabel} · with ${x.otherAgentName}` : `${x.otherAgentName} wants to show it`,
      status: x.status === "approved" ? "Confirmed" : x.direction === "incoming" ? "Approve" : "Pending", tone: x.status === "approved" ? "blue" : "amber", href: "/showings",
    })),
    ...deals.flatMap((d) => d.milestones.filter((m) => m.due === today && !m.done).map((m) => ({
      key: m.id, minutes: 24 * 60, kind: "Deal deadline", title: m.label, sub: d.address, status: "Due today", tone: "amber", href: `/deals/${d.id}`,
    }))),
  ].sort((a, b) => a.minutes - b.minutes);

  return (
    <main className="page">
      <img src="/wordmark-light.png" alt="REschedule" style={{ height: 24, width: "auto", alignSelf: "flex-start" }} />
      <header className="between" style={{ alignItems: "flex-start" }}>
        <div className="stack" style={{ gap: 4 }}>
          <span className="small strong muted">{prettyDate(today, { weekday: "long", month: "long", day: "numeric" })}</span>
          <h1 className="page-title">{greeting}, {me.fullName.split(" ")[0] || "there"}</h1>
        </div>
        <Link href="/profile" aria-label="Your profile"><Initials name={me.fullName} url={me.headshotUrl} /></Link>
      </header>

      <section className="grid-3" aria-label="Needs attention">
        <Link href="/showings" className="card" style={{ background: "var(--amber-soft)", border: 0, color: "var(--ink)" }}>
          <span className="tabular" style={{ fontSize: 26, fontWeight: 900, color: "var(--amber)" }}>{toApprove.length}</span>
          <span className="small strong">Showing requests to approve</span>
        </Link>
        <Link href="/deals" className="card" style={{ color: "var(--ink)" }}>
          <span className="tabular" style={{ fontSize: 26, fontWeight: 900 }}>{upcoming.length}</span>
          <span className="small strong">Deal deadlines in 4 days</span>
        </Link>
        <Link href="/deals" className="card" style={{ color: "var(--ink)" }}>
          <span className="tabular" style={{ fontSize: 26, fontWeight: 900 }}>{deals.length}</span>
          <span className="small strong">Active deals</span>
        </Link>
      </section>

      <Link href="/tour" className="card dark" style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <span className="avatar" style={{ borderRadius: 12 }} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
        </span>
        <span className="stack" style={{ gap: 2, flex: 1 }}>
          <span className="strong" style={{ color: "#fff" }}>Auto-schedule a tour</span>
          <span className="small muted">One tap fits every home around everyone&apos;s calendar</span>
        </span>
      </Link>

      <section className="stack">
        <h2 className="section-label">Today</h2>
        {agenda.length === 0 && <p className="card small muted">Nothing on the schedule today.</p>}
        {agenda.map((a) => (
          <Link key={a.key} href={a.href} className="card" style={{ flexDirection: "row", gap: 14, color: "var(--ink)" }}>
            <span className="tabular strong" style={{ width: 70, flexShrink: 0 }}>{a.minutes < 24 * 60 ? formatClock(a.minutes) : "All day"}</span>
            <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
              <span className="tiny strong muted" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{a.kind}</span>
              <span className="strong">{a.title}</span>
              <span className="small muted">{a.sub}</span>
            </span>
            <span className={`pill ${a.tone}`} style={{ alignSelf: "flex-start" }}>{a.status}</span>
          </Link>
        ))}
      </section>

      {upcoming.length > 0 && (
        <section className="stack">
          <h2 className="section-label">Coming up</h2>
          <ul className="list">
            {upcoming.map(({ deal, m }) => (
              <li key={m.id}>
                <Link href={`/deals/${deal.id}`} className="between" style={{ color: "var(--ink)" }}>
                  <span className="stack" style={{ gap: 1 }}>
                    <span className="strong">{m.label}</span>
                    <span className="small muted">{deal.address}</span>
                  </span>
                  <span className="pill amber">{daysUntil(today, m.due) === 0 ? "Today" : `${daysUntil(today, m.due)} days`}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
