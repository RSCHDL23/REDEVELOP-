import Link from "next/link";
import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { dateOf, minutesOfDay, prettyDate } from "@/lib/data/dates";
import { formatClock } from "@/lib/core/time";
import { Empty } from "@/components/ui";
import { cancel, decide } from "./actions";

export const metadata: Metadata = { title: "Showings" };

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Waiting", tone: "amber" },
  approved: { label: "Confirmed", tone: "blue" },
  declined: { label: "Declined", tone: "red" },
  countered: { label: "New time suggested", tone: "amber" },
  cancelled: { label: "Cancelled", tone: "" },
};

export default async function ShowingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "incoming" } = await searchParams;
  const view = tab === "sent" ? "sent" : "incoming";
  const requests = (await repo().listRequests())
    .filter((r) => r.direction === view)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const waiting = requests.filter((r) => r.status === "pending").length;

  return (
    <main className="page">
      <header className="between">
        <h1 className="page-title">Showings</h1>
        <Link href="/showings/new" className="btn primary">+ Request</Link>
      </header>

      <nav className="chips" aria-label="Which showings">
        <Link href="/showings?tab=incoming" className={`chip row ${view === "incoming" ? "on" : ""}`} aria-current={view === "incoming" ? "page" : undefined} style={{ color: view === "incoming" ? "#fff" : "var(--ink)" }}>On my listings</Link>
        <Link href="/showings?tab=sent" className={`chip row ${view === "sent" ? "on" : ""}`} aria-current={view === "sent" ? "page" : undefined} style={{ color: view === "sent" ? "#fff" : "var(--ink)" }}>I requested</Link>
      </nav>

      {view === "incoming" && waiting > 0 && <p className="notice amber">{waiting} waiting on your approval</p>}
      {requests.length === 0 && <Empty>{view === "incoming" ? "No one has asked to show your listings yet." : "You haven't requested any showings yet."}</Empty>}

      {requests.map((r) => {
        const s = STATUS[r.status];
        return (
          <article key={r.id} className={`card ${r.status === "pending" && view === "incoming" ? "accent" : ""}`}>
            <div className="between" style={{ alignItems: "flex-start" }}>
              <div className="stack" style={{ gap: 2 }}>
                <span className="strong">{r.address}</span>
                <span className="small muted tabular">
                  {prettyDate(dateOf(r.startsAt))} · {formatClock(minutesOfDay(r.startsAt))}–{formatClock(minutesOfDay(r.endsAt))}
                </span>
                <span className="small muted">
                  {view === "incoming" ? `${r.otherAgentName} · ${r.buyerLabel}` : `${r.buyerLabel} · listed by ${r.otherAgentName}`}
                </span>
              </div>
              <span className={`pill ${s.tone}`}>{s.label}</span>
            </div>

            {view === "incoming" && r.status === "pending" && (
              <div className="grid-3">
                <form action={decide}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="approved" /><button className="btn primary block">Approve</button></form>
                <form action={decide}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="countered" /><button className="btn block">New time</button></form>
                <form action={decide}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="declined" /><button className="btn danger block">Decline</button></form>
              </div>
            )}
            {view === "sent" && (r.status === "pending" || r.status === "approved" || r.status === "countered") && (
              <form action={cancel}><input type="hidden" name="id" value={r.id} /><button className="btn danger block">Cancel showing</button></form>
            )}
          </article>
        );
      })}
    </main>
  );
}
