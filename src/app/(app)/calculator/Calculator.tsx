"use client";

import { useMemo, useState } from "react";
import { downPaymentForPayment, NACA_BUYDOWN, nacaBuydownCost, nacaBuydownToAfford, paymentFromPrice, paymentShock, priceFromPayment, type Costs } from "@/lib/core/mortgage";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = (s: string) => { const n = Number(s.replace(/[$,%\s]/g, "")); return Number.isFinite(n) ? n : 0; };
const r3 = (n: number) => Math.round(n * 1000) / 1000;

const PARTS = [
  { key: "pi", label: "Principal & interest", color: "var(--blue)" },
  { key: "tax", label: "Property taxes", color: "#b98a00" },
  { key: "insurance", label: "Homeowner's insurance", color: "var(--green)" },
  { key: "hoa", label: "HOA", color: "#8e44ad" },
  { key: "pmi", label: "Mortgage insurance", color: "var(--red)" },
] as const;

function Field({ id, label, value, onChange, suffix, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; suffix?: string; hint?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="row" style={{ gap: 6 }}>
        <input id={id} className="input" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className="small muted" style={{ minWidth: 28 }}>{suffix}</span>}
      </div>
      {hint && <span className="tiny muted">{hint}</span>}
    </div>
  );
}

export type CalcInitial = {
  mode: "budget" | "price"; monthly: string; price: string; current: string; naca: boolean;
  rate?: string; down?: string; years?: number; target?: string; source?: string;
};

export function Calculator({ initial }: { initial: CalcInitial }) {
  const [mode, setMode] = useState(initial.mode);
  const [naca, setNaca] = useState(initial.naca);
  const [monthly, setMonthly] = useState(initial.monthly || "2,300");
  const [price, setPrice] = useState(initial.price || "300,000");
  const [current, setCurrent] = useState(initial.current);
  const [down, setDown] = useState(initial.down || "3.5");
  const [rate, setRate] = useState(initial.rate || "6.625");
  const [steps, setSteps] = useState(0); // NACA buy-down steps of 0.125%
  const [years, setYears] = useState(initial.years ?? 30);
  const [taxRate, setTaxRate] = useState("2.0");
  const [insurance, setInsurance] = useState("1,800");
  const [hoa, setHoa] = useState("0");
  const [pmi, setPmi] = useState("0.5");
  const [target, setTarget] = useState(initial.target || "");
  const [sellerCredit, setSellerCredit] = useState("");

  const startRate = num(rate);
  const maxSteps = Math.max(0, Math.floor(r3((startRate - NACA_BUYDOWN.minRate) / NACA_BUYDOWN.step)));
  const effRate = naca ? r3(Math.max(NACA_BUYDOWN.minRate, startRate - steps * NACA_BUYDOWN.step)) : startRate;
  const costs: Costs = {
    downPct: naca ? 0 : Math.min(100, num(down)), ratePct: effRate, years, taxRatePct: num(taxRate),
    insuranceYear: num(insurance), hoaMonth: num(hoa), pmiPct: naca || num(down) >= 20 ? 0 : num(pmi),
  };
  const result = useMemo(() => (mode === "budget" ? priceFromPayment(num(monthly), costs) : paymentFromPrice(num(price), costs)), [mode, monthly, price, JSON.stringify(costs)]); // eslint-disable-line react-hooks/exhaustive-deps
  const shock = current.trim() ? paymentShock(num(current), result.total) : null;

  // NACA buy-down cost for the chosen steps, split between seller credit (max 10% of price) and buyer.
  const buydown = naca && steps > 0 ? nacaBuydownCost(result.loan, startRate, effRate, years) : 0;
  const sellerCap = (result.price * NACA_BUYDOWN.sellerCapPct) / 100;
  const fromSeller = Math.min(buydown, sellerCap, num(sellerCredit));
  const fromBuyer = Math.max(0, buydown - fromSeller);

  // Make it affordable: NACA buy-down to an approved payment, or the down payment needed for a target.
  const goal = num(target);
  const nacaFix = naca && mode === "price" && goal > 0 ? nacaBuydownToAfford(num(price), goal, startRate, { years, taxRatePct: num(taxRate), insuranceYear: num(insurance), hoaMonth: num(hoa) }) : undefined;
  const downFix = !naca && mode === "price" && goal > 0 ? downPaymentForPayment(num(price), goal, { ratePct: startRate, years, taxRatePct: num(taxRate), insuranceYear: num(insurance), hoaMonth: num(hoa), pmiPct: num(pmi) }) : undefined;

  return (
    <div className="stack" style={{ gap: 16 }}>
      {initial.source && <p className="notice small" style={{ margin: 0 }}>Filled in from {initial.source}. Change anything.</p>}
      <nav className="grid-2" aria-label="Calculator">
        <button type="button" className={`btn block ${mode === "budget" ? "dark" : ""}`} onClick={() => setMode("budget")}>What can I afford?</button>
        <button type="button" className={`btn block ${mode === "price" ? "dark" : ""}`} onClick={() => setMode("price")}>Monthly payment</button>
      </nav>

      <label className="card row" style={{ cursor: "pointer", flexDirection: "row", alignItems: "flex-start", background: naca ? "#eef7f2" : undefined }}>
        <input type="checkbox" checked={naca} onChange={(e) => { setNaca(e.target.checked); setSteps(0); }} style={{ width: 22, height: 22, marginTop: 2 }} />
        <span className="stack" style={{ gap: 0 }}>
          <span className="strong">NACA mortgage</span>
          <span className="tiny muted">No down payment, no closing costs or fees, no mortgage insurance. NACA approves a maximum monthly payment, and the rate can be bought down.</span>
        </span>
      </label>

      <section className="card" style={{ gap: 12 }}>
        {mode === "budget"
          ? <Field id="monthly" label={naca ? "Approved monthly payment" : "Monthly budget (all-in)"} value={monthly} onChange={setMonthly} suffix="/mo" hint="Including taxes, insurance and HOA." />
          : <Field id="price" label="Home price" value={price} onChange={setPrice} />}
        <div className="grid-2">
          {!naca && <Field id="down" label="Down payment" value={down} onChange={setDown} suffix="%" />}
          <Field id="rate" label={naca ? "NACA rate (before buy-down)" : "Interest rate"} value={rate} onChange={(v) => { setRate(v); setSteps(0); }} suffix="%" hint="Use today's rate from the lender or naca.com." />
          <div className="field">
            <label htmlFor="years">Term</label>
            <select id="years" className="input" value={years} onChange={(e) => setYears(Number(e.target.value))}>
              {[30, 20, 15].map((y) => <option key={y} value={y}>{y} years</option>)}
            </select>
          </div>
          <Field id="tax" label="Property tax" value={taxRate} onChange={setTaxRate} suffix="%/yr" />
          <Field id="ins" label="Insurance" value={insurance} onChange={setInsurance} suffix="/yr" />
          <Field id="hoa" label="HOA" value={hoa} onChange={setHoa} suffix="/mo" />
          {!naca && num(down) < 20 && <Field id="pmi" label="Mortgage insurance" value={pmi} onChange={setPmi} suffix="%/yr" />}
        </div>

        {naca && (
          <div className="card" style={{ gap: 8, background: "#f6fbf8" }}>
            <span className="small strong">Buy down the rate</span>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn" aria-label="Raise the rate 0.125%" onClick={() => setSteps((n) => Math.max(0, n - 1))} disabled={steps === 0} style={{ width: 48, padding: 0, fontSize: 20 }}>+</button>
              <span className="tabular strong" style={{ fontSize: 24, flex: 1, textAlign: "center" }} aria-live="polite">{effRate.toFixed(3)}%</span>
              <button type="button" className="btn" aria-label="Lower the rate 0.125%" onClick={() => setSteps((n) => Math.min(maxSteps, n + 1))} disabled={steps >= maxSteps} style={{ width: 48, padding: 0, fontSize: 20 }}>−</button>
            </div>
            <span className="tiny muted" style={{ textAlign: "center" }}>Each tap lowers the rate 0.125%. NACA: on 30- and 20-year loans, 1.5% of the mortgage buys 0.25% off (1% on 15-year). Lowest rate 0.125%.</span>
            {steps > 0 && (
              <>
                <span className="small">Buy-down cost: <span className="strong tabular">{usd(buydown)}</span> ({steps} step{steps > 1 ? "s" : ""})</span>
                <Field id="seller" label="Seller credit toward the buy-down" value={sellerCredit} onChange={setSellerCredit} hint={`Seller-paid buy-down can be up to 10% of the price (${usd(sellerCap)}).`} />
                <span className="small">From the seller: <span className="strong tabular">{usd(fromSeller)}</span> · From the buyer (savings, family, grants, employer…): <span className="strong tabular">{usd(fromBuyer)}</span></span>
              </>
            )}
          </div>
        )}

        {mode === "price" && (
          <Field id="target" label={naca ? "Approved monthly payment" : "Desired monthly payment"} value={target} onChange={setTarget} suffix="/mo" hint={naca ? "Shows the buy-down needed to fit the approval." : "Shows the down payment needed to hit it."} />
        )}
        <Field id="current" label="Rent or payment today (optional)" value={current} onChange={setCurrent} suffix="/mo" hint="Shows the payment shock: the extra each month to save and practice with." />
      </section>

      {nacaFix !== undefined && (
        <section className={`card status-card ${nacaFix && !nacaFix.needed ? "status-approved" : nacaFix ? "status-countered" : "status-declined"}`} aria-live="polite">
          {nacaFix === null && <span className="small"><span className="strong">Not affordable at this price</span>, even with the rate bought all the way down to {NACA_BUYDOWN.minRate}%.</span>}
          {nacaFix && !nacaFix.needed && <span className="small"><span className="strong">✓ Fits the {usd(goal)}/mo approval</span> with no buy-down ({usd(nacaFix.payment)}/mo).</span>}
          {nacaFix && nacaFix.needed && (
            <>
              <span className="small"><span className="strong">To fit {usd(goal)}/mo:</span> buy the rate down to <span className="strong">{nacaFix.rate.toFixed(3)}%</span> ({usd(nacaFix.payment)}/mo).</span>
              <span className="small">Buy-down needed: <span className="strong tabular">{usd(nacaFix.cost)}</span>. The seller can cover up to {usd(nacaFix.sellerMax)}{nacaFix.cost <= nacaFix.sellerMax ? " (all of it)" : <>; the other <span className="strong">{usd(nacaFix.cost - nacaFix.sellerMax)}</span> comes from the buyer or another documented source (savings, family, grants)</>}.</span>
              <button type="button" className="btn block" style={{ background: "#fff" }} onClick={() => setSteps(Math.round((startRate - nacaFix.rate) / NACA_BUYDOWN.step))}>Use {nacaFix.rate.toFixed(3)}%</button>
            </>
          )}
        </section>
      )}
      {downFix !== undefined && (
        <section className={`card status-card ${downFix ? "status-approved" : "status-declined"}`} aria-live="polite">
          {downFix
            ? <span className="small">{downFix.downPct === 0 ? <><span className="strong">✓ Fits {usd(goal)}/mo</span> with no down payment needed.</> : <><span className="strong">Down payment needed for {usd(goal)}/mo:</span> <span className="strong tabular">{usd(downFix.amount)}</span> ({downFix.downPct}%){downFix.downPct >= 20 ? ", which also removes mortgage insurance" : ""}.</>}</span>
            : <span className="small"><span className="strong">Can&apos;t reach {usd(goal)}/mo</span> at this price; taxes, insurance and HOA alone are higher.</span>}
          {downFix && downFix.downPct > 0 && <button type="button" className="btn block" style={{ background: "#fff" }} onClick={() => setDown(String(downFix.downPct))}>Use {downFix.downPct}% down</button>}
        </section>
      )}

      <section className="card dark" aria-live="polite" style={{ gap: 8 }}>
        <span className="small muted">{mode === "budget" ? "Homes up to about" : "Estimated monthly payment"}</span>
        <span className="tabular" style={{ fontSize: 38, fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>
          {mode === "budget" ? usd(Math.round(result.price / 1000) * 1000) : `${usd(result.total)}/mo`}
        </span>
        <span className="small muted tabular">
          {mode === "budget" ? `${usd(result.total)}/mo all-in · ` : ""}Loan {usd(result.loan)} at {effRate.toFixed(3)}%{naca ? " · $0 down" : ` · ${usd(result.price - result.loan)} down`}
        </span>
        <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", background: "#2a3136" }} aria-hidden="true">
          {PARTS.map((p) => result[p.key] > 0 && <span key={p.key} style={{ width: `${(result[p.key] / result.total) * 100}%`, background: p.color }} />)}
        </div>
        <ul className="stack small" style={{ listStyle: "none", margin: 0, padding: 0, gap: 4 }}>
          {PARTS.filter((p) => result[p.key] > 0).map((p) => (
            <li key={p.key} className="between" style={{ color: "#fff" }}>
              <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: p.color }} />{p.label}</span>
              <span className="tabular strong">{usd(result[p.key])}</span>
            </li>
          ))}
        </ul>
        {naca && steps > 0 && <span className="small" style={{ color: "#fff" }}>Includes a {usd(buydown)} buy-down to {effRate.toFixed(3)}%.</span>}
        {shock !== null && (
          <span className="small" style={{ color: "#fff", borderTop: "1px solid #3a4248", paddingTop: 8 }}>
            Payment shock: <span className="strong tabular">{usd(shock)}/mo</span> more than today{naca ? ". NACA members save this amount each month before buying." : "."}
          </span>
        )}
      </section>
      <p className="tiny muted" style={{ margin: 0 }}>Estimates only. Taxes, insurance and rates vary; the lender&apos;s Loan Estimate is final. NACA buy-down rules from naca.com.</p>
    </div>
  );
}
