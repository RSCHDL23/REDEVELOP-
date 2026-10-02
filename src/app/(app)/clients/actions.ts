"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { repo } from "@/lib/data";

export type ClientState = { ok?: string; error?: string; added?: { name: string; phone: string; email: string; intent: string } };

const newClient = z.object({
  name: z.string().trim().min(1, "Add a name.").max(80),
  phone: z.string().trim().max(30).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
  intent: z.enum(["Buying", "Selling", "Renting", "Investing", "Other"]).default("Buying"),
  stage: z.enum(["future", "present", "past"]).default("present"),
  preApproved: z.string().optional(),
  notes: z.string().trim().max(500).optional().default(""),
});

export async function addClient(_prev: ClientState, formData: FormData): Promise<ClientState> {
  const parsed = newClient.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const f = parsed.data;
  if (f.email && !z.string().email().safeParse(f.email).success) return { error: "Check the email address." };
  await repo().addClient({ name: f.name, phone: f.phone, email: f.email, preApproved: f.preApproved === "on", stage: f.stage, intent: f.intent, notes: f.notes });
  revalidatePath("/clients");
  return { ok: `Added ${f.name}.`, added: { name: f.name, phone: f.phone, email: f.email, intent: f.intent } };
}

export async function moveClient(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const stage = z.enum(["future", "present", "past"]).safeParse(formData.get("stage"));
  if (!id || !stage.success) return;
  await repo().setClientStage(id, stage.data);
  revalidatePath("/clients");
}
