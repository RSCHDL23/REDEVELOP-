import Link from "next/link";
import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { dateOf, minutesOfDay, prettyDate, todayISO } from "@/lib/data/dates";
import { daysUntil } from "@/lib/core/deadlines";
import { formatClock } from "@/lib/core/time";
import { Initials } from "@/components/ui";
import { upcomingAnniversaries } from "@/lib/core/remember";
import { tripsFor } from "@/lib/data/requestMessages";
import { TripAlerts } from "@/components/TripAlerts";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const r = repo();
  const [me, requests, deals, clients, shares] = await Promise.all([r.getMe(), r.listRequests(), r.listDeals(), r.listClients(), r.listHomeShares()]);
  const newShares = shares.filter((x) => !x.seen);
  const today = todayISO();
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const toApprove = requests.filter((x) => x.direction === "incoming" && x.status === "pending");
  const upcoming = deals.flatMap((d) => d.milestones.filter((m) => !m.done && daysUntil(today, m.due) >= 0 && daysUntil(today, m.due) <= 4).map((m) => ({ deal: d, m })));
  const agenda = [
    ...requests.filter((x) => dateOf(x.startsAt) === today && x.status !== "cancelled" && x.status !== "declined").map((x) => ({
      key: x.id, minutes: minutesOfDay(x.startsAt), kind: x.direction === "sent" ? "Showing" : "Showing request", title: x.address,
      sub: x.direction === "sent" ? `${x.buyerLabel} · with ${x.otherAgentName}` : `${x.otherAgentName} wants to show it`,
      status: x.status === "approved" ? "Confirmed" : x.direction === "incoming" ? "Approve" : "Pending", tone: x.status === "approved" ? "blue" : "amber",
      href: x.direction === "sent" && x.status === "approved" ? `/showings/${x.id}/visit` : x.direction === "sent" ? "/showings?tab=sent" : "/showings",
    })),
    ...deals.flatMap((d) => d.milestones.filter((m) => m.due === today && !m.done).map((m) => ({
      key: m.id, minutes: 24 * 60, kind: "Deal deadline", title: m.label, sub: d.address, status: "Due today", tone: "amber", href: `/deals/${d.id}`,
    }))),
  ].sort((a, b) => a.minutes - b.minutes);

  return (
    <main className="page">
      <header className="between" style={{ alignItems: "flex-start" }}>
        <div className="stack" style={{ gap: 4 }}>
          <span className="small strong muted">{prettyDate(today, { weekday: "long", month: "long", day: "numeric" })}</span>
          <h1 className="page-title">{greeting}, {me.fullName.split(" ")[0] || "there"}</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link href="/calendar" className="btn" aria-label="Calendar" style={{ width: 44, padding: 0, borderRadius: "50%" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16.5" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>
          </Link>
          <Link href="/profile" aria-label="Your profile"><Initials name={me.fullName} url={me.headshotUrl} /></Link>
        </div>
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

      {me.selfRoles.includes("buyer") && (!me.financing || me.financing.kind === "estimate") && (
        <Link href="/get-ready" className="card accent" style={{ color: "var(--ink)" }}>
          <span className="strong">Get ready to buy</span>
          <span className="small muted">Upload your pre-approval (or proof of funds if you&apos;re paying cash), find a lender, or estimate what you can afford.</span>
        </Link>
      )}
      {me.selfRoles.some((x) => x === "renter" || x === "tenant") && (
        <Link href="/get-ready#naca" className="card" style={{ color: "var(--ink)", background: "#eef7f2", borderColor: "#b9dcc8" }}>
          <span className="strong">Renting? Meet NACA</span>
          <span className="small muted">A nonprofit mortgage with no down payment, no closing costs and no PMI. See if owning could cost about what you pay in rent.</span>
        </Link>
      )}

      <TripAlerts trips={tripsFor(requests, clients, me, today)} />

      {newShares.length > 0 && (
        <Link href="/showings?tab=shared" className="card accent" style={{ color: "var(--ink)" }}>
          <span className="strong">🏠 {newShares.length} home{newShares.length > 1 ? "s" : ""} from your clients</span>
          <span className="small muted">{newShares.slice(0, 2).map((h) => `${h.clientName.split(" ")[0]}: ${h.address.split(",")[0]}`).join(" · ")}</span>
        </Link>
      )}

      <Link href="/tour" className="card dark" style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <span className="avatar" style={{ borderRadius: 12 }} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
        </span>
        <span className="stack" style={{ gap: 2, flex: 1 }}>
          <span className="strong" style={{ color: "#fff" }}>Auto-schedule a tour</span>
          <span className="small muted">One tap fits every home around everyone&apos;s calendar</span>
        </span>
      </Link>

      {(() => {
        const soon = upcomingAnniversaries(clients, today, 7);
        if (!soon.length) return null;
        return (
          <Link href="/remember" className="card" style={{ color: "var(--ink)", background: "#f6effa", borderColor: "#dcc5e8" }}>
            <span className="strong">🎉 REmember: {soon[0].daysAway === 0 ? `${soon[0].client.name}'s home anniversary is today!` : `${soon.length} home anniversar${soon.length > 1 ? "ies" : "y"} this week`}</span>
            <span className="small muted">{soon.map((a) => `${a.client.name} (${a.years} yr)`).join(" · ")}</span>
          </Link>
        );
      })()}

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
