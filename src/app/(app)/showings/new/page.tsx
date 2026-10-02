import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { nextSaturday } from "@/lib/data/dates";
import { BackLink } from "@/components/ui";
import { NewRequestForm } from "./NewRequestForm";

export const metadata: Metadata = { title: "Request a showing" };

export default async function NewShowingPage({ searchParams }: { searchParams: Promise<{ listing?: string; client?: string }> }) {
  const { listing, client } = await searchParams;
  const r = repo();
  const [me, listings, clients] = await Promise.all([r.getMe(), r.listListings(), r.listClients()]);
  const others = listings.filter((l) => l.listingAgent.id !== me.id);
  return (
    <main className="page">
      <BackLink href="/showings" label="Showings" />
      <h1 className="page-title">Request a showing</h1>
      <NewRequestForm
        homes={others.map((l) => ({
          id: l.id,
          address: l.address,
          city: `${l.city}, ${l.state}`,
          photoUrl: l.photoUrl,
          source: l.source,
          agent: l.listingAgent.name,
          preferred: l.listingAgent.onApp ? "app" : l.listingAgent.contact.preferred,
          minutes: l.showingMinutes,
          instant: l.instantShowings,
        }))}
        clients={clients.map((c) => ({ id: c.id, name: c.name, preApproved: c.preApproved }))}
        defaultListing={listing}
        defaultClient={client}
        defaultDate={nextSaturday()}
      />
    </main>
  );
}
