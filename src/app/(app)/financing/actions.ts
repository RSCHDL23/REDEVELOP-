"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { repo } from "@/lib/data";
import type { Financing } from "@/lib/data/types";
import { largestAmount, readLetterFile } from "@/lib/server/readLetterFile";

const TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/heic", "text/plain"]);
const MAX = 10 * 1024 * 1024;

/** "me" (a buyer's own profile) or one of the agent's clients. */
async function checkTarget(target: string): Promise<"me" | string | null> {
  if (target === "me") return "me";
  const c = (await repo().listClients()).find((x) => x.id === target);
  return c ? c.id : null;
}

export type ReadState = {
  error?: string;
  /** What was read from the file, for the person to check before saving. */
  read?: Partial<Omit<Financing, "savedAt">> & { kind: Financing["kind"]; fileName: string; fileId: string | null };
  readable?: boolean;
};

/** Uploads a pre-approval letter or proof of funds, keeps it private, and reads the terms. */
export async function readFinancingDoc(_prev: ReadState, formData: FormData): Promise<ReadState> {
  const target = await checkTarget(String(formData.get("target") ?? ""));
  if (!target) return { error: "Pick the client again." };
  const kind = formData.get("kind") === "proof_of_funds" ? "proof_of_funds" : "preapproval";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose the file first." };
  if (!TYPES.has(file.type)) return { error: "Use a PDF, JPG, PNG or HEIC file." };
  if (file.size > MAX) return { error: "Files can be up to 10 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name.replace(/[\\/\0]/g, "_").slice(0, 120) || "document";
  const saved = await repo().saveAttachment({ name, mime: file.type, bytes });
  const { terms, text, readable } = await readLetterFile(bytes, file.type);
  if (kind === "proof_of_funds") {
    return { readable, read: { kind, fileName: name, fileId: saved.id, amount: readable ? largestAmount(text) : null, lender: terms.lender ?? "" } };
  }
  return {
    readable,
    read: {
      kind, fileName: name, fileId: saved.id,
      lender: terms.lender ?? "", loanType: terms.loanType ?? "", purchasePrice: terms.purchasePrice ?? null, loanAmount: terms.loanAmount ?? null,
      downPct: terms.downPct ?? null, ratePct: terms.ratePct ?? null, termYears: terms.termYears ?? null, expiresOn: terms.expiresOn ?? null,
    },
  };
}

const num = (max: number) => z.preprocess((v) => {
  const s = String(v ?? "").replace(/[$,%\s]/g, "");
  return s === "" ? null : Number(s);
}, z.number().min(0).max(max).nullable());

const fields = z.object({
  target: z.string().min(1),
  kind: z.enum(["preapproval", "proof_of_funds", "estimate"]),
  lender: z.string().trim().max(120).default(""),
  loanType: z.string().trim().max(40).default(""),
  purchasePrice: num(50000000),
  loanAmount: num(50000000),
  downPct: num(100),
  ratePct: num(20),
  termYears: num(40),
  expiresOn: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).default(""),
  amount: num(100000000),
  fileName: z.string().max(120).default(""),
  fileId: z.string().max(64).default(""),
});

export type SaveState = { ok?: string; error?: string };

/** Saves the confirmed terms. Nothing is saved until the person checks them. */
export async function saveFinancing(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const parsed = fields.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: `Check ${String(parsed.error.issues[0]?.path[0] ?? "the form")}.` };
  const f = parsed.data;
  const target = await checkTarget(f.target);
  if (!target) return { error: "Pick the client again." };
  if (f.kind === "preapproval" && !f.purchasePrice && !f.loanAmount) return { error: "Add the approved price or loan amount." };
  if (f.kind === "proof_of_funds" && !f.amount) return { error: "Add the amount the proof of funds shows." };
  if (f.kind === "estimate" && !f.amount) return { error: "Add the monthly payment you want." };
  const financing: Financing = {
    kind: f.kind, lender: f.lender, loanType: f.loanType, purchasePrice: f.purchasePrice, loanAmount: f.loanAmount,
    downPct: f.downPct ?? (f.purchasePrice && f.loanAmount && f.loanAmount <= f.purchasePrice ? Math.round((1 - f.loanAmount / f.purchasePrice) * 1000) / 10 : null),
    ratePct: f.ratePct, termYears: f.termYears && [10, 15, 20, 25, 30, 40].includes(f.termYears) ? f.termYears : null,
    expiresOn: f.expiresOn || null, amount: f.amount, fileName: f.fileName, fileId: f.fileId || null, savedAt: new Date().toISOString(),
  };
  if (target === "me") {
    await repo().updateMe({ financing });
  } else {
    const program = financing.kind === "proof_of_funds" ? "cash" : (["conventional", "fha", "va", "usda", "naca"] as const).find((p) => p === financing.loanType.toLowerCase());
    await repo().updateClient(target, {
      financing,
      ...(financing.kind !== "estimate" ? { preApproved: true } : {}),
      ...(program ? { loanProgram: program } : {}),
    });
  }
  revalidatePath("/clients");
  revalidatePath("/get-ready");
  revalidatePath("/today");
  return { ok: financing.kind === "proof_of_funds" ? "Proof of funds saved." : financing.kind === "estimate" ? "Estimate saved." : "Pre-approval saved." };
}

export async function clearFinancing(formData: FormData) {
  const target = await checkTarget(String(formData.get("target") ?? ""));
  if (!target) return;
  if (target === "me") await repo().updateMe({ financing: null });
  else await repo().updateClient(target, { financing: null });
  revalidatePath("/clients");
  revalidatePath("/get-ready");
}

/** Buyer without a letter: save the payment they want and open the calculator. */
export async function estimateFromPayment(formData: FormData) {
  const monthly = Number(String(formData.get("monthly") ?? "").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(monthly) || monthly < 300 || monthly > 100000) redirect("/get-ready?error=monthly");
  await repo().updateMe({
    financing: { kind: "estimate", lender: "", loanType: "", purchasePrice: null, loanAmount: null, downPct: null, ratePct: null, termYears: null, expiresOn: null, amount: Math.round(monthly), fileName: "", fileId: null, savedAt: new Date().toISOString() },
  });
  revalidatePath("/today");
  redirect(`/calculator?mode=budget&monthly=${Math.round(monthly)}&from=estimate`);
}
