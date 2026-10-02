import Link from "next/link";
import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { BackLink } from "@/components/ui";
import { FinancingForm } from "@/components/FinancingForm";
import { calculatorLink } from "@/lib/core/financing";
import { lendersFor, SAMPLE_LENDERS } from "@/lib/core/lenders";
import { NACA_HIGHLIGHTS, NACA_LINKS } from "@/lib/core/naca";
import { estimateFromPayment } from "../financing/actions";

export const metadata: Metadata = { title: "Get ready to buy" };

const digits = (p: string) => p.replace(/[^\d+]/g, "");

export default async function GetReadyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const me = await repo().getMe();
  const f = me.financing;
  const renter = me.selfRoles.some((r) => r === "renter" || r === "tenant");
  const ready = f && f.kind !== "estimate";
  const lenders = lendersFor(isDemoMode ? SAMPLE_LENDERS : [], []);

  const naca = (
    <section className="card" id="naca" style={{ background: "#eef7f2", borderColor: "#b9dcc8" }} aria-labelledby="naca-h">
      <h2 id="naca-h" className="strong" style={{ margin: 0, fontSize: 17 }}>{renter ? "Renting? You may be able to buy with NACA" : "Short on a down payment? Look at NACA"}</h2>
      <p className="small" style={{ margin: 0 }}>NACA (Neighborhood Assistance Corporation of America) is a nonprofit that helps working people and renters become homeowners.</p>
      <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
        {NACA_HIGHLIGHTS.map((h) => <li key={h}>{h}</li>)}
      </ul>
      <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
        <a className="btn dark" href={NACA_LINKS[0].url} target="_blank" rel="noreferrer">See NACA&apos;s steps ↗</a>
        <Link className="btn" href="/calculator?mode=budget&naca=1">NACA calculator</Link>
      </div>
      <span className="tiny muted">From naca.com. NACA sets its own rules and decides who qualifies.</span>
    </section>
  );

  return (
    <main className="page">
      <BackLink href="/today" label="Today" />
      <header className="stack" style={{ gap: 4 }}>
        <h1 className="page-title">{renter && !ready ? "Thinking about buying?" : "Get ready to buy"}</h1>
        <p className="page-sub">Sellers and listing agents want to see a pre-approval (or proof of funds if you&apos;re paying cash) before showings and offers.</p>
      </header>

      {renter && !ready && naca}

      <section className="card accent" aria-labelledby="have-h">
        <h2 id="have-h" className="strong" style={{ margin: 0, fontSize: 17 }}>{ready ? "Your financing" : "1. Upload your pre-approval or proof of funds"}</h2>
        {!ready && <p className="small muted" style={{ margin: 0 }}>Upload the letter and we&apos;ll fill in the terms. Paying cash? Pick &ldquo;Cash&rdquo; and upload a recent bank or brokerage statement.</p>}
        <FinancingForm target="me" current={f} />
        {me.myAgent && <span className="tiny muted">Shared with your agent, {me.myAgent.name}.</span>}
      </section>

      {!ready && (
        <section className="card" aria-labelledby="lender-h">
          <h2 id="lender-h" className="strong" style={{ margin: 0, fontSize: 17 }}>2. No pre-approval yet? Talk to a lender</h2>
          {me.myAgent && <p className="small" style={{ margin: 0 }}>Your agent, {me.myAgent.name}, can also recommend lenders they trust.</p>}
          {lenders.length === 0 && <p className="small muted" style={{ margin: 0 }}>Lenders in your area will show here soon.</p>}
          {lenders.map((l) => (
            <article key={l.id} className="card" style={{ gap: 6, background: "#fafbfc" }} aria-label={`Sponsored: ${l.name}`}>
              <div className="between">
                <span className="strong">{l.name}</span>
                <span className="pill">Sponsored</span>
              </div>
              <span className="small muted">{l.company} · NMLS #{l.nmls} · {l.areas}</span>
              <span className="small">{l.programs.join(" · ")}</span>
              <span className="tiny muted">{l.rating ? `★ ${l.rating.toFixed(1)} from ${l.reviews} verified reviews` : "New: no verified reviews yet"}</span>
              <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                <a className="btn" href={`tel:${digits(l.phone)}`}>Call</a>
                <a className="btn" href={`sms:${digits(l.phone)}`}>Text</a>
                <a className="btn" href={`mailto:${l.email}?subject=${encodeURIComponent("Pre-approval for a home purchase")}`}>Email</a>
                <a className="btn" href={l.website} target="_blank" rel="noreferrer">Website ↗</a>
              </div>
            </article>
          ))}
          <p className="tiny muted" style={{ margin: 0 }}>
            Sponsored lenders pay to be listed here. REschedule isn&apos;t paid when you get a loan and doesn&apos;t recommend one lender over another. Compare offers from at least three lenders. You can check any loan officer at <a href="https://www.nmlsconsumeraccess.org" target="_blank" rel="noreferrer">NMLS Consumer Access ↗</a>.
          </p>
        </section>
      )}

      {!ready && (
        <section className="card" aria-labelledby="est-h">
          <h2 id="est-h" className="strong" style={{ margin: 0, fontSize: 17 }}>3. Not ready for a lender? Get an estimate</h2>
          <p className="small muted" style={{ margin: 0 }}>Tell us the monthly payment you&apos;re comfortable with. The calculator shows about how much home that buys, with taxes and insurance.</p>
          <form action={estimateFromPayment} className="row" style={{ gap: 8, alignItems: "flex-end" }}>
            <div className="field" style={{ flex: 1 }}>
              <label className="small strong" htmlFor="monthly">Monthly payment you want</label>
              <input id="monthly" name="monthly" className="input" inputMode="decimal" placeholder="$2,000" defaultValue={f?.kind === "estimate" && f.amount ? f.amount.toLocaleString("en-US") : ""} required />
            </div>
            <button className="btn primary">Estimate</button>
          </form>
          {error === "monthly" && <p className="error" role="alert" style={{ margin: 0 }}>Type a monthly payment between $300 and $100,000.</p>}
          {f?.kind === "estimate" && <Link href={calculatorLink(f)} className="small">Open your last estimate →</Link>}
          <span className="tiny muted">This is an estimate, not a loan approval.</span>
        </section>
      )}

      {!renter || ready ? naca : null}
    </main>
  );
}
