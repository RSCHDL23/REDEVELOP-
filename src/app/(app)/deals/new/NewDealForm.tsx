"use client";

import { useActionState, useMemo, useState } from "react";
import { addDays, contractMilestones } from "@/lib/core/deadlines";
import { prettyDate } from "@/lib/data/dates";
import { createDeal, type NewDealState } from "../actions";

const LOANS = ["Conventional", "FHA", "VA", "USDA", "Cash", "Other"];

export function NewDealForm({ clients, defaultClient, today }: { clients: { id: string; name: string; intent: string }[]; defaultClient?: string; today: string }) {
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

  return (
    <form action={action} className="stack" style={{ gap: 14 }}>
      <div className="card">
        <div className="field"><label htmlFor="address">Property address</label><input id="address" name="address" className="input" required maxLength={160} placeholder="e.g. 2840 W Leland Ave" /></div>
        <div className="field"><label htmlFor="city">City, state</label><input id="city" name="city" className="input" required maxLength={80} placeholder="Chicago, IL" /></div>
        <div className="field">
          <label htmlFor="side">You represent</label>
          <select id="side" name="side" className="input" defaultValue="buyer">
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

      <input type="hidden" name="milestones" value={JSON.stringify(milestones.map(({ kind, label, due }) => ({ kind, label, due })))} />
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn primary lg block" disabled={pending}>{pending ? "Creating…" : "Create deal"}</button>
    </form>
  );
}
