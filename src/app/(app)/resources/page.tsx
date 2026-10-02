import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { FAQS, SECTIONS } from "@/lib/core/resources";
import { ResourceBrowser } from "./ResourceBrowser";

export const metadata: Metadata = { title: "REsource" };

export default async function ResourcesPage() {
  const r = repo();
  const [me, memberships] = await Promise.all([r.getMe(), r.listMemberships()]);
  return (
    <main className="page">
      <header className="stack" style={{ gap: 4 }}>
        <h1 className="page-title">REsource</h1>
        <p className="page-sub">Quick answers with the official sources, your association forms, and help to share with clients, from first-time buyer grants to property tax appeals.</p>
      </header>
      <a href="/calculator" className="card row" style={{ flexDirection: "row", gap: 12, alignItems: "center", color: "var(--ink)" }}>
        <span className="avatar" style={{ borderRadius: 12 }} aria-hidden="true">🧮</span>
        <span className="stack" style={{ gap: 0, flex: 1 }}><span className="strong">Mortgage calculator</span><span className="tiny muted">What a budget buys, the monthly payment, payment shock, NACA</span></span>
        <span aria-hidden="true">›</span>
      </a>
      <ResourceBrowser faqs={FAQS} sections={SECTIONS} mine={me.myResources} assocs={memberships.map((m) => ({ name: m.name, url: m.url, kind: m.kind }))} />
    </main>
  );
}
