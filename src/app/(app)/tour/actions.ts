"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { repo } from "@/lib/data";
import { toTimestamp } from "@/lib/data/dates";

const tour = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  buyerLabel: z.string().trim().min(1).max(80),
  stops: z.array(z.object({
    listingId: z.string().min(1),
    start: z.number().int().min(0).max(1440),
    end: z.number().int().min(0).max(1440),
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
  const { date, buyerLabel, stops } = parsed.data;
  for (const s of stops) {
    await repo().createRequest({ listingId: s.listingId, startsAt: toTimestamp(date, s.start), endsAt: toTimestamp(date, s.end), buyerLabel, method: s.method });
  }
  revalidatePath("/showings");
  revalidatePath("/today");
  return { sent: stops.length };
}
