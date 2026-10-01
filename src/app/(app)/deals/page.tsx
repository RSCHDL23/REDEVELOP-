import Link from "next/link";
import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { prettyDate, todayISO } from "@/lib/data/dates";
import { daysUntil } from "@/lib/core/deadlines";
import { Empty } from "@/components/ui";

export const metadata: Metadata = { title: "Deals" };

const SIDE = { buyer: "Buyer side", seller: "Listing side", both: "Both sides" } as const;

export default async function DealsPage() {
  const deals = await repo().listDeals();
  const today = todayISO();
  const sorted = [...deals].sort((a, b) => a.closingDate.localeCompare(b.closingDate));

  return (
    <main className="page">
      <h1 className="page-title">Deals</h1>
      {sorted.length === 0 && <Empty>No deals under contract yet.</Empty>}
      {sorted.map((d) => {
        const done = d.milestones.filter((m) => m.done).length;
        const next = d.milestones.filter((m) => !m.done).sort((a, b) => a.due.localeCompare(b.due))[0];
        const overdue = next && daysUntil(today, next.due) < 0;
        const toClose = daysUntil(today, d.closingDate);
        return (
          <Link key={d.id} href={`/deals/${d.id}`} className="card" style={{ color: "var(--ink)" }}>
            <div className="between" style={{ alignItems: "flex-start" }}>
              <div className="stack" style={{ gap: 1 }}>
                <span className="strong">{d.address}</span>
                <span className="small muted">{d.city} · {d.clientName} · {SIDE[d.side]}</span>
              </div>
              <span className="pill">{toClose >= 0 ? `${toClose} days to close` : "Closed"}</span>
            </div>
            <div className="bar" aria-label={`${done} of ${d.milestones.length} milestones done`}><span style={{ width: `${d.milestones.length ? (done / d.milestones.length) * 100 : 0}%` }} /></div>
            {next && (
              <span className="small">
                Next: <span className="strong">{next.label}</span>{" "}
                <span className={`pill ${overdue ? "red" : daysUntil(today, next.due) <= 3 ? "amber" : ""}`}>
                  {overdue ? "Overdue" : prettyDate(next.due)}
                </span>
              </span>
            )}
          </Link>
        );
      })}
    </main>
  );
}
