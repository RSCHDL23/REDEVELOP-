import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { prettyDate, todayISO } from "@/lib/data/dates";
import { daysUntil } from "@/lib/core/deadlines";
import { can, needsDualRoleDisclosure, rolesFor } from "@/lib/core/access";
import { BackLink, Initials } from "@/components/ui";
import { postLoanUpdate, removePerson, setMilestoneDate, toggleMilestone, toggleTask } from "../actions";
import { AddPersonForm, AddTodoForm, ContactMenu, EditPersonForm, EditTodoForm, VerifyClosing } from "./DealForms";
import { checklistMessage, greetingName, reviewRequestMessage, type ClosingSide } from "@/lib/core/closing";
import { appOrigin } from "@/lib/server/origin";
import { Celebration } from "./Celebration";
import { UnderContract } from "./UnderContract";

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

const EARNEST_LABEL: Record<string, string> = {
  listing_brokerage: "Listing brokerage escrow", buyer_brokerage: "Buyer's brokerage escrow", title_company: "Title company",
  attorney: "Attorney escrow", builder: "Builder", other: "Other",
};

const LOAN_STATUSES = ["Application received", "Appraisal ordered", "Appraisal in", "Conditional approval", "Clear to close", "Docs sent to title", "Funded"];

export default async function DealPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; celebrate?: string; created?: string; verify?: string; missing?: string }> }) {
  const [{ id }, { tab = "dates", celebrate, created, verify, missing }] = await Promise.all([params, searchParams]);
  const r = repo();
  const [deal, licenses, me] = await Promise.all([r.getDeal(id), r.listLicenses(), r.getMe()]);
  if (!deal) notFound();
  const today = todayISO();
  const myRoles = rolesFor(licenses, me.selfRoles);
  const isLender = deal.members.some((m) => m.isYou && m.role === "lender") && can(myRoles, "loan_updates");
  const myDealRoles = deal.members.filter((m) => m.isYou).map((m) => m.role);
  const current = TABS.find((t) => t.id === tab)?.id ?? "dates";
  const toClose = daysUntil(today, deal.closingDate);
  const sides: ClosingSide[] = deal.side === "both" ? ["buyer", "seller"] : [deal.side];
  const showCelebration = celebrate === "1" && deal.milestones.some((m) => m.kind === "closing" && m.done);
  const showUnderContract = created === "1";
  const client = showCelebration && deal.clientId ? (await r.listClients()).find((c) => c.id === deal.clientId) : undefined;
  // Post details: photo from the listing if it's in the system.
  const origin = showCelebration || showUnderContract ? await appOrigin() : "";
  const listing = showCelebration || showUnderContract ? (await r.listListings()).find((l) => l.address.toLowerCase() === deal.address.toLowerCase()) : undefined;
  const post = {
    address: deal.address, city: deal.city, photoUrl: listing?.photoUrl ?? null, agentName: me.fullName, brokerage: me.brokerage,
    phone: me.phone, logoUrl: me.logoUrl, shareUrl: `${origin}/p/${me.slug}`,
  };
  const review = showCelebration && client
    ? { clientId: client.id, phone: client.phone || undefined, email: client.email || undefined,
        body: reviewRequestMessage({ clientFirst: greetingName(client.name), agentName: me.fullName, reviewUrl: `${origin}/r/${client.reviewToken}`, sites: me.reviewLinks }) }
    : null;
  const celebration = showCelebration
    ? sides.map((side) => {
        const person = deal.members.find((m) => m.role === side && !m.isYou);
        const name = person?.name ?? deal.clientName;
        const useClient = !person || person.name === client?.name;
        return { side, clientName: name, phone: person?.phone || (useClient ? client?.phone : undefined) || undefined, email: person?.email || (useClient ? client?.email : undefined) || undefined, body: checklistMessage({ clientFirstName: greetingName(name), address: deal.address, side, agentName: me.fullName, agentPhone: me.phone }) };
      })
    : null;

  const unverified = deal.milestones.filter((m) => m.kind !== "closing" && !m.done).sort((a, b) => a.due.localeCompare(b.due));
  const closingOpen = deal.milestones.some((m) => m.kind === "closing" && !m.done);
  const assignees = ["You", ...new Set(deal.members.filter((m) => !m.isYou).map((m) => ROLE_NAME[m.role] ?? m.role))];

  return (
    <main className="page">
      {verify === "1" && closingOpen && unverified.length > 0 && !celebration && (
        <VerifyClosing dealId={deal.id} missing={missing === "1"} open={unverified.map((m) => ({ id: m.id, label: m.label, due: prettyDate(m.due, { month: "short", day: "numeric" }) }))} />
      )}
      {celebration && <Celebration address={deal.address} dealId={deal.id} messages={celebration} post={post} review={review} />}
      {showUnderContract && !celebration && <UnderContract dealId={deal.id} post={post} />}
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

      {(deal.earnestAmount != null || deal.earnestHolder) && (
        <div className="card small" style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <span aria-hidden="true" style={{ fontSize: 22 }}>💵</span>
          <span>
            <span className="strong">Earnest money{deal.earnestAmount != null ? `: ${deal.earnestAmount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}` : ""}</span>
            {deal.earnestHolder && <> · held by {deal.earnestHolderName || EARNEST_LABEL[deal.earnestHolder]}{deal.earnestHolderName ? ` (${EARNEST_LABEL[deal.earnestHolder].toLowerCase()})` : ""}</>}
          </span>
        </div>
      )}

      {deal.loanType.toLowerCase() === "naca" && (
        <div className="card small" style={{ gap: 4, background: "#eef7f2", borderColor: "#b9dcc6" }}>
          <span className="strong">NACA mortgage</span>
          <span>NACA-approved inspectors and settlement agent · HAND reviews repairs · Credit Access with the Mortgage Consultant · closing at the NACA office.</span>
          <span className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <a href="https://www.naca.com/purchase/" target="_blank" rel="noreferrer">NACA purchase process ↗</a>
            <Link href="/calculator?mode=budget&naca=1">Mortgage calculator</Link>
          </span>
        </div>
      )}

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
                    <span className="strong" style={{ textDecoration: m.done ? "line-through" : undefined }}>{m.label}{m.kind === "closing" && !m.done ? " 🎉" : ""}</span>
                    <span className="small muted tabular">{prettyDate(m.due)}</span>
                  </span>
                  {!m.done && <span className={`pill ${left < 0 ? "red" : left <= 3 ? "amber" : ""}`}>{left < 0 ? "Overdue" : left === 0 ? "Today" : `${left} days`}</span>}
                </form>
                <details style={{ marginTop: 6, marginLeft: 54 }}>
                  <summary className="tiny strong" style={{ cursor: "pointer", color: "var(--blue-text)", minHeight: 24 }}>Change date</summary>
                  <form action={setMilestoneDate} className="row" style={{ marginTop: 6 }}>
                    <input type="hidden" name="dealId" value={deal.id} />
                    <input type="hidden" name="itemId" value={m.id} />
                    <input type="date" name="due" className="input" defaultValue={m.due} aria-label={`New date for ${m.label}`} style={{ minHeight: 40, flex: 1 }} required />
                    <button className="btn dark" style={{ minHeight: 40 }}>Save</button>
                  </form>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      {current === "tasks" && (
        <>
        <p className="small muted" style={{ margin: 0 }}>To-dos marked <span className="pill">Template</span> were made automatically when the deal was created, from its side, loan type, HOA and dates. Add your own anytime.</p>
        <AddTodoForm dealId={deal.id} assignees={assignees} />
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
                {t.source === "auto" && <span className="pill">Template</span>}
              </form>
              <div className="row" style={{ marginTop: 6, marginLeft: 54 }}>
                <EditTodoForm dealId={deal.id} task={{ id: t.id, title: t.title, assignee: t.assignee, due: t.due }} assignees={assignees} />
              </div>
            </li>
          ))}
        </ul>
        </>
      )}

      {current === "people" && (
        <>
        <AddPersonForm dealId={deal.id} />
        <ul className="list">
          {deal.members.map((m) => (
            <li key={m.id} className="row" style={{ flexWrap: "wrap" }}>
              <Initials name={m.name} size={40} />
              <span className="stack" style={{ gap: 1, flex: 1 }}>
                <span className="strong">{m.name}{m.isYou ? " (you)" : ""}</span>
                <span className="small muted">{ROLE_NAME[m.role] ?? m.role}</span>
              </span>
              {!m.isYou && <ContactMenu name={m.name} phone={m.phone} email={m.email} />}
              {!m.isYou && <EditPersonForm dealId={deal.id} member={{ id: m.id, role: m.role, name: m.name, phone: m.phone, email: m.email }} />}
              {!m.isYou && (
                <form action={removePerson}>
                  <input type="hidden" name="dealId" value={deal.id} />
                  <input type="hidden" name="memberId" value={m.id} />
                  <button className="btn danger" style={{ border: 0, minHeight: 36, padding: "0 8px" }} aria-label={`Remove ${m.name}`}>✕</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        </>
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
