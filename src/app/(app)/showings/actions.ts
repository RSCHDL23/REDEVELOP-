"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { repo } from "@/lib/data";
import { toTimestamp } from "@/lib/data/dates";

const decision = z.object({
  id: z.string().min(1),
  status: z.enum(["approved", "declined", "countered"]),
});

export async function decide(formData: FormData) {
  const parsed = decision.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return;
  await repo().decideRequest(parsed.data.id, parsed.data.status);
  revalidatePath("/showings");
  revalidatePath("/today");
}

export async function cancel(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await repo().cancelRequest(id);
  revalidatePath("/showings");
  revalidatePath("/today");
}

const newRequest = z.object({
  listingId: z.string().min(1, "Pick a home."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time."),
  minutes: z.coerce.number().int().min(15).max(120),
  buyerLabel: z.string().trim().min(1, "Add your buyer's name.").max(80),
  method: z.enum(["app", "text", "email", "call", "online"]),
});

export type NewRequestState = { error?: string };

export async function createRequest(_prev: NewRequestState, formData: FormData): Promise<NewRequestState> {
  const parsed = newRequest.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const { listingId, date, time, minutes, buyerLabel, method } = parsed.data;
  const [h, m] = time.split(":").map(Number);
  const start = h * 60 + m;
  await repo().createRequest({
    listingId,
    startsAt: toTimestamp(date, start),
    endsAt: toTimestamp(date, start + minutes),
    buyerLabel,
    method,
  });
  revalidatePath("/showings");
  revalidatePath("/today");
  redirect("/showings?tab=sent");
}
