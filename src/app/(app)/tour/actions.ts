"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { repo } from "@/lib/data";
import { toTimestamp } from "@/lib/data/dates";

const tour = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  buyerLabel: z.string().trim().min(1).max(80),
  comments: z.string().trim().max(500).optional().default(""),
  attachmentIds: z.array(z.string().min(1).max(64)).max(5).optional().default([]),
  stops: z.array(z.object({
    listingId: z.string().min(1),
    start: z.number().int().min(0).max(1440),
    end: z.number().int().min(0).max(1440),
    comments: z.string().trim().max(500).optional(),
    method: z.enum(["app", "text", "email", "call", "online"]),
  })).min(1).max(20),
});

export type SendTourState = { sent?: number; error?: string };

/** Saves one showing request per stop. Text/email/call stops are also sent from the agent's phone. */
export async function sendTour(_prev: SendTourState, formData: FormData): Promise<SendTourState> {
  let raw: unknown;
  try { raw = JSON.parse(String(formData.get("tour") ?? "")); } catch { return { error: "Something went wrong. Build the tour again." }; }
  const parsed = tour.safeParse(raw);
  if (!parsed.success) return { error: "Something went wrong. Build the tour again." };
  const { date, buyerLabel, stops, comments, attachmentIds } = parsed.data;
  for (const s of stops) {
    await repo().createRequest({ listingId: s.listingId, startsAt: toTimestamp(date, s.start), endsAt: toTimestamp(date, s.end), buyerLabel, method: s.method, comments: s.comments ?? (comments || undefined), attachmentIds });
  }
  revalidatePath("/showings");
  revalidatePath("/today");
  return { sent: stops.length };
}

/** Finds map coordinates for a typed-in starting address. */
export async function findAddress(address: string): Promise<{ address: string; lat: number; lng: number } | { error: string }> {
  const { geocode } = await import("@/lib/server/geocode");
  const hit = await geocode(address);
  return hit ?? { error: "Couldn't find that address. Check the street, city and state." };
}

export type Suggestion = { date: string; start: number; end: number };

/**
 * Next best times for a home that didn't fit: the earliest window where you, your
 * buyers and the home are all free, on the tour day (around the tour) and the 6 days after.
 */
export async function suggestTimes(listingId: string, date: string, minutes: number, taken: [number, number][], tourDayParty?: [number, number][]): Promise<Suggestion[]> {
  const { addDays } = await import("@/lib/core/deadlines");
  const { firstFit, intersect, intersectAll, subtract } = await import("@/lib/core/time");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(minutes >= 15 && minutes <= 180)) return [];
  const out: Suggestion[] = [];
  for (let i = 0; i < 7 && out.length < 3; i++) {
    const day = addDays(date, i);
    const ctx = await repo().getTourContext(day);
    const home = ctx.homes.find((h) => h.listing.id === listingId);
    if (!home) continue;
    // On the tour day, use the free times the agent edited by hand (if any).
    const edited = i === 0 && Array.isArray(tourDayParty) ? tourDayParty.slice(0, 20).filter((w) => Array.isArray(w) && w.length === 2 && w.every((n) => Number.isInteger(n) && n >= 0 && n <= 1440)) : null;
    let free = intersect(edited ?? intersectAll(ctx.participants.map((p) => p.free)), home.free);
    // On the tour day, keep clear of the tour itself (with 15 minutes to drive).
    if (i === 0) free = subtract(free, taken.slice(0, 20).map(([s, e]) => [Math.max(0, s - 15), Math.min(1440, e + 15)] as [number, number]));
    const start = firstFit(free, 0, minutes);
    if (start !== null) out.push({ date: day, start, end: start + minutes });
  }
  return out;
}
