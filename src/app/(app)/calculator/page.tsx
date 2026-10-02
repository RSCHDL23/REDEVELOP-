import type { Metadata } from "next";
import { BackLink } from "@/components/ui";
import { Calculator } from "./Calculator";

export const metadata: Metadata = { title: "Mortgage calculator" };

export default async function CalculatorPage({ searchParams }: { searchParams: Promise<{ mode?: string; monthly?: string; price?: string; current?: string; naca?: string }> }) {
  const sp = await searchParams;
  const clean = (v?: string) => (v && /^[\d,.]{1,9}$/.test(v) ? Number(v.replace(/,/g, "")).toLocaleString("en-US") : "");
  return (
    <main className="page">
      <BackLink href="/resources" label="REsource" />
      <header className="stack" style={{ gap: 4 }}>
        <h1 className="page-title">Mortgage calculator</h1>
        <p className="page-sub">See what a monthly budget buys, or what a home costs each month, including NACA&apos;s no-down-payment mortgage.</p>
      </header>
      <Calculator initial={{ mode: sp.mode === "price" ? "price" : "budget", monthly: clean(sp.monthly), price: clean(sp.price), current: clean(sp.current), naca: sp.naca === "1" }} />
    </main>
  );
}
