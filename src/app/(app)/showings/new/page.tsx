import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { nextSaturday } from "@/lib/data/dates";
import { BackLink } from "@/components/ui";
import { NewRequestForm } from "./NewRequestForm";

export const metadata: Metadata = { title: "Request a showing" };

export default async function NewShowingPage({ searchParams }: { searchParams: Promise<{ listing?: string; client?: string; date?: string; time?: string; minutes?: string; address?: string }> }) {
  const { listing, client, date, time, minutes, address } = await searchParams;
  const startAt = /^\d{2}:\d{2}$/.test(time ?? "") ? Number(time!.slice(0, 2)) * 60 + Number(time!.slice(3, 5)) : undefined;
  const len = Number(minutes);
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
          methods: l.listingAgent.onApp ? ["app"] : l.listingAgent.contact.methods,
          beds: l.beds, baths: l.baths, sqft: l.sqft, price: l.price,
          minutes: l.showingMinutes,
          instant: l.instantShowings,
        }))}
        clients={clients.map((c) => ({ id: c.id, name: c.name, preApproved: c.preApproved }))}
        defaultListing={listing}
        defaultClient={client}
        defaultDate={/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? date! : nextSaturday()}
        defaultStart={startAt}
        defaultMinutes={len >= 15 && len <= 180 ? len : undefined}
        defaultAddress={address?.slice(0, 160)}
      />
    </main>
  );
}
