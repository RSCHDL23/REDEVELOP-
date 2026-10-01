import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { nextSaturday } from "@/lib/data/dates";
import { BackLink } from "@/components/ui";
import { NewRequestForm } from "./NewRequestForm";

export const metadata: Metadata = { title: "Request a showing" };

export default async function NewShowingPage({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  const { listing } = await searchParams;
  const [me, listings] = await Promise.all([repo().getMe(), repo().listListings()]);
  const others = listings.filter((l) => l.listingAgent.id !== me.id);
  return (
    <main className="page">
      <BackLink href="/showings" label="Showings" />
      <h1 className="page-title">Request a showing</h1>
      <NewRequestForm
        listings={others.map((l) => ({
          id: l.id,
          label: `${l.address}, ${l.city}`,
          agent: l.listingAgent.name,
          preferred: l.listingAgent.onApp ? "app" : l.listingAgent.contact.preferred,
          minutes: l.showingMinutes,
          instant: l.instantShowings,
        }))}
        defaultListing={listing}
        defaultDate={nextSaturday()}
      />
    </main>
  );
}
