/**
 * REquest: drafts every way to ask for a showing, in each listing agent's
 * preferred method, plus follow-ups and offer notices.
 */

export type ContactMethod = "app" | "text" | "email" | "call" | "online";

export interface Sender {
  name: string;
  brokerage: string;
  phone: string;
  email?: string;
  /** e.g. "IL 475.123456" */
  licenseId?: string;
  /** MLS agent ID, if the agent chose to show it. */
  mlsId?: string;
}

export interface RequestDetails {
  listingAgentFirstName: string;
  address: string;
  dayLabel: string; // "Sat 10/3"
  timeLabel: string; // "1:00–1:30 PM"
  buyerNames: string;
  preApproved: boolean;
  /** Extra notes typed by the agent. */
  comments?: string;
  /** Private links to attached documents (pre-approval letter…). */
  attachments?: { name: string; url: string }[];
}

const docsLine = (d: RequestDetails) => (d.attachments?.length ? `Attached: ${d.attachments.map((a) => `${a.name} ${a.url}`).join(" · ")}` : "");

export interface Draft {
  method: ContactMethod;
  to: string;
  subject?: string;
  body: string;
  actionLabel: string;
}

const buyers = (d: RequestDetails) => `${d.preApproved ? "pre-approved buyers" : "buyers"}, ${d.buyerNames}`;

const ids = (s: Sender) => [s.licenseId ? `lic. ${s.licenseId}` : null, s.mlsId ? `MLS ID ${s.mlsId}` : null].filter(Boolean).join(", ");
const who = (s: Sender) => `${s.name}${ids(s) ? ` (${ids(s)})` : ""} with ${s.brokerage}`;
const contactLine = (s: Sender) => [s.phone, s.email].filter(Boolean).join(" · ");

export function textRequest(s: Sender, d: RequestDetails): string {
  return [
    `Hi ${d.listingAgentFirstName}, this is ${who(s)}. I would like to show ${d.address} on ${d.dayLabel} from ${d.timeLabel} to my ${buyers(d)}. Does that time work?`,
    d.comments ? `Note: ${d.comments}` : "",
    docsLine(d),
    `Thank you! ${contactLine(s)}`,
  ].filter(Boolean).join(" ");
}

export function emailRequest(s: Sender, d: RequestDetails): { subject: string; body: string } {
  const lines: (string | null)[] = [
    `Hi ${d.listingAgentFirstName},`,
    "",
    `I would like to schedule a showing of ${d.address} for my ${buyers(d)}.`,
    "",
    `Property: ${d.address}`,
    `Date: ${d.dayLabel}`,
    `Time: ${d.timeLabel}`,
    `Buyers: ${d.buyerNames}${d.preApproved ? " (pre-approved, letter attached)" : ""}`,
    "",
    `Requesting agent: ${s.name}`,
    s.licenseId ? `License #: ${s.licenseId}` : null,
    s.mlsId ? `MLS agent ID: ${s.mlsId}` : null,
    `Brokerage: ${s.brokerage}`,
    `Phone: ${s.phone}`,
    s.email ? `Email: ${s.email}` : null,
    ...(d.comments ? ["", `Comments: ${d.comments}`] : []),
    ...(d.attachments?.length ? ["", "Attached documents (private links):", ...d.attachments.map((a) => `• ${a.name}: ${a.url}`)] : []),
    "",
    "Please confirm, or suggest another time that works for your sellers.",
    "",
    "Thank you,",
    s.name,
  ];
  return {
    subject: `Showing request: ${d.address} · ${d.dayLabel}, ${d.timeLabel}`,
    body: lines.filter((l): l is string => l !== null).join("\n"),
  };
}

export function callScript(s: Sender, d: RequestDetails): string {
  return `Hi ${d.listingAgentFirstName}, it is ${who(s)}. I am calling to request a showing at ${d.address} on ${d.dayLabel}, ${d.timeLabel}, for my ${buyers(d)}. Is that time open, and are there any access instructions?`;
}

export function draftsFor(s: Sender, d: RequestDetails, contact: { phone?: string; email?: string; onApp?: boolean; onlineUrl?: string }): Draft[] {
  const drafts: Draft[] = [];
  if (contact.onApp) drafts.push({ method: "app", to: "REschedule inbox", body: `Sent inside REschedule with your buyers, pre-approval and the time. ${d.listingAgentFirstName} approves with one tap.`, actionLabel: "Send in REschedule" });
  if (contact.phone) drafts.push({ method: "text", to: contact.phone, body: textRequest(s, d), actionLabel: "Send text" });
  if (contact.email) {
    const e = emailRequest(s, d);
    drafts.push({ method: "email", to: contact.email, subject: e.subject, body: e.body, actionLabel: "Send email" });
  }
  if (contact.onlineUrl) drafts.push({ method: "online", to: contact.onlineUrl, body: `Opens ${d.listingAgentFirstName}'s online scheduler with your buyers, the time and your pre-approval filled in.`, actionLabel: "Open scheduler" });
  if (contact.phone) drafts.push({ method: "call", to: contact.phone, body: callScript(s, d), actionLabel: `Call ${d.listingAgentFirstName}` });
  return drafts;
}

export type CallOutcome = "confirmed" | "voicemail" | "other_time" | "no_answer";

/** The text offered right after a call, matched to how the call went. */
export function afterCallText(s: Sender, d: RequestDetails, outcome: CallOutcome): string {
  switch (outcome) {
    case "confirmed":
      return `Hi ${d.listingAgentFirstName}, thanks for confirming! As discussed: ${d.address}, ${d.dayLabel} ${d.timeLabel} for ${d.buyerNames}. ${s.name}, ${s.phone}`;
    case "other_time":
      return `Hi ${d.listingAgentFirstName}, thanks for the call. Which times work on ${d.dayLabel} for ${d.address}? ${s.name}, ${s.phone}`;
    default:
      return `Hi ${d.listingAgentFirstName}, just tried calling. ${textRequest(s, d).replace(`Hi ${d.listingAgentFirstName}, this is `, "This is ")}`;
  }
}

/** Device links so the message sends from the agent's own phone and email. */
export function deviceLink(draft: Draft): string | null {
  const enc = encodeURIComponent;
  switch (draft.method) {
    case "text":
      return `sms:${draft.to.replace(/[^\d+]/g, "")}?&body=${enc(draft.body)}`;
    case "email":
      return `mailto:${draft.to}?subject=${enc(draft.subject ?? "")}&body=${enc(draft.body)}`;
    case "call":
      return `tel:${draft.to.replace(/[^\d+]/g, "")}`;
    case "online":
      return draft.to;
    default:
      return null;
  }
}

export function backupOfferNotice(agentFirstName: string, address: string): string {
  return `Hi ${agentFirstName}, the sellers accepted another offer on ${address}, but they would welcome your buyers as a backup in case it falls through. Want to stay in line?`;
}

export function acceptedOtherNotice(agentFirstName: string, address: string): string {
  return `Hi ${agentFirstName}, thank you for your buyers' offer on ${address}. The sellers have accepted another offer. We appreciate your time.`;
}

export function highestAndBestNotice(address: string, deadline: string, s: Sender): string {
  return `Multiple offers received on ${address}. Please submit your buyer's highest and best offer by ${deadline}. Send offers to ${s.name}, ${s.phone}. Thank you!`;
}

export interface AgentContact {
  preferred: ContactMethod;
  phone?: string;
  email?: string;
  onApp?: boolean;
  onlineUrl?: string;
}

export function reminderText(s: Sender, d: RequestDetails): string {
  return `Hi ${d.listingAgentFirstName}, it's ${who(s)} following up on my showing request for ${d.address} on ${d.dayLabel}, ${d.timeLabel}, for my ${buyers(d)}. Could you confirm when you get a chance? Thank you! ${s.phone}`;
}

export function reminderEmail(s: Sender, d: RequestDetails): { subject: string; body: string } {
  return {
    subject: `Following up: showing request for ${d.address} · ${d.dayLabel}, ${d.timeLabel}`,
    body: [
      `Hi ${d.listingAgentFirstName},`,
      "",
      `Just following up on my request to show ${d.address} on ${d.dayLabel}, ${d.timeLabel}, to my ${buyers(d)}.`,
      "",
      "Could you confirm, or suggest another time that works for your sellers?",
      "",
      "Thank you,",
      s.name,
      `${s.brokerage} · ${s.phone}`,
    ].join("\n"),
  };
}

/**
 * The message for a reminder or a resend, in the listing agent's preferred way.
 * In-app agents get a notification; everyone else gets a draft to send from your phone or email.
 */
export function nudgeDraft(kind: "remind" | "resend", s: Sender, d: RequestDetails, c: AgentContact): Draft {
  const first = d.listingAgentFirstName;
  if (c.onApp || c.preferred === "app") {
    return { method: "app", to: "REschedule inbox", body: kind === "remind" ? `Sends ${first} a reminder in REschedule.` : `Sends the request to ${first} again in REschedule.`, actionLabel: kind === "remind" ? "Send reminder" : "Resend request" };
  }
  const wantsEmail = c.preferred === "email" || (!c.phone && !!c.email);
  if (wantsEmail && c.email) {
    const e = kind === "remind" ? reminderEmail(s, d) : emailRequest(s, d);
    return { method: "email", to: c.email, subject: e.subject, body: e.body, actionLabel: kind === "remind" ? "Email reminder" : "Email request again" };
  }
  if (c.preferred === "online" && c.onlineUrl && kind === "resend") {
    return { method: "online", to: c.onlineUrl, body: `Opens ${first}'s online scheduler.`, actionLabel: "Open their scheduler" };
  }
  if (c.preferred === "call" && c.phone) {
    return { method: "call", to: c.phone, body: callScript(s, d), actionLabel: `Call ${first}` };
  }
  if (c.phone) {
    return { method: "text", to: c.phone, body: kind === "remind" ? reminderText(s, d) : textRequest(s, d), actionLabel: kind === "remind" ? "Text reminder" : "Text request again" };
  }
  return { method: "app", to: "", body: `Add ${first}'s phone or email to send this.`, actionLabel: kind === "remind" ? "Send reminder" : "Resend request" };
}
