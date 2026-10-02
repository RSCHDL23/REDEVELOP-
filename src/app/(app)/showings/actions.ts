"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { repo } from "@/lib/data";
import { toTimestamp } from "@/lib/data/dates";
import { sendLinkFor } from "@/lib/data/requestMessages";

function refresh() {
  revalidatePath("/showings");
  revalidatePath("/today");
}

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.");
const TIME = z.string().regex(/^\d{2}:\d{2}$/, "Pick a time.");
const MINUTES = z.coerce.number().int().min(15).max(180);
const minutesOf = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export type ActionState = { ok?: string; error?: string };

// ---------- Listing side: answer or change the answer ----------
const answer = z.discriminatedUnion("status", [
  z.object({ id: z.string().min(1), status: z.enum(["approved", "declined", "pending"]), note: z.string().trim().max(280).optional() }),
  z.object({ id: z.string().min(1), status: z.literal("countered"), date: DATE, time: TIME, minutes: MINUTES, note: z.string().trim().max(280).optional() }),
]);

export async function respond(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = answer.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const a = parsed.data;
  if (a.status === "countered") {
    const start = minutesOf(a.time);
    if (start + a.minutes > 24 * 60) return { error: "That runs past midnight. Pick an earlier time." };
    await repo().decideRequest(a.id, { status: "countered", proposedStartsAt: toTimestamp(a.date, start), proposedEndsAt: toTimestamp(a.date, start + a.minutes), note: a.note });
  } else {
    await repo().decideRequest(a.id, { status: a.status, note: a.note });
  }
  refresh();
  return { ok: "Saved." };
}

// ---------- Requesting side ----------
const idOnly = (formData: FormData) => String(formData.get("id") ?? "");

export async function cancel(formData: FormData) {
  const id = idOnly(formData);
  if (id) await repo().cancelRequest(id);
  refresh();
}

export async function acceptNewTime(formData: FormData) {
  const id = idOnly(formData);
  if (id) await repo().acceptNewTime(id);
  refresh();
}

/** Records a reminder or resend. Text/email ones are sent from the agent's own phone. */
export async function nudge(id: string): Promise<ActionState> {
  if (!id) return { error: "Something went wrong." };
  await repo().markReminded(id);
  refresh();
  return { ok: "Sent." };
}

export async function recordAnswer(formData: FormData) {
  const id = idOnly(formData);
  const status = z.enum(["approved", "declined", "pending"]).safeParse(formData.get("status"));
  if (id && status.success) await repo().recordAnswer(id, status.data);
  refresh();
}

// ---------- New request ----------
const newRequest = z.object({
  listingId: z.string().optional().default(""),
  address: z.string().trim().max(160).optional().default(""),
  agentName: z.string().trim().max(80).optional().default(""),
  agentPhone: z.string().trim().max(30).optional().default(""),
  agentEmail: z.string().trim().max(120).optional().default(""),
  date: DATE,
  time: TIME,
  minutes: MINUTES,
  clientId: z.string().optional().default(""),
  buyerName: z.string().trim().max(80).optional().default(""),
  buyerPhone: z.string().trim().max(30).optional().default(""),
  buyerEmail: z.string().trim().max(120).optional().default(""),
  saveBuyer: z.string().optional(),
  preApproved: z.string().optional(),
});

export type NewRequestState = {
  error?: string;
  /** For agents not on REschedule: the message to send from your phone. */
  send?: { href: string; label: string; body: string; to: string };
};

export async function createRequest(_prev: NewRequestState, formData: FormData): Promise<NewRequestState> {
  const parsed = newRequest.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const f = parsed.data;
  const r = repo();

  // Home: one in the system, or a typed-in address.
  const listings = await r.listListings();
  const listing = f.listingId ? listings.find((l) => l.id === f.listingId) : undefined;
  if (f.listingId && !listing) return { error: "That home is no longer available. Pick it again." };
  if (!listing) {
    if (f.address.length < 5) return { error: "Pick a home, or type its full address." };
    if (!f.agentPhone && !f.agentEmail) return { error: "Add the listing agent's phone or email so the request can reach them." };
    if (f.agentEmail && !z.string().email().safeParse(f.agentEmail).success) return { error: "Check the listing agent's email." };
  }

  // Buyer: a saved client, or someone new.
  let buyerLabel = "";
  let clientId: string | undefined;
  let preApproved = false;
  if (f.clientId && f.clientId !== "new") {
    const client = (await r.listClients()).find((c) => c.id === f.clientId);
    if (!client) return { error: "Pick your buyer again." };
    buyerLabel = client.name;
    clientId = client.id;
    preApproved = client.preApproved;
  } else {
    if (!f.buyerName) return { error: "Add your buyer's name." };
    buyerLabel = f.buyerName;
    preApproved = f.preApproved === "on";
    if (f.saveBuyer === "on") {
      const c = await r.addClient({ name: f.buyerName, phone: f.buyerPhone, email: f.buyerEmail, preApproved });
      clientId = c.id;
    }
  }

  const start = minutesOf(f.time);
  if (start + f.minutes > 24 * 60) return { error: "That runs past midnight. Pick an earlier time." };
  const agent = listing?.listingAgent;
  const method = agent ? (agent.onApp ? "app" : agent.contact.preferred) : f.agentPhone ? "text" : "email";

  const created = await r.createRequest({
    listingId: listing?.id,
    manual: listing ? undefined : { address: f.address, agentName: f.agentName, agentPhone: f.agentPhone, agentEmail: f.agentEmail },
    clientId,
    buyerLabel,
    startsAt: toTimestamp(f.date, start),
    endsAt: toTimestamp(f.date, start + f.minutes),
    method,
  });
  refresh();

  if (method === "app") redirect("/showings?tab=sent");

  // Not on REschedule: hand back a ready-to-send message.
  const me = await r.getMe();
  return { send: sendLinkFor(created, me, preApproved) };
}
