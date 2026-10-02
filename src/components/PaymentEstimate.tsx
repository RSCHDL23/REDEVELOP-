"use client";

import { useState } from "react";
import Link from "next/link";
import { paymentFromPrice, paymentShock } from "@/lib/core/mortgage";
import { greetingName } from "@/lib/core/closing";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = (s: string) => { const n = Number(s.replace(/[$,%\s]/g, "")); return Number.isFinite(n) ? n : 0; };

/**
 * "What would this home cost each month?" for a property during a showing.
 * Uses the buyer's program (NACA: no down payment or mortgage insurance) and
 * checks the payment against their approved monthly amount.
 */
export function PaymentEstimate({ price, buyer }: {
  price: number | null;
  buyer?: { name: string; naca: boolean; approvedMonthly: number | null; currentHousing: number | null };
}) {
  const [naca, setNaca] = useState(!!buyer?.naca);
  const [p, setP] = useState(price ? price.toLocaleString("en-US") : "");
  const [down, setDown] = useState(buyer?.naca ? "0" : "3.5");
  const [rate, setRate] = useState("6.625");
  const [tax, setTax] = useState("2.0");
  const [ins, setIns] = useState("1,800");
  const [hoa, setHoa] = useState("0");
  const [more, setMore] = useState(false);

  const downPct = naca ? 0 : Math.min(100, num(down));
  const r = paymentFromPrice(num(p), {
    downPct, ratePct: num(rate), years: 30, taxRatePct: num(tax), insuranceYear: num(ins), hoaMonth: num(hoa),
    pmiPct: naca || downPct >= 20 ? 0 : 0.5,
  });
  const approved = buyer?.approvedMonthly ?? null;
  const shock = buyer?.currentHousing != null ? paymentShock(buyer.currentHousing, r.total) : null;
  const who = buyer ? greetingName(buyer.name) : "";
  const whose = who.endsWith("s") ? `${who}'` : `${who}'s`; // "The Greens'", "Ana's"
  const calc = `/calculator?mode=price&price=${Math.round(num(p))}${naca ? "&naca=1" : ""}${buyer?.currentHousing != null ? `&current=${buyer.currentHousing}` : ""}`;

  return (
    <section className="card" style={{ gap: 10 }} aria-label="Monthly payment estimate">
      <div className="between">
        <span className="strong">🧮 What would it cost?</span>
        <label className="row small" style={{ gap: 4, cursor: "pointer" }}>
          <input type="checkbox" checked={naca} onChange={(e) => setNaca(e.target.checked)} style={{ width: 18, height: 18 }} /> NACA
        </label>
      </div>
      <div className="grid-3">
        <div className="field"><label className="tiny strong" htmlFor="pe-price">Price</label><input id="pe-price" className="input" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} placeholder="List price" style={{ padding: "0 8px" }} /></div>
        <div className="field"><label className="tiny strong" htmlFor="pe-down">Down %</label><input id="pe-down" className="input" inputMode="decimal" value={naca ? "0" : down} disabled={naca} onChange={(e) => setDown(e.target.value)} style={{ padding: "0 8px" }} /></div>
        <div className="field"><label className="tiny strong" htmlFor="pe-rate">Rate %</label><input id="pe-rate" className="input" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} style={{ padding: "0 8px" }} /></div>
      </div>
      {more && (
        <div className="grid-3">
          <div className="field"><label className="tiny strong" htmlFor="pe-tax">Tax %/yr</label><input id="pe-tax" className="input" inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} style={{ padding: "0 8px" }} /></div>
          <div className="field"><label className="tiny strong" htmlFor="pe-ins">Insurance/yr</label><input id="pe-ins" className="input" inputMode="decimal" value={ins} onChange={(e) => setIns(e.target.value)} style={{ padding: "0 8px" }} /></div>
          <div className="field"><label className="tiny strong" htmlFor="pe-hoa">HOA/mo</label><input id="pe-hoa" className="input" inputMode="decimal" value={hoa} onChange={(e) => setHoa(e.target.value)} style={{ padding: "0 8px" }} /></div>
        </div>
      )}
      {num(p) > 0 ? (
        <div className="stack" style={{ gap: 4 }} aria-live="polite">
          <span><span className="tabular" style={{ fontSize: 28, fontWeight: 900 }}>{usd(r.total)}</span><span className="small muted">/mo, all-in</span></span>
          <span className="tiny muted tabular">
            P&amp;I {usd(r.pi)} · taxes {usd(r.tax)} · insurance {usd(r.insurance)}{r.hoa ? ` · HOA ${usd(r.hoa)}` : ""}{r.pmi ? ` · PMI ${usd(r.pmi)}` : ""} · {naca ? "$0 down" : `${usd(r.price - r.loan)} down`}
          </span>
          {approved !== null && (
            <span className="small strong" style={{ color: r.total <= approved ? "var(--green)" : "var(--red)" }}>
              {r.total <= approved ? `✓ Within ${whose} approved ${usd(approved)}/mo` : `✕ ${usd(r.total - approved)}/mo over ${whose} approved ${usd(approved)}`}
            </span>
          )}
          {shock !== null && shock > 0 && <span className="small">Payment shock: {usd(shock)}/mo more than today</span>}
        </div>
      ) : (
        <span className="small muted">Add the price to see the monthly payment.</span>
      )}
      <div className="between">
        <button type="button" className="btn" style={{ minHeight: 32, fontSize: 12 }} onClick={() => setMore((v) => !v)}>{more ? "Fewer options" : "Taxes, insurance, HOA"}</button>
        <Link href={calc} className="small">Full calculator →</Link>
      </div>
    </section>
  );
}
