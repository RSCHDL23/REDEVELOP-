"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { repo } from "@/lib/data";
import { toTimestamp } from "@/lib/data/dates";

/** Offer accepted: documents attached to showing requests for this home stay open through closing day. */
async function keepDocsUntilClosing(address: string, closing: string) {
  try { await repo().extendPropertyDocs(address, toTimestamp(closing, 24 * 60 - 1)); } catch { /* best effort */ }
}

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
  const deal = await repo().getDeal(dealId);
  const kind = deal?.milestones.find((m) => m.id === itemId)?.kind;
  await repo().setMilestoneDate(dealId, itemId, due.data);
  if (deal && kind === "closing") await keepDocsUntilClosing(deal.address, due.data);
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
  earnestAmount: z.string().trim().optional().default(""),
  earnestHolder: z.enum(["", "listing_brokerage", "buyer_brokerage", "title_company", "attorney", "builder", "other"]).optional().default(""),
  earnestHolderName: z.string().trim().max(100).optional().default(""),
  tasks: z.string().optional().default("[]"),
});
const taskList = z.array(z.object({ title: z.string().trim().min(1).max(200), assignee: z.string().trim().max(60), due: DATE.nullable() })).max(40);
const milestoneList = z.array(z.object({ kind: z.string().min(1).max(40), label: z.string().trim().min(1).max(80), due: DATE })).min(1).max(20);

export type NewDealState = { error?: string };

export async function createDeal(_prev: NewDealState, formData: FormData): Promise<NewDealState> {
  const parsed = newDeal.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const f = parsed.data;
  if (f.closingDate <= f.acceptanceDate) return { error: "Closing has to be after the acceptance date." };
  let milestones;
  try { milestones = milestoneList.parse(JSON.parse(f.milestones)); } catch { return { error: "Check the milestone dates." }; }
  let tasks;
  try { tasks = taskList.parse(JSON.parse(f.tasks)); } catch { return { error: "Check the to-do list." }; }
  const amount = f.earnestAmount ? Number(f.earnestAmount.replace(/[$,\s]/g, "")) : null;
  if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 100_000_000)) return { error: "Check the earnest money amount." };

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
    earnestAmount: amount, earnestHolder: f.earnestHolder || null, earnestHolderName: f.earnestHolderName,
    tasks,
    milestones: milestones.map((m) => (m.kind === "closing" ? { ...m, due: f.closingDate } : m)),
  });
  await keepDocsUntilClosing(f.address, f.closingDate);
  refresh(id);
  redirect(`/deals/${id}?created=1`);
}

export async function markReviewRequested(clientId: string) {
  if (!clientId) return;
  await repo().markReviewRequested(clientId);
  revalidatePath("/clients");
}

const ROLES = ["buyer", "seller", "buyers_agent", "listing_agent", "lender", "attorney", "transaction_coordinator", "inspector", "appraiser", "title", "insurance", "contractor", "surveyor", "property_manager", "photographer"] as const;
const person = z.object({
  dealId: z.string().min(1),
  role: z.enum(ROLES),
  name: z.string().trim().min(1, "Add a name.").max(80),
  phone: z.string().trim().max(30).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
});

export type PersonState = { ok?: string; error?: string };

export async function addPerson(_prev: PersonState, formData: FormData): Promise<PersonState> {
  const parsed = person.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const p = parsed.data;
  if (p.email && !z.string().email().safeParse(p.email).success) return { error: "Check the email address." };
  await repo().addDealMember(p.dealId, { role: p.role, name: p.name, phone: p.phone || undefined, email: p.email || undefined });
  revalidatePath(`/deals/${p.dealId}`);
  return { ok: `Added ${p.name}.` };
}

export async function removePerson(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? ""), memberId = String(formData.get("memberId") ?? "");
  if (!dealId || !memberId) return;
  await repo().removeDealMember(dealId, memberId);
  revalidatePath(`/deals/${dealId}`);
}

const todo = z.object({ dealId: z.string().min(1), title: z.string().trim().min(1, "Add the to-do.").max(200), assignee: z.string().trim().max(60).optional().default("You"), due: DATE.or(z.literal("")).optional().default("") });

export async function addTodo(_prev: PersonState, formData: FormData): Promise<PersonState> {
  const parsed = todo.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  await repo().addTask(parsed.data.dealId, { title: parsed.data.title, assignee: parsed.data.assignee || "You", due: parsed.data.due || null });
  revalidatePath(`/deals/${parsed.data.dealId}`);
  return { ok: "Added." };
}
