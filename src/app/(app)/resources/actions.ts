"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { repo } from "@/lib/data";

export type LibState = { ok?: string; error?: string };

const item = z.object({
  title: z.string().trim().min(2, "Add a title.").max(100),
  url: z.string().trim().max(500),
  category: z.string().trim().max(40).optional().default("My forms"),
});

export async function addResource(_prev: LibState, formData: FormData): Promise<LibState> {
  const parsed = item.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  let url = parsed.data.url;
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  if (!/^https?:\/\/[^\s]+\.[^\s]+$/.test(url)) return { error: "Add a full link, like https://…" };
  const me = await repo().getMe();
  if (me.myResources.length >= 40) return { error: "Up to 40 saved links." };
  await repo().updateMe({ myResources: [...me.myResources, { title: parsed.data.title, url, category: parsed.data.category || "My forms" }] });
  revalidatePath("/resources");
  return { ok: "Saved." };
}

export async function removeResource(formData: FormData) {
  const i = Number(formData.get("index"));
  const me = await repo().getMe();
  if (!Number.isInteger(i) || i < 0 || i >= me.myResources.length) return;
  await repo().updateMe({ myResources: me.myResources.filter((_, k) => k !== i) });
  revalidatePath("/resources");
}
