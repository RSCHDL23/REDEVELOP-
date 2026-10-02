import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { nextSaturday } from "@/lib/data/dates";
import { licenseIdFor } from "@/lib/data/requestMessages";
import { appOrigin } from "@/lib/server/origin";
import { TourBuilder } from "./TourBuilder";

export const metadata: Metadata = { title: "Auto-schedule a tour" };

export default async function TourPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: asked } = await searchParams;
  const date = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : nextSaturday();
  const [me, ctx, licenses] = await Promise.all([repo().getMe(), repo().getTourContext(date), repo().listLicenses()]);
  return (
    <main className="page">
      <header className="stack" style={{ gap: 4 }}>
        <h1 className="page-title">Auto-schedule a tour</h1>
        <p className="page-sub">Pick the homes. REschedule fits them around everyone&apos;s calendar and the shortest drive.</p>
      </header>
      <TourBuilder ctx={ctx} origin={await appOrigin()} places={{ home: me.home, office: me.office }} sender={{ name: me.fullName, brokerage: me.brokerage, phone: me.phone, email: me.email, licenseId: licenseIdFor(licenses, ctx.homes[0]?.listing.state) }} />
    </main>
  );
}
