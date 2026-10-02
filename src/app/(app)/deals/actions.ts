"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { repo } from "@/lib/data";

function ids(formData: FormData) {
  return { dealId: String(formData.get("dealId") ?? ""), itemId: String(formData.get("itemId") ?? "") };
}

function refresh(dealId: string) {
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  revalidatePath("/today");
  revalidatePath("/clients");
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
  const deal = await repo().getDeal(dealId);
  const m = deal?.milestones.find((x) => x.id === itemId);
  const closingNow = m?.kind === "closing" && !m.done; // read before the change
  await repo().toggleMilestone(dealId, itemId);
  refresh(dealId);
  // Checking off Closing: celebrate and send the after-closing checklist.
  if (closingNow) redirect(`/deals/${dealId}?tab=dates&celebrate=1`);
}

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.");

export async function setMilestoneDate(formData: FormData) {
  const { dealId, itemId } = ids(formData);
  const due = DATE.safeParse(formData.get("due"));
  if (!dealId || !itemId || !due.success) return;
  await repo().setMilestoneDate(dealId, itemId, due.data);
  refresh(dealId);
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

const newDeal = z.object({
  address: z.string().trim().min(5, "Add the property address.").max(160),
  city: z.string().trim().min(2, "Add the city and state.").max(80),
  side: z.enum(["buyer", "seller", "both"]),
  clientId: z.string().optional().default(""),
  clientName: z.string().trim().max(80).optional().default(""),
  clientPhone: z.string().trim().max(30).optional().default(""),
  clientEmail: z.string().trim().max(120).optional().default(""),
  acceptanceDate: DATE,
  closingDate: DATE,
  loanType: z.string().trim().min(1).max(30),
  hasHoa: z.string().optional(),
  milestones: z.string(),
});
const milestoneList = z.array(z.object({ kind: z.string().min(1).max(40), label: z.string().trim().min(1).max(80), due: DATE })).min(1).max(20);

export type NewDealState = { error?: string };

export async function createDeal(_prev: NewDealState, formData: FormData): Promise<NewDealState> {
  const parsed = newDeal.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const f = parsed.data;
  if (f.closingDate <= f.acceptanceDate) return { error: "Closing has to be after the acceptance date." };
  let milestones;
  try { milestones = milestoneList.parse(JSON.parse(f.milestones)); } catch { return { error: "Check the milestone dates." }; }

  const r = repo();
  let clientId: string | undefined;
  let clientName = "";
  if (f.clientId && f.clientId !== "new") {
    const c = (await r.listClients()).find((x) => x.id === f.clientId);
    if (!c) return { error: "Pick your client again." };
    clientId = c.id;
    clientName = c.name;
  } else {
    if (!f.clientName) return { error: "Add your client's name." };
    const c = await r.addClient({ name: f.clientName, phone: f.clientPhone, email: f.clientEmail, preApproved: false, stage: "present", intent: f.side === "seller" ? "Selling" : "Buying" });
    clientId = c.id;
    clientName = c.name;
  }

  const id = await r.createDeal({
    address: f.address, city: f.city, side: f.side, clientId, clientName,
    acceptanceDate: f.acceptanceDate, closingDate: f.closingDate, loanType: f.loanType, hasHoa: f.hasHoa === "on",
    milestones: milestones.map((m) => (m.kind === "closing" ? { ...m, due: f.closingDate } : m)),
  });
  refresh(id);
  redirect(`/deals/${id}`);
}
