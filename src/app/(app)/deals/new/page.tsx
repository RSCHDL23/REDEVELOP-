import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { todayISO } from "@/lib/data/dates";
import { BackLink } from "@/components/ui";
import { NewDealForm } from "./NewDealForm";

export const metadata: Metadata = { title: "New deal" };

export default async function NewDealPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const clients = await repo().listClients();
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
      />
    </main>
  );
}
