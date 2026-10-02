import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { dateOf, minutesOfDay, prettyDate } from "@/lib/data/dates";
import { arrivalTexts, directionsLink, MAP_APPS, smsLink } from "@/lib/data/requestMessages";
import { formatClock } from "@/lib/core/time";
import { BackLink } from "@/components/ui";
import { HomeSnapshot } from "@/components/HomeSnapshot";
import { VisitFlow } from "./VisitFlow";

export const metadata: Metadata = { title: "Showing" };

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = repo();
  const [requests, me, clients] = await Promise.all([r.listRequests(), r.getMe(), r.listClients()]);
  const visit = requests.find((x) => x.id === id && x.direction === "sent");
  if (!visit) notFound();

  const day = dateOf(visit.startsAt);
  const next = requests
    .filter((x) => x.direction === "sent" && x.id !== visit.id && (x.status === "approved" || x.status === "pending") && dateOf(x.startsAt) === day && x.startsAt > visit.startsAt)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const client = clients.find((c) => c.id === visit.clientId) ?? clients.find((c) => c.name === visit.buyerLabel);
  const texts = arrivalTexts(visit, me);
  const fullAddress = (h: { address: string; city: string }) => [h.address, h.city].filter(Boolean).join(", ");
  const preferred = MAP_APPS.find((m) => m.id === me.mapApp) ?? MAP_APPS[0];

  return (
    <main className="page">
      <BackLink href="/showings?tab=sent" label="Showings" />
      <section className={`card status-card status-${visit.status}`}>
        <div className="row" style={{ alignItems: "flex-start" }}>
          {visit.photoUrl && <img src={visit.photoUrl} alt={`Photo of ${visit.address}`} className="thumb" />}
          <div className="stack" style={{ gap: 2 }}>
            <HomeSnapshot home={visit.home} className="strong" />
            <span className="small tabular strong">{prettyDate(day)} · {formatClock(minutesOfDay(visit.startsAt))}–{formatClock(minutesOfDay(visit.endsAt))}</span>
            <span className="small muted">{visit.buyerLabel} · {visit.otherAgent.name}</span>
          </div>
        </div>
        <a className="btn block" style={{ background: "#fff" }} href={directionsLink(preferred.id, fullAddress(visit.home))} target="_blank" rel="noreferrer">Directions in {preferred.label}</a>
      </section>

      <VisitFlow
        id={visit.id}
        arrivedAt={visit.arrivedAt}
        feedbackSent={!!visit.feedback}
        listingAgent={{ name: visit.otherAgent.name, onApp: visit.otherAgent.onApp, textHref: visit.otherAgent.phone ? smsLink(visit.otherAgent.phone, texts.listingSide) : null }}
        party={client?.phone ? [{ name: client.name, href: smsLink(client.phone, texts.party) }] : []}
        next={next ? {
          id: next.id,
          address: next.address,
          time: `${formatClock(minutesOfDay(next.startsAt))}–${formatClock(minutesOfDay(next.endsAt))}`,
          confirmed: next.status === "approved",
          home: next.home,
          preferred: { label: preferred.label, href: directionsLink(preferred.id, fullAddress(next.home)) },
          others: MAP_APPS.filter((m) => m.id !== preferred.id).map((m) => ({ label: m.label, href: directionsLink(m.id, fullAddress(next.home)) })),
        } : null}
      />
    </main>
  );
}
