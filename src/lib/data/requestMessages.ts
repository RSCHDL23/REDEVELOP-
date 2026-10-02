/** Builds the messages for a showing request (first send, reminder, resend, arrival). */
import { deviceLink, nudgeDraft, type Draft, type RequestDetails, type Sender } from "@/lib/core/messages";
import { formatClock } from "@/lib/core/time";
import { dateOf, minutesOfDay, prettyDate } from "./dates";
import type { Client, License, MapApp, Profile, ShowingRequest } from "./types";

const AGENT_LICENSES = new Set(["real_estate_broker", "managing_broker"]);

/** The agent's license to quote: the one in the home's state, else their first agent license. */
export function licenseIdFor(licenses: License[], state?: string): string | undefined {
  const agent = licenses.filter((l) => AGENT_LICENSES.has(l.profession) && l.status !== "rejected");
  const pick = agent.find((l) => l.state === state) ?? agent[0];
  return pick ? `${pick.state} ${pick.number}` : undefined;
}

export const stateOf = (cityLine: string) => cityLine.match(/\b([A-Z]{2})\b\s*$/)?.[1];

export function detailsFor(r: ShowingRequest, preApproved = true): RequestDetails {
  return {
    listingAgentFirstName: r.otherAgent.name.split(" ")[0] || "there",
    address: r.address,
    dayLabel: prettyDate(dateOf(r.startsAt), { weekday: "short", month: "numeric", day: "numeric" }),
    timeLabel: `${formatClock(minutesOfDay(r.startsAt))}–${formatClock(minutesOfDay(r.endsAt))}`,
    buyerNames: r.buyerLabel,
    preApproved,
    comments: r.comments || undefined,
  };
}

export const senderFrom = (me: Profile, licenses: License[] = [], state?: string): Sender => ({
  name: me.fullName, brokerage: me.brokerage, phone: me.phone, email: me.email,
  // The agent chooses: license number, MLS agent ID, or both.
  licenseId: me.idInMessages === "mls_id" && me.mlsAgentId ? undefined : licenseIdFor(licenses, state),
  mlsId: me.idInMessages !== "license" && me.mlsAgentId ? me.mlsAgentId : undefined,
});

const contactOf = (r: ShowingRequest, onApp = r.otherAgent.onApp) => {
  const a = r.otherAgent;
  return { preferred: a.contact.preferred, phone: a.phone, email: a.email, onApp, onlineUrl: a.contact.onlineUrl };
};

export function nudgeFor(kind: "remind" | "resend", r: ShowingRequest, me: Profile, licenses: License[] = []): { draft: Draft; href: string | null } {
  const draft = nudgeDraft(kind, senderFrom(me, licenses, stateOf(r.home.city)), detailsFor(r), contactOf(r));
  return { draft, href: deviceLink(draft) };
}

/** The first message for an agent who isn't on REschedule. */
export function sendLinkFor(r: ShowingRequest, me: Profile, preApproved: boolean, licenses: License[] = []) {
  const draft = nudgeDraft("resend", senderFrom(me, licenses, stateOf(r.home.city)), detailsFor(r, preApproved), contactOf(r, false));
  const first = detailsFor(r).listingAgentFirstName;
  const label = draft.method === "email" ? `Email ${first}` : draft.method === "call" ? `Call ${first}` : draft.method === "online" ? "Open their scheduler" : `Text ${first}`;
  return { href: deviceLink(draft) ?? "", label, body: draft.body, to: draft.to };
}

/** "I've arrived" texts for the listing agent (to tell the owners) and the people you're meeting. */
export function arrivalTexts(r: ShowingRequest, me: Profile) {
  const time = formatClock(minutesOfDay(r.startsAt));
  const agentFirst = r.otherAgent.name.split(" ")[0] || "there";
  return {
    listingSide: `Hi ${agentFirst}, ${me.fullName} with ${me.brokerage} here. We've arrived at ${r.address} for our ${time} showing. Please let the owners know. Thank you!`,
    party: `Hi! I'm here at ${r.address} for our ${time} showing. See you inside. ${me.fullName} ${me.phone}`,
  };
}

export const smsLink = (phone: string, body: string) => `sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(body)}`;

export const MAP_APPS: { id: MapApp; label: string }[] = [
  { id: "google", label: "Google Maps" },
  { id: "apple", label: "Apple Maps" },
  { id: "waze", label: "Waze" },
];

export function directionsLink(app: MapApp, address: string): string {
  const q = encodeURIComponent(address);
  if (app === "apple") return `https://maps.apple.com/?daddr=${q}`;
  if (app === "waze") return `https://waze.com/ul?q=${q}&navigate=yes`;
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

/** "Running late" texts with your new arrival time. */
export function lateText(r: ShowingRequest, me: Profile, etaLabel: string, to: "listing" | "party") {
  const agentFirst = r.otherAgent.name.split(" ")[0] || "there";
  return to === "listing"
    ? `Hi ${agentFirst}, ${me.fullName} here. I'm running a few minutes behind for ${r.address}. New ETA ${etaLabel}. Please let the owners know. Sorry about that!`
    : `Hi! I'm running a few minutes behind. I'll be at ${r.address} by about ${etaLabel}. ${me.fullName}`;
}

/** Today's confirmed showings, shaped for leave-on-time and running-late alerts. */
export function tripsFor(requests: ShowingRequest[], clients: Client[], me: Profile, day: string) {
  return requests
    .filter((r) => r.direction === "sent" && r.status === "approved" && dateOf(r.startsAt) === day)
    .map((r) => {
      const client = clients.find((c) => c.id === r.clientId) ?? clients.find((c) => c.name === r.buyerLabel);
      return {
        id: r.id, address: r.address, startsAt: r.startsAt, lat: r.home.lat ?? null, lng: r.home.lng ?? null, arrived: !!r.arrivedAt,
        listingFirst: r.otherAgent.name.split(" ")[0] || "the listing agent", listingOnApp: r.otherAgent.onApp, listingPhone: r.otherAgent.phone,
        listingText: lateText(r, me, "{ETA}", "listing"),
        partyName: client?.name ?? r.buyerLabel, partyPhone: client?.phone ?? "", partyText: lateText(r, me, "{ETA}", "party"),
      };
    });
}
