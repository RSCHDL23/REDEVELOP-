import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { BackLink } from "@/components/ui";
import { HoursForm } from "./HoursForm";

export const metadata: Metadata = { title: "Weekly hours" };

export default async function AvailabilityPage() {
  const hours = await repo().getWeeklyHours();
  return (
    <main className="page">
      <BackLink href="/profile" label="Profile" />
      <header className="stack" style={{ gap: 4 }}>
        <h1 className="page-title">Weekly hours</h1>
        <p className="page-sub">When you&apos;re free to show homes or meet. The tour scheduler only books inside these hours.</p>
      </header>
      <HoursForm hours={hours} />
      <div className="card small">
        <span className="strong">Calendar sync</span>
        <span className="muted">Google and Apple calendar sync is coming next, so busy events block time automatically.</span>
      </div>
    </main>
  );
}
