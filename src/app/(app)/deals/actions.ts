"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { repo } from "@/lib/data";

function ids(formData: FormData) {
  return { dealId: String(formData.get("dealId") ?? ""), itemId: String(formData.get("itemId") ?? "") };
}

export async function toggleTask(formData: FormData) {
  const { dealId, itemId } = ids(formData);
  if (!dealId || !itemId) return;
  await repo().toggleTask(dealId, itemId);
  revalidatePath(`/deals/${dealId}`);
}

export async function toggleMilestone(formData: FormData) {
  const { dealId, itemId } = ids(formData);
  if (!dealId || !itemId) return;
  await repo().toggleMilestone(dealId, itemId);
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  revalidatePath("/today");
}

const loanUpdate = z.object({
  dealId: z.string().min(1),
  status: z.string().trim().min(1).max(60),
  note: z.string().trim().max(400),
});

export async function postLoanUpdate(formData: FormData) {
  const parsed = loanUpdate.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await repo().postLoanUpdate(parsed.data.dealId, parsed.data.status, parsed.data.note);
  revalidatePath(`/deals/${parsed.data.dealId}`);
}
