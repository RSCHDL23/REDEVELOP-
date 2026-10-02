"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { repo } from "@/lib/data";

export async function saveRememberSettings(formData: FormData) {
  const channel = z.enum(["text", "email"]).safeParse(formData.get("channel"));
  await repo().updateMe({ rememberAuto: formData.get("auto") === "on", rememberChannel: channel.success ? channel.data : "text" });
  revalidatePath("/remember");
}

export async function setClientAnniversary(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).safeParse(formData.get("closedOn") ?? "");
  if (!id || !date.success) return;
  await repo().updateClient(id, { closedOn: date.data || null });
  revalidatePath("/remember");
  revalidatePath("/clients");
  revalidatePath("/calendar");
}

export async function toggleRemember(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await repo().updateClient(id, { remember: formData.get("remember") === "on" });
  revalidatePath("/remember");
}
