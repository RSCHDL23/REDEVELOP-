import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { todayISO } from "@/lib/data/dates";
import { BackLink } from "@/components/ui";
import { NewDealForm } from "./NewDealForm";

export const metadata: Metadata = { title: "New deal" };

export default async function NewDealPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const r = repo();
  const [clients, requests, listings, me] = await Promise.all([r.listClients(), r.listRequests(), r.listListings(), r.getMe()]);
  // Homes to pick from: ones you've shown or requested, and your own listings.
  const seen = new Set<string>();
  const homes: { group: string; address: string; city: string }[] = [];
  for (const x of requests.filter((q) => q.direction === "sent").sort((a, b) => b.startsAt.localeCompare(a.startsAt))) {
    const key = x.address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    homes.push({ group: "Homes you've shown", address: x.address, city: x.home.city });
  }
  for (const l of listings.filter((l) => l.listingAgent.id === me.id)) {
    if (seen.has(l.address.toLowerCase())) continue;
    seen.add(l.address.toLowerCase());
    homes.push({ group: "Your listings", address: l.address, city: `${l.city}, ${l.state}` });
  }
  return (
    <main className="page">
      <BackLink href="/deals" label="Deals" />
      <header className="stack" style={{ gap: 4 }}>
        <h1 className="page-title">New deal</h1>
        <p className="page-sub">Enter the contract dates. Every milestone fills in, counting business days and skipping federal holidays. Change any date to match your contract.</p>
      </header>
      <NewDealForm
        clients={clients.filter((c) => c.stage !== "past").map((c) => ({ id: c.id, name: c.name, intent: c.intent }))}
        defaultClient={client}
        today={todayISO()}
        homes={homes}
      />
    </main>
  );
}
