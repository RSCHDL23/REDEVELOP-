"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { repo } from "@/lib/data";

export type SendState = { error?: string; sent?: number };

const schema = z.object({ to: z.string().min(1).max(64), body: z.string().trim().min(1, "Type a message.").max(2000) });

export async function sendMessage(_prev: SendState, formData: FormData): Promise<SendState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    await repo().sendMessage(parsed.data.to, parsed.data.body);
  } catch {
    return { error: "You can message people you work with: your clients, agents on your showings and people on your deals." };
  }
  revalidatePath(`/messages/${parsed.data.to}`);
  revalidatePath("/messages");
  return { sent: Date.now() };
}
