import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { prettyDate, todayISO } from "@/lib/data/dates";
import { daysUntil } from "@/lib/core/deadlines";
import { can, needsDualRoleDisclosure, rolesFor } from "@/lib/core/access";
import { BackLink, Initials } from "@/components/ui";
import { postLoanUpdate, toggleMilestone, toggleTask } from "../actions";

export const metadata: Metadata = { title: "Deal" };

const TABS = [
  { id: "dates", label: "Dates" },
  { id: "tasks", label: "To-dos" },
  { id: "people", label: "People" },
  { id: "loan", label: "Loan" },
] as const;

const ROLE_NAME: Record<string, string> = {
  buyers_agent: "Buyer's agent", listing_agent: "Listing agent", buyer: "Buyer", seller: "Seller", lender: "Lender",
  attorney: "Attorney", transaction_coordinator: "Transaction coordinator", inspector: "Inspector", appraiser: "Appraiser",
  title: "Title", insurance: "Insurance",
};

const LOAN_STATUSES = ["Application received", "Appraisal ordered", "Appraisal in", "Conditional approval", "Clear to close", "Docs sent to title", "Funded"];

export default async function DealPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab = "dates" }] = await Promise.all([params, searchParams]);
  const r = repo();
  const [deal, licenses, me] = await Promise.all([r.getDeal(id), r.listLicenses(), r.getMe()]);
  if (!deal) notFound();
  const today = todayISO();
  const myRoles = rolesFor(licenses, me.selfRoles);
  const isLender = deal.members.some((m) => m.isYou && m.role === "lender") && can(myRoles, "loan_updates");
  const myDealRoles = deal.members.filter((m) => m.isYou).map((m) => m.role);
  const current = TABS.find((t) => t.id === tab)?.id ?? "dates";
  const toClose = daysUntil(today, deal.closingDate);

  return (
    <main className="page">
      <BackLink href="/deals" label="Deals" />
      <header className="stack" style={{ gap: 4 }}>
        <h1 className="page-title">{deal.address}</h1>
        <p className="page-sub">{deal.city} · {deal.clientName} · {deal.loanType}</p>
      </header>

      <section className="grid-3">
        <div className="card" style={{ gap: 2 }}><span className="tiny muted strong">Accepted</span><span className="strong tabular">{prettyDate(deal.acceptanceDate, { month: "short", day: "numeric" })}</span></div>
        <div className="card" style={{ gap: 2 }}><span className="tiny muted strong">Closing</span><span className="strong tabular">{prettyDate(deal.closingDate, { month: "short", day: "numeric" })}</span></div>
        <div className="card accent" style={{ gap: 2 }}><span className="tiny muted strong">To close</span><span className="strong tabular">{toClose >= 0 ? `${toClose} days` : "Closed"}</span></div>
      </section>

      {needsDualRoleDisclosure(myDealRoles) && (
        <p className="notice amber">You are both an agent and the lender on this deal. Give your client a written dual-role disclosure.</p>
      )}

      <nav className="chips" aria-label="Deal sections">
        {TABS.map((t) => (
          <Link key={t.id} href={`/deals/${deal.id}?tab=${t.id}`} className={`chip row ${current === t.id ? "on" : ""}`} aria-current={current === t.id ? "page" : undefined} style={{ color: current === t.id ? "#fff" : "var(--ink)" }}>{t.label}</Link>
        ))}
      </nav>

      {current === "dates" && (
        <ul className="list">
          {[...deal.milestones].sort((a, b) => a.due.localeCompare(b.due)).map((m) => {
            const left = daysUntil(today, m.due);
            return (
              <li key={m.id}>
                <form action={toggleMilestone} className="row">
                  <input type="hidden" name="dealId" value={deal.id} />
                  <input type="hidden" name="itemId" value={m.id} />
                  <button className="btn" aria-label={m.done ? `Mark ${m.label} not done` : `Mark ${m.label} done`} style={{ width: 44, minHeight: 44, padding: 0, borderRadius: "50%", background: m.done ? "var(--blue)" : undefined, borderColor: m.done ? "var(--blue)" : undefined }}>
                    {m.done ? "✓" : ""}
                  </button>
                  <span className="stack" style={{ gap: 1, flex: 1 }}>
                    <span className="strong" style={{ textDecoration: m.done ? "line-through" : undefined }}>{m.label}</span>
                    <span className="small muted tabular">{prettyDate(m.due)}</span>
                  </span>
                  {!m.done && <span className={`pill ${left < 0 ? "red" : left <= 3 ? "amber" : ""}`}>{left < 0 ? "Overdue" : left === 0 ? "Today" : `${left} days`}</span>}
                </form>
              </li>
            );
          })}
        </ul>
      )}

      {current === "tasks" && (
        <ul className="list">
          {deal.tasks.length === 0 && <li className="small muted">No to-dos yet.</li>}
          {deal.tasks.map((t) => (
            <li key={t.id}>
              <form action={toggleTask} className="row">
                <input type="hidden" name="dealId" value={deal.id} />
                <input type="hidden" name="itemId" value={t.id} />
                <button className="btn" aria-label={t.done ? `Mark ${t.title} not done` : `Mark ${t.title} done`} style={{ width: 44, minHeight: 44, padding: 0, borderRadius: 10, background: t.done ? "var(--blue)" : undefined, borderColor: t.done ? "var(--blue)" : undefined }}>
                  {t.done ? "✓" : ""}
                </button>
                <span className="stack" style={{ gap: 1, flex: 1 }}>
                  <span className="strong" style={{ textDecoration: t.done ? "line-through" : undefined }}>{t.title}</span>
                  <span className="small muted">{t.assignee}{t.due ? ` · ${prettyDate(t.due)}` : ""}</span>
                </span>
              </form>
            </li>
          ))}
        </ul>
      )}

      {current === "people" && (
        <ul className="list">
          {deal.members.map((m, i) => (
            <li key={`${m.role}-${i}`} className="row">
              <Initials name={m.name} size={40} />
              <span className="stack" style={{ gap: 1, flex: 1 }}>
                <span className="strong">{m.name}{m.isYou ? " (you)" : ""}</span>
                <span className="small muted">{ROLE_NAME[m.role] ?? m.role}</span>
              </span>
              {m.phone && !m.isYou && <a className="btn" href={`sms:${m.phone.replace(/[^\d+]/g, "")}`} aria-label={`Text ${m.name}`}>Text</a>}
              {m.email && !m.isYou && <a className="btn" href={`mailto:${m.email}`} aria-label={`Email ${m.name}`}>Email</a>}
            </li>
          ))}
        </ul>
      )}

      {current === "loan" && (
        <section className="stack">
          {isLender && (
            <form action={postLoanUpdate} className="card">
              <input type="hidden" name="dealId" value={deal.id} />
              <span className="strong">Post a loan update</span>
              <span className="small muted">Everyone on the deal sees this. Keep it general: no credit, income or account details.</span>
              <select name="status" className="input" defaultValue={LOAN_STATUSES[0]} aria-label="Loan status">
                {LOAN_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <textarea name="note" className="input" maxLength={400} placeholder="Optional note, e.g. Appraisal came in at value." aria-label="Note" />
              <button className="btn primary block">Post update</button>
            </form>
          )}
          {deal.loanUpdates.length === 0 && <p className="card small muted">The lender hasn&apos;t posted an update yet.</p>}
          <ul className="list">
            {deal.loanUpdates.map((u) => (
              <li key={u.id} className="stack" style={{ gap: 2 }}>
                <span className="between"><span className="strong">{u.status}</span><span className="tiny muted">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" }).format(new Date(u.at))}</span></span>
                {u.note && <span className="small">{u.note}</span>}
                <span className="tiny muted">{u.author}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
