/** Builds the messages for a showing request (first send, reminder, resend, arrival). */
import { deviceLink, nudgeDraft, type Draft, type RequestDetails, type Sender } from "@/lib/core/messages";
import { formatClock } from "@/lib/core/time";
import { dateOf, minutesOfDay, prettyDate } from "./dates";
import type { License, MapApp, Profile, ShowingRequest } from "./types";

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
  name: me.fullName, brokerage: me.brokerage, phone: me.phone, email: me.email, licenseId: licenseIdFor(licenses, state),
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
