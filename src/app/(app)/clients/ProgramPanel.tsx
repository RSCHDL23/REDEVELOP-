import Link from "next/link";
import type { Client } from "@/lib/data/types";
import { NACA_LINKS, NACA_STEPS, qualificationExpires } from "@/lib/core/naca";
import { NACA_COSTS, paymentShock, priceFromPayment } from "@/lib/core/mortgage";
import { prettyDate, todayISO } from "@/lib/data/dates";
import { saveProgram, toggleProgramStep } from "./actions";
import { FinancingForm } from "@/components/FinancingForm";
import { greetingName } from "@/lib/core/closing";

const PROGRAMS: [Client["loanProgram"], string][] = [
  ["unknown", "Not set"], ["conventional", "Conventional"], ["fha", "FHA"], ["va", "VA"], ["usda", "USDA"], ["naca", "NACA"], ["cash", "Cash"], ["other", "Other"],
];
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Loan program for a buyer, with a NACA progress tracker. */
export function ProgramPanel({ c, rate }: { c: Client; rate: number }) {
  const naca = c.loanProgram === "naca";
  const done = new Set(c.programSteps);
  const shock = c.approvedMonthly && c.currentHousing != null ? paymentShock(c.currentHousing, c.approvedMonthly) : null;
  const est = c.approvedMonthly ? priceFromPayment(c.approvedMonthly, { ...NACA_COSTS, ratePct: rate, years: 30, taxRatePct: 2, insuranceYear: 1800, hoaMonth: 0 }) : null;
  const expires = c.qualifiedOn ? qualificationExpires(c.qualifiedOn) : null;
  const calc = `/calculator?mode=budget${c.approvedMonthly ? `&monthly=${c.approvedMonthly}` : ""}${c.currentHousing != null ? `&current=${c.currentHousing}` : ""}${naca ? "&naca=1" : ""}`;
  return (
    <details className="card" style={{ width: "100%", gap: 8, background: naca ? "#eef7f2" : undefined }} open={naca}>
      <summary className="small strong" style={{ cursor: "pointer" }}>
        Loan: {PROGRAMS.find(([id]) => id === c.loanProgram)?.[1]}{c.financing?.kind === "preapproval" ? " · pre-approval on file" : c.financing?.kind === "proof_of_funds" ? " · proof of funds on file" : ""}
        {naca && ` · NACA ${done.size}/${NACA_STEPS.length} steps`}
      </summary>
      <div className="stack" style={{ gap: 6, marginTop: 8, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
        <span className="small strong">Pre-approval or proof of funds</span>
        <FinancingForm target={c.id} current={c.financing} forClient={greetingName(c.name)} start={c.loanProgram === "cash" ? "proof_of_funds" : "preapproval"} />
      </div>
      <form action={saveProgram} className="stack" style={{ gap: 8, marginTop: 8 }}>
        <input type="hidden" name="id" value={c.id} />
        <div className="grid-2">
          <div className="field">
            <label className="small strong" htmlFor={`lp-${c.id}`}>Loan program</label>
            <select id={`lp-${c.id}`} name="loanProgram" className="input" defaultValue={c.loanProgram}>{PROGRAMS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
          </div>
          <div className="field">
            <label className="small strong" htmlFor={`am-${c.id}`}>Approved monthly</label>
            <input id={`am-${c.id}`} name="approvedMonthly" className="input" inputMode="decimal" defaultValue={c.approvedMonthly ?? ""} placeholder="$2,350" />
          </div>
          <div className="field">
            <label className="small strong" htmlFor={`ch-${c.id}`}>Rent / payment today</label>
            <input id={`ch-${c.id}`} name="currentHousing" className="input" inputMode="decimal" defaultValue={c.currentHousing ?? ""} placeholder="$1,650" />
          </div>
          <div className="field">
            <label className="small strong" htmlFor={`q-${c.id}`}>{naca ? "NACA Qualified on" : "Pre-approved on"}</label>
            <input id={`q-${c.id}`} name="qualifiedOn" type="date" className="input" defaultValue={c.qualifiedOn ?? ""} />
          </div>
        </div>
        <button className="btn dark block" style={{ minHeight: 40 }}>Save</button>
      </form>

      {(shock !== null || est || expires) && (
        <div className="stack small" style={{ gap: 4 }}>
          {shock !== null && <span>💵 Payment shock: <span className="strong">{usd(shock)}/month</span>{naca ? " to save each month" : ""}</span>}
          {est && <span>🏠 About <span className="strong">{usd(Math.round(est.price / 1000) * 1000)}</span> max price at {rate}% (no down payment or PMI, 2% taxes, $1,800/yr insurance)</span>}
          {expires && <span className={expires < todayISO() ? "error" : ""}>📅 {naca ? "Qualification Form" : "Pre-approval"} good until {prettyDate(expires, { month: "short", day: "numeric", year: "numeric" })}</span>}
          <Link href={calc}>Open the mortgage calculator →</Link>
        </div>
      )}

      {naca && (
        <>
          <ol className="stack" style={{ listStyle: "none", margin: 0, padding: 0, gap: 6 }}>
            {NACA_STEPS.map((s, i) => (
              <li key={s.id}>
                <form action={toggleProgramStep} className="row" style={{ alignItems: "flex-start", gap: 8 }}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="step" value={s.id} />
                  <button className="btn" aria-label={`${done.has(s.id) ? "Undo" : "Mark done"}: ${s.label}`} style={{ width: 32, minHeight: 32, padding: 0, borderRadius: "50%", background: done.has(s.id) ? "var(--green)" : "#fff", color: done.has(s.id) ? "#fff" : "var(--ink)", borderColor: done.has(s.id) ? "var(--green)" : undefined }}>
                    {done.has(s.id) ? "✓" : i + 1}
                  </button>
                  <span className="stack" style={{ gap: 0 }}>
                    <span className="small strong" style={{ textDecoration: done.has(s.id) ? "line-through" : undefined }}>{s.label}</span>
                    <span className="tiny muted">{s.hint}</span>
                  </span>
                </form>
              </li>
            ))}
          </ol>
          <div className="row tiny" style={{ flexWrap: "wrap", gap: 8 }}>
            {NACA_LINKS.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.title.replace("NACA: ", "")} ↗</a>)}
          </div>
        </>
      )}
    </details>
  );
}
