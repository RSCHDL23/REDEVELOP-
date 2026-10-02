"use server";

import { z } from "zod";
import { repo } from "@/lib/data";

export type ReviewState = { ok?: boolean; error?: string };

const schema = z.object({
  token: z.string().min(8).max(64),
  stars: z.coerce.number().int().min(1, "Pick a star rating.").max(5),
  name: z.string().trim().max(60).optional().default(""),
  body: z.string().trim().max(1500).optional().default(""),
});

export async function leaveReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    await repo().submitReview(parsed.data.token, parsed.data);
  } catch {
    return { error: "That didn't go through. Please try again." };
  }
  return { ok: true };
}
