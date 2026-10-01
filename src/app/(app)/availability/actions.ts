"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { repo } from "@/lib/data";

const time = z.string().regex(/^\d{2}:\d{2}$/).transform((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)));

export type HoursState = { ok?: string; error?: string };

export async function saveHours(_prev: HoursState, formData: FormData): Promise<HoursState> {
  const hours = [];
  for (let d = 0; d < 7; d++) {
    const on = formData.get(`on-${d}`) === "on";
    const start = time.safeParse(formData.get(`start-${d}`) ?? "09:00");
    const end = time.safeParse(formData.get(`end-${d}`) ?? "17:00");
    if (!start.success || !end.success) return { error: "Check the times." };
    if (on && end.data <= start.data) return { error: "Each day's end time must be after its start time." };
    hours.push({ weekday: d, start: start.data, end: end.data, on });
  }
  await repo().saveWeeklyHours(hours);
  revalidatePath("/availability");
  revalidatePath("/tour");
  return { ok: "Saved. The tour scheduler uses these hours." };
}
