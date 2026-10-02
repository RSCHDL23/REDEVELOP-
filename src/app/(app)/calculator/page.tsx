import type { Metadata } from "next";
import { BackLink } from "@/components/ui";
import { Calculator } from "./Calculator";

export const metadata: Metadata = { title: "Mortgage calculator" };

type SP = { mode?: string; monthly?: string; price?: string; current?: string; naca?: string; rate?: string; down?: string; years?: string; target?: string; from?: string };

export default async function CalculatorPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const clean = (v?: string) => (v && /^[\d,.]{1,9}$/.test(v) ? Number(v.replace(/,/g, "")).toLocaleString("en-US") : "");
  const dec = (v?: string) => (v && /^\d{1,2}(\.\d{1,3})?$/.test(v) ? v : "");
  const years = Number(sp.years);
  return (
    <main className="page">
      <BackLink href="/resources" label="REsource" />
      <header className="stack" style={{ gap: 4 }}>
        <h1 className="page-title">Mortgage calculator</h1>
        <p className="page-sub">See what a monthly budget buys, what a home costs each month, the down payment for a target payment, and NACA rate buy-downs.</p>
      </header>
      <Calculator initial={{
        mode: sp.mode === "price" ? "price" : "budget", monthly: clean(sp.monthly), price: clean(sp.price), current: clean(sp.current), naca: sp.naca === "1",
        rate: dec(sp.rate), down: dec(sp.down), years: [15, 20, 30].includes(years) ? years : undefined, target: clean(sp.target),
        source: sp.from === "preapproval" ? "the pre-approval" : sp.from === "estimate" ? "the monthly payment you want" : undefined,
      }} />
    </main>
  );
}
