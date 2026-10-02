/** Builds the messages for a showing request (first send, reminder, resend). */
import { deviceLink, nudgeDraft, type Draft, type RequestDetails, type Sender } from "@/lib/core/messages";
import { formatClock } from "@/lib/core/time";
import { dateOf, minutesOfDay, prettyDate } from "./dates";
import type { Profile, ShowingRequest } from "./types";

export function detailsFor(r: ShowingRequest, preApproved = true): RequestDetails {
  return {
    listingAgentFirstName: r.otherAgent.name.split(" ")[0] || "there",
    address: r.address,
    dayLabel: prettyDate(dateOf(r.startsAt), { weekday: "short", month: "numeric", day: "numeric" }),
    timeLabel: `${formatClock(minutesOfDay(r.startsAt))}–${formatClock(minutesOfDay(r.endsAt))}`,
    buyerNames: r.buyerLabel,
    preApproved,
  };
}

export const senderFrom = (me: Profile): Sender => ({ name: me.fullName, brokerage: me.brokerage, phone: me.phone });

export function nudgeFor(kind: "remind" | "resend", r: ShowingRequest, me: Profile): { draft: Draft; href: string | null } {
  const a = r.otherAgent;
  const draft = nudgeDraft(kind, senderFrom(me), detailsFor(r), { preferred: a.contact.preferred, phone: a.phone, email: a.email, onApp: a.onApp, onlineUrl: a.contact.onlineUrl });
  return { draft, href: deviceLink(draft) };
}

/** The first message for an agent who isn't on REschedule. */
export function sendLinkFor(r: ShowingRequest, me: Profile, preApproved: boolean) {
  const a = r.otherAgent;
  const draft = nudgeDraft("resend", senderFrom(me), detailsFor(r, preApproved), { preferred: a.contact.preferred, phone: a.phone, email: a.email, onApp: false, onlineUrl: a.contact.onlineUrl });
  const label = draft.method === "email" ? `Email ${detailsFor(r).listingAgentFirstName}` : draft.method === "call" ? `Call ${detailsFor(r).listingAgentFirstName}` : draft.method === "online" ? "Open their scheduler" : `Text ${detailsFor(r).listingAgentFirstName}`;
  return { href: deviceLink(draft) ?? "", label, body: draft.body, to: draft.to };
}
