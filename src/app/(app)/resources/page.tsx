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
      <ResourceBrowser faqs={FAQS} sections={SECTIONS} mine={me.myResources} assocs={memberships.map((m) => ({ name: m.name, url: m.url, kind: m.kind }))} />
    </main>
  );
}
