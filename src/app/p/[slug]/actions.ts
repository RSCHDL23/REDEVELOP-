"use server";

import { z } from "zod";
import { repo } from "@/lib/data";

export type ConnectState = { ok?: string; error?: string };

const schema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{2,59}$/),
  name: z.string().trim().min(1, "Add your name.").max(80),
  phone: z.string().trim().max(30).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
  intent: z.enum(["Buying", "Selling", "Renting", "Investing", "Other"]).default("Buying"),
  consent: z.literal("on", { message: "Please agree so they can contact you." }),
  website: z.string().max(0).optional(), // hidden field: bots fill it in
});

export async function connect(_prev: ConnectState, formData: FormData): Promise<ConnectState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const f = parsed.data;
  if (!f.phone && !f.email) return { error: "Add a phone number or email." };
  if (f.email && !z.string().email().safeParse(f.email).success) return { error: "Check your email address." };
  try {
    await repo().connectToPro(f.slug, { name: f.name, phone: f.phone, email: f.email, intent: f.intent });
  } catch {
    return { error: "That didn't go through. Please try again in a bit." };
  }
  return { ok: f.name.split(" ")[0] };
}
