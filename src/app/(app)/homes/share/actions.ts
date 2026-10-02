"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { repo } from "@/lib/data";
import { parseListingUrl } from "@/lib/core/listingLinks";

export type ShareState = { ok?: string; error?: string };

const schema = z.object({
  url: z.string().trim().min(10, "Paste the home's link.").max(600),
  address: z.string().trim().max(200).optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
  wantsTour: z.string().optional(),
});

export async function sendHome(_prev: ShareState, formData: FormData): Promise<ShareState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const link = parseListingUrl(parsed.data.url);
  if (!link) return { error: "Use a home link from Zillow, Redfin or Realtor.com." };
  try {
    await repo().shareHome({ url: link.url, source: link.site, address: parsed.data.address || link.address, note: parsed.data.note, wantsTour: parsed.data.wantsTour === "on" });
  } catch (e) {
    return { error: e instanceof Error && e.message.includes("agent") ? "Choose your agent first: open their REschedule link and tap \"Make them my agent\"." : "That didn't send. Try again." };
  }
  revalidatePath("/clients");
  revalidatePath("/showings");
  revalidatePath("/today");
  return { ok: "Sent to your agent!" };
}

export async function markSeen(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) await repo().markShareSeen(id);
  revalidatePath("/clients");
  revalidatePath("/showings");
  revalidatePath("/today");
}
