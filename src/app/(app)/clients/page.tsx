import Link from "next/link";
import type { Metadata } from "next";
import { repo } from "@/lib/data";
import type { ClientStage } from "@/lib/data/types";
import { dateOf, minutesOfDay, prettyDate, todayISO } from "@/lib/data/dates";
import { formatClock } from "@/lib/core/time";
import { Empty, Initials } from "@/components/ui";
import { AddClient } from "./AddClient";
import { moveClient } from "./actions";

export const metadata: Metadata = { title: "Clients" };

const STAGES: { id: ClientStage; label: string; hint: string }[] = [
  { id: "present", label: "Present", hint: "Clients you're working with now" },
  { id: "future", label: "Future", hint: "New leads, including people who connected through your link" },
  { id: "past", label: "Past", hint: "Closed clients. Stay in touch for reviews and referrals" },
];

const digits = (p: string) => p.replace(/[^\d+]/g, "");

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage = "present" } = await searchParams;
  const current = STAGES.find((s) => s.id === stage) ?? STAGES[0];
  const r = repo();
  const [clients, requests, deals] = await Promise.all([r.listClients(), r.listRequests(), r.listDeals()]);
  const today = todayISO();
  const list = clients.filter((c) => c.stage === current.id);
  const count = (s: ClientStage) => clients.filter((c) => c.stage === s).length;

  return (
    <main className="page">
      <header className="between">
        <h1 className="page-title">Clients</h1>
        <div className="row" style={{ gap: 6 }}>
          <Link href="/remember" className="btn">REmember</Link>
          <Link href="/profile#my-link" className="btn">My link &amp; QR</Link>
        </div>
      </header>

      <nav className="grid-3" aria-label="Client lists">
        {STAGES.map((s) => (
          <Link key={s.id} href={`/clients?stage=${s.id}`} className={`btn block ${current.id === s.id ? "dark" : ""}`} aria-current={current.id === s.id ? "page" : undefined}>
            {s.label} <span className="tabular" style={{ opacity: 0.7 }}>{count(s.id)}</span>
          </Link>
        ))}
      </nav>
      <p className="small muted" style={{ margin: 0 }}>{current.hint}</p>

      <AddClient stage={current.id} />

      {list.length === 0 && <Empty>{current.id === "future" ? "No new leads yet. Share your personal link or QR code (under My link & QR) so clients can connect with you." : "No clients here yet."}</Empty>}

      {list.map((c) => {
        const upcoming = requests
          .filter((x) => x.direction === "sent" && (x.clientId === c.id || x.buyerLabel === c.name) && dateOf(x.startsAt) >= today && x.status !== "cancelled" && x.status !== "declined")
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        const deal = deals.find((d) => d.clientId === c.id || d.clientName === c.name);
        return (
          <article key={c.id} className="card">
            <div className="row" style={{ alignItems: "flex-start" }}>
              <Initials name={c.name} size={44} />
              <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <span className="strong">{c.name}</span>
                <span className="small muted">
                  {[c.intent, c.preApproved ? "Pre-approved" : null].filter(Boolean).join(" · ") || "Client"}
                </span>
                {c.notes && <span className="small">{c.notes}</span>}
              </div>
              {c.source === "link" && <span className="pill blue">From your link</span>}
            </div>

            {(upcoming.length > 0 || deal || c.closedOn) && (
              <ul className="stack small" style={{ listStyle: "none", margin: 0, padding: 0, gap: 4 }}>
                {upcoming.slice(0, 3).map((x) => (
                  <li key={x.id}>🏠 {x.address} · <span className="tabular">{prettyDate(dateOf(x.startsAt))} {formatClock(minutesOfDay(x.startsAt))}</span></li>
                ))}
                {deal && <li>📄 <Link href={`/deals/${deal.id}`}>{deal.address}</Link> · closing {prettyDate(deal.closingDate)}</li>}
                {c.closedOn && <li>🎉 Home anniversary {prettyDate(c.closedOn, { month: "long", day: "numeric" })} · <Link href="/remember">REmember</Link></li>}
              </ul>
            )}

            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              {c.phone && <a className="btn" href={`sms:${digits(c.phone)}`}>Text</a>}
              {c.phone && <a className="btn" href={`tel:${digits(c.phone)}`}>Call</a>}
              {c.email && <a className="btn" href={`mailto:${c.email}`}>Email</a>}
              {c.stage !== "past" && <Link className="btn" href={`/showings/new?client=${c.id}`}>Request showing</Link>}
              {c.stage !== "past" && !deal && <Link className="btn" href={`/deals/new?client=${c.id}`}>Start deal</Link>}
            </div>

            <form action={moveClient} className="row small" style={{ gap: 6, flexWrap: "wrap" }}>
              <input type="hidden" name="id" value={c.id} />
              <span className="muted">Move to:</span>
              {STAGES.filter((s) => s.id !== c.stage).map((s) => (
                <button key={s.id} name="stage" value={s.id} className="chip">{s.label}</button>
              ))}
            </form>
          </article>
        );
      })}
    </main>
  );
}
