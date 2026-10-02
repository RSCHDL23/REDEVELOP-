"use client";

import { useMemo, useState } from "react";
import { paymentFromPrice, paymentShock, priceFromPayment, type Costs } from "@/lib/core/mortgage";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = (s: string) => { const n = Number(s.replace(/[$,%\s]/g, "")); return Number.isFinite(n) ? n : 0; };

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

export function Calculator({ initial }: { initial: { mode: "budget" | "price"; monthly: string; price: string; current: string; naca: boolean } }) {
  const [mode, setMode] = useState(initial.mode);
  const [naca, setNaca] = useState(initial.naca);
  const [monthly, setMonthly] = useState(initial.monthly || "2,300");
  const [price, setPrice] = useState(initial.price || "300,000");
  const [current, setCurrent] = useState(initial.current);
  const [down, setDown] = useState("3.5");
  const [rate, setRate] = useState("6.625");
  const [years, setYears] = useState(30);
  const [taxRate, setTaxRate] = useState("2.0");
  const [insurance, setInsurance] = useState("1,800");
  const [hoa, setHoa] = useState("0");
  const [pmi, setPmi] = useState("0.5");

  const costs: Costs = {
    downPct: naca ? 0 : Math.min(100, num(down)), ratePct: num(rate), years, taxRatePct: num(taxRate),
    insuranceYear: num(insurance), hoaMonth: num(hoa), pmiPct: naca || num(down) >= 20 ? 0 : num(pmi),
  };
  const result = useMemo(() => (mode === "budget" ? priceFromPayment(num(monthly), costs) : paymentFromPrice(num(price), costs)), [mode, monthly, price, JSON.stringify(costs)]); // eslint-disable-line react-hooks/exhaustive-deps
  const shock = current.trim() ? paymentShock(num(current), result.total) : null;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <nav className="grid-2" aria-label="Calculator">
        <button type="button" className={`btn block ${mode === "budget" ? "dark" : ""}`} onClick={() => setMode("budget")}>What can I afford?</button>
        <button type="button" className={`btn block ${mode === "price" ? "dark" : ""}`} onClick={() => setMode("price")}>Monthly payment</button>
      </nav>

      <label className="card row" style={{ cursor: "pointer", flexDirection: "row", alignItems: "flex-start", background: naca ? "#eef7f2" : undefined }}>
        <input type="checkbox" checked={naca} onChange={(e) => setNaca(e.target.checked)} style={{ width: 22, height: 22, marginTop: 2 }} />
        <span className="stack" style={{ gap: 0 }}>
          <span className="strong">NACA mortgage</span>
          <span className="tiny muted">No down payment, no closing costs or fees, no mortgage insurance. NACA approves a maximum monthly payment.</span>
        </span>
      </label>

      <section className="card" style={{ gap: 12 }}>
        {mode === "budget"
          ? <Field id="monthly" label={naca ? "Approved monthly payment" : "Monthly budget (all-in)"} value={monthly} onChange={setMonthly} suffix="/mo" hint="Including taxes, insurance and HOA." />
          : <Field id="price" label="Home price" value={price} onChange={setPrice} />}
        <div className="grid-2">
          {!naca && <Field id="down" label="Down payment" value={down} onChange={setDown} suffix="%" />}
          <Field id="rate" label="Interest rate" value={rate} onChange={setRate} suffix="%" hint="Use today's rate from the lender or naca.com." />
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
        <Field id="current" label="Rent or payment today (optional)" value={current} onChange={setCurrent} suffix="/mo" hint="Shows the payment shock: the extra each month to save and practice with." />
      </section>

      <section className="card dark" aria-live="polite" style={{ gap: 8 }}>
        <span className="small muted">{mode === "budget" ? "Homes up to about" : "Estimated monthly payment"}</span>
        <span className="tabular" style={{ fontSize: 38, fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>
          {mode === "budget" ? usd(Math.round(result.price / 1000) * 1000) : `${usd(result.total)}/mo`}
        </span>
        <span className="small muted tabular">
          {mode === "budget" ? `${usd(result.total)}/mo all-in · ` : ""}Loan {usd(result.loan)}{naca ? " · $0 down" : ` · ${usd(result.price - result.loan)} down`}
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
        {shock !== null && (
          <span className="small" style={{ color: "#fff", borderTop: "1px solid #3a4248", paddingTop: 8 }}>
            Payment shock: <span className="strong tabular">{usd(shock)}/mo</span> more than today{naca ? ". NACA members save this amount each month before buying." : "."}
          </span>
        )}
      </section>
      <p className="tiny muted" style={{ margin: 0 }}>Estimates only. Taxes, insurance and rates vary; the lender&apos;s Loan Estimate is final.</p>
    </div>
  );
}
