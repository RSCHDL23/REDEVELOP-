"use client";

import { useActionState, useMemo, useState } from "react";
import { addDays, contractMilestones } from "@/lib/core/deadlines";
import { dealTodoTemplate } from "@/lib/core/tasks";
import { prettyDate } from "@/lib/data/dates";
import { createDeal, type NewDealState } from "../actions";

const LOANS = ["Conventional", "FHA", "VA", "USDA", "NACA", "Cash", "Other"];

const HOLDERS = [
  { id: "listing_brokerage", label: "Listing brokerage escrow", short: "the listing brokerage" },
  { id: "buyer_brokerage", label: "Buyer's brokerage escrow", short: "the buyer's brokerage" },
  { id: "title_company", label: "Title company", short: "the title company" },
  { id: "attorney", label: "Attorney escrow", short: "the attorney" },
  { id: "builder", label: "Builder", short: "the builder" },
  { id: "other", label: "Other", short: "the escrow holder" },
];

export function NewDealForm({ clients, defaultClient, today, homes }: {
  clients: { id: string; name: string; intent: string }[]; defaultClient?: string; today: string;
  homes: { group: string; address: string; city: string }[];
}) {
  const [state, action, pending] = useActionState<NewDealState, FormData>(createDeal, {});
  const [clientId, setClientId] = useState(clients.some((c) => c.id === defaultClient) ? defaultClient! : clients[0]?.id ?? "new");
  const [acceptance, setAcceptance] = useState(today);
  const [closing, setClosing] = useState(addDays(today, 45));
  const [loan, setLoan] = useState("Conventional");
  const [hoa, setHoa] = useState(false);
  const [earnest, setEarnest] = useState(3);
  const [attorney, setAttorney] = useState(5);
  const [inspection, setInspection] = useState(5);
  const [mortgage, setMortgage] = useState(21);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [side, setSide] = useState<"buyer" | "seller" | "both">("buyer");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pick, setPick] = useState(homes.length ? "" : "manual");
  const [holder, setHolder] = useState("");
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const computed = useMemo(() => {
    if (!acceptance || !closing) return [];
    return contractMilestones({
      acceptance, closing, hasHoa: hoa,
      earnestMoneyBusinessDays: earnest, attorneyReviewBusinessDays: attorney, inspectionBusinessDays: inspection,
      mortgageContingencyDays: loan === "Cash" ? undefined : mortgage,
    });
  }, [acceptance, closing, hoa, earnest, attorney, inspection, mortgage, loan]);
  const milestones = computed.map((m) => ({ ...m, due: m.kind === "closing" || m.kind === "accepted" ? m.due : overrides[m.kind] ?? m.due, edited: !!overrides[m.kind] && m.kind !== "closing" && m.kind !== "accepted" }));

  const num = (v: string, set: (n: number) => void) => set(Math.max(0, Math.min(90, Number(v) || 0)));
  const todos = useMemo(() => (acceptance && closing ? dealTodoTemplate({
    side, loanType: loan, hasHoa: hoa, acceptance, milestones: milestones.map(({ kind, due }) => ({ kind, due })),
    earnestHolder: HOLDERS.find((h) => h.id === holder)?.short,
  }) : []), [side, loan, hoa, acceptance, closing, holder, JSON.stringify(milestones.map((m) => m.due))]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = [...new Set(homes.map((h) => h.group))];

  return (
    <form action={action} className="stack" style={{ gap: 14 }}>
      <div className="card">
        {homes.length > 0 && (
          <div className="field">
            <label htmlFor="home">Property</label>
            <select id="home" className="input" value={pick} onChange={(e) => {
              setPick(e.target.value);
              const h = homes[Number(e.target.value)];
              if (h) { setAddress(h.address); setCity(h.city); } else if (e.target.value === "manual") { setAddress(""); setCity(""); }
            }}>
              <option value="" disabled>Pick from your showings or listings…</option>
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {homes.map((h, i) => h.group === g && <option key={i} value={i}>{h.address}{h.city ? `, ${h.city}` : ""}</option>)}
                </optgroup>
              ))}
              <option value="manual">+ Type a different address</option>
            </select>
          </div>
        )}
        {pick !== "" && (
          <>
            <div className="field"><label htmlFor="address">Property address</label><input id="address" name="address" className="input" required maxLength={160} placeholder="e.g. 2840 W Leland Ave" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            <div className="field"><label htmlFor="city">City, state</label><input id="city" name="city" className="input" required maxLength={80} placeholder="Chicago, IL" value={city} onChange={(e) => setCity(e.target.value)} /></div>
          </>
        )}
        <div className="field">
          <label htmlFor="side">You represent</label>
          <select id="side" name="side" className="input" value={side} onChange={(e) => setSide(e.target.value as typeof side)}>
            <option value="buyer">The buyer</option>
            <option value="seller">The seller</option>
            <option value="both">Both sides</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="clientId">Client</label>
          <select id="clientId" name="clientId" className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="new">+ New client…</option>
          </select>
        </div>
        {clientId === "new" && (
          <>
            <div className="field"><label htmlFor="clientName">Client name</label><input id="clientName" name="clientName" className="input" required maxLength={80} /></div>
            <div className="grid-2">
              <div className="field"><label htmlFor="clientPhone">Mobile</label><input id="clientPhone" name="clientPhone" type="tel" className="input" maxLength={30} /></div>
              <div className="field"><label htmlFor="clientEmail">Email</label><input id="clientEmail" name="clientEmail" type="email" className="input" maxLength={120} /></div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <span className="strong">Contract</span>
        <div className="grid-2">
          <div className="field"><label htmlFor="acceptanceDate">Accepted</label><input id="acceptanceDate" name="acceptanceDate" type="date" className="input" value={acceptance} onChange={(e) => setAcceptance(e.target.value)} required /></div>
          <div className="field"><label htmlFor="closingDate">Closing</label><input id="closingDate" name="closingDate" type="date" className="input" value={closing} onChange={(e) => setClosing(e.target.value)} required /></div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="loanType">Loan</label>
            <select id="loanType" name="loanType" className="input" value={loan} onChange={(e) => setLoan(e.target.value)}>
              {LOANS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <label className="row small" style={{ cursor: "pointer", alignSelf: "end", minHeight: 48 }}>
            <input type="checkbox" name="hasHoa" checked={hoa} onChange={(e) => setHoa(e.target.checked)} style={{ width: 20, height: 20 }} /> HOA or condo
          </label>
        </div>
        <span className="strong" style={{ marginTop: 6 }}>Earnest money</span>
        <div className="grid-2">
          <div className="field"><label htmlFor="earnestAmount">Amount</label><input id="earnestAmount" name="earnestAmount" className="input" inputMode="decimal" placeholder="$5,000" maxLength={14} /></div>
          <div className="field">
            <label htmlFor="earnestHolder">Held by</label>
            <select id="earnestHolder" name="earnestHolder" className="input" value={holder} onChange={(e) => setHolder(e.target.value)}>
              <option value="">Choose…</option>
              {HOLDERS.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
            </select>
          </div>
        </div>
        {holder && <div className="field"><label htmlFor="earnestHolderName">Name of the {HOLDERS.find((h) => h.id === holder)?.label.toLowerCase()}</label><input id="earnestHolderName" name="earnestHolderName" className="input" maxLength={100} placeholder="e.g. Chicago Title, Downtown office" /></div>}
        {loan === "NACA" && (
          <div className="notice small" style={{ fontWeight: 600 }}>
            NACA deal: allow at least a 30-day closing, use a NACA-approved settlement agent and NACA-approved inspectors, and the HAND department reviews repairs. Closing is at the NACA office.
            {acceptance && closing && closing < addDays(acceptance, 30) && <span className="error" style={{ display: "block", marginTop: 4 }}>Closing is less than 30 days after acceptance.</span>}
          </div>
        )}
        <details>
          <summary className="small strong" style={{ cursor: "pointer", minHeight: 32 }}>Contract periods (days)</summary>
          <div className="grid-2" style={{ marginTop: 8 }}>
            <div className="field"><label htmlFor="earnest">Earnest money (business)</label><input id="earnest" type="number" min={0} max={90} className="input" value={earnest} onChange={(e) => num(e.target.value, setEarnest)} /></div>
            <div className="field"><label htmlFor="attorney">Attorney review (business)</label><input id="attorney" type="number" min={0} max={90} className="input" value={attorney} onChange={(e) => num(e.target.value, setAttorney)} /></div>
            <div className="field"><label htmlFor="inspection">Inspection (business)</label><input id="inspection" type="number" min={0} max={90} className="input" value={inspection} onChange={(e) => num(e.target.value, setInspection)} /></div>
            {loan !== "Cash" && <div className="field"><label htmlFor="mortgage">Mortgage commitment (calendar)</label><input id="mortgage" type="number" min={0} max={90} className="input" value={mortgage} onChange={(e) => num(e.target.value, setMortgage)} /></div>}
          </div>
        </details>
      </div>

      <section className="stack">
        <h2 className="section-label">Milestone dates</h2>
        <ul className="list">
          {milestones.map((m) => (
            <li key={m.kind} className="between">
              <span className="stack" style={{ gap: 0 }}>
                <span className="strong">{m.label}</span>
                <span className="tiny muted">{prettyDate(m.due)}{m.edited ? " · changed" : ""}</span>
              </span>
              {m.kind === "accepted" || m.kind === "closing" ? (
                <span className="tiny muted">Set above</span>
              ) : (
                <input
                  type="date"
                  className="input"
                  aria-label={`${m.label} date`}
                  style={{ width: 160, minHeight: 40 }}
                  value={m.due}
                  onChange={(e) => setOverrides((o) => ({ ...o, [m.kind]: e.target.value }))}
                />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="stack">
        <h2 className="section-label">To-dos ({todos.length - skipped.size})</h2>
        <p className="small muted" style={{ margin: 0 }}>Made from this deal&apos;s side, loan type, HOA and dates. Uncheck any you don&apos;t need; you can add your own on the deal anytime.</p>
        <ul className="list">
          {todos.map((t) => (
            <li key={t.title}>
              <label className="row" style={{ alignItems: "flex-start", cursor: "pointer" }}>
                <input type="checkbox" checked={!skipped.has(t.title)} onChange={(e) => setSkipped((sk) => { const n = new Set(sk); if (e.target.checked) n.delete(t.title); else n.add(t.title); return n; })} style={{ width: 20, height: 20, marginTop: 2 }} />
                <span className="stack" style={{ gap: 0 }}>
                  <span className="small strong">{t.title}</span>
                  <span className="tiny muted">{t.assignee}{t.due ? ` · ${prettyDate(t.due)}` : ""}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>
      <input type="hidden" name="tasks" value={JSON.stringify(todos.filter((t) => !skipped.has(t.title)))} />

      <input type="hidden" name="milestones" value={JSON.stringify(milestones.map(({ kind, label, due }) => ({ kind, label, due })))} />
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn primary lg block" disabled={pending}>{pending ? "Creating…" : "Create deal"}</button>
    </form>
  );
}
