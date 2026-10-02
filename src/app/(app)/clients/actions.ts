"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { repo } from "@/lib/data";

export type ClientState = { ok?: string; error?: string; added?: { id: string; name: string; phone: string; email: string; intent: string } };

const newClient = z.object({
  name: z.string().trim().min(1, "Add a name.").max(80),
  phone: z.string().trim().max(30).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
  intent: z.enum(["Buying", "Selling", "Renting", "Investing", "Other"]).default("Buying"),
  stage: z.enum(["future", "present", "past"]).default("present"),
  loanProgram: z.enum(["unknown", "conventional", "fha", "va", "usda", "naca", "cash", "other"]).default("unknown"),
  preApproved: z.string().optional(),
  notes: z.string().trim().max(500).optional().default(""),
});

export async function addClient(_prev: ClientState, formData: FormData): Promise<ClientState> {
  const parsed = newClient.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const f = parsed.data;
  if (f.email && !z.string().email().safeParse(f.email).success) return { error: "Check the email address." };
  const c = await repo().addClient({ name: f.name, phone: f.phone, email: f.email, preApproved: f.preApproved === "on", stage: f.stage, intent: f.intent, notes: f.notes, loanProgram: f.loanProgram });
  revalidatePath("/clients");
  return { ok: `Added ${f.name}.`, added: { id: c.id, name: f.name, phone: f.phone, email: f.email, intent: f.intent } };
}

export async function moveClient(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const stage = z.enum(["future", "present", "past"]).safeParse(formData.get("stage"));
  if (!id || !stage.success) return;
  await repo().setClientStage(id, stage.data);
  revalidatePath("/clients");
}

export async function markAgreementSent(id: string) {
  if (!id) return;
  await repo().updateClient(id, { agreementSentAt: new Date().toISOString() });
  revalidatePath("/clients");
}

const money = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return String(v ?? "").trim() === "" || !Number.isFinite(n) || n < 0 || n > 100000 ? null : Math.round(n);
};

export async function saveProgram(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const program = z.enum(["unknown", "conventional", "fha", "va", "usda", "naca", "cash", "other"]).safeParse(formData.get("loanProgram"));
  if (!id || !program.success) return;
  const qualified = String(formData.get("qualifiedOn") ?? "");
  await repo().updateClient(id, {
    loanProgram: program.data,
    approvedMonthly: money(formData.get("approvedMonthly")),
    currentHousing: money(formData.get("currentHousing")),
    qualifiedOn: /^\d{4}-\d{2}-\d{2}$/.test(qualified) ? qualified : null,
  });
  revalidatePath("/clients");
}

export async function toggleProgramStep(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const step = String(formData.get("step") ?? "");
  const c = (await repo().listClients()).find((x) => x.id === id);
  if (!c || !/^[a-z_]{2,30}$/.test(step)) return;
  const steps = c.programSteps.includes(step) ? c.programSteps.filter((s) => s !== step) : [...c.programSteps, step];
  await repo().updateClient(id, { programSteps: steps });
  revalidatePath("/clients");
}
