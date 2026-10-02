"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { repo } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import type { Profession } from "@/lib/core/access";
import { PROFESSION_LABELS } from "@/lib/core/access";

export type FormState = { ok?: string; error?: string };

const details = z.object({
  fullName: z.string().trim().min(1, "Add your name.").max(80),
  phone: z.string().trim().max(30),
  tagline: z.string().trim().max(80, "Taglines are 80 characters or less.").optional().default(""),
  bio: z.string().trim().max(600, "Keep your bio under 600 characters.").optional().default(""),
});

export async function saveDetails(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = details.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  await repo().updateMe(parsed.data);
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

/**
 * Checks an uploaded image reference.
 * Supabase: a path inside the user's own folder (the database rules check this too).
 * Demo: a small data URL made by the browser.
 */
async function checkedImage(value: string): Promise<string | null> {
  if (isDemoMode) return /^data:image\/(png|jpeg|webp);base64,/.test(value) && value.length < 1_800_000 ? value : null;
  const me = await repo().getMe();
  return value.startsWith(`${me.id}/`) && !value.includes("..") && value.length < 300 ? value : null;
}

export async function setImage(kind: "headshot" | "logo", value: string): Promise<FormState> {
  const file = await checkedImage(value);
  if (!file) return { error: "That upload didn't work. Try a JPG or PNG." };
  await repo().updateMe(kind === "headshot" ? { headshotUrl: file } : { logoUrl: file });
  revalidatePath("/", "layout");
  return { ok: "Updated." };
}

export async function addWork(value: string, label: string): Promise<FormState> {
  const file = await checkedImage(value);
  if (!file) return { error: "That upload didn't work. Try a JPG or PNG." };
  await repo().addPortfolio({ file, label: label.trim().slice(0, 80) });
  revalidatePath("/profile");
  return { ok: "Added." };
}

export async function removeWork(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) await repo().removePortfolio(id);
  revalidatePath("/profile");
}

const license = z.object({
  profession: z.enum(Object.keys(PROFESSION_LABELS) as [Profession, ...Profession[]]),
  state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Use the 2-letter state, like IL."),
  number: z.string().trim().min(3, "Add the license number.").max(40),
  sponsor: z.string().trim().max(80).optional().default(""),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
});

export async function addLicense(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = license.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { expiresOn, ...rest } = parsed.data;
  await repo().addLicense({ ...rest, expiresOn: expiresOn || null });
  revalidatePath("/profile");
  return { ok: "Added. We'll check it with the state, then turn on its features." };
}

export async function removeLicense(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) await repo().removeLicense(id);
  revalidatePath("/profile");
}

const METHODS = ["app", "text", "email", "call", "online"] as const;

export async function saveContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const methods = z.array(z.enum(METHODS)).min(1, "Pick at least one way.").safeParse(formData.getAll("methods"));
  if (!methods.success) return { error: methods.error.issues[0]?.message };
  const first = z.enum(METHODS).safeParse(formData.get("first"));
  // First choice goes to the front; the rest keep their order.
  const ordered = first.success && methods.data.includes(first.data) ? [first.data, ...methods.data.filter((m) => m !== first.data)] : methods.data;
  const url = String(formData.get("onlineUrl") ?? "").trim();
  if (ordered.includes("online")) {
    if (!url) return { error: "Add your online scheduler link." };
    if (!/^https:\/\/[^\s]+\.[^\s]+$/.test(url) || url.length > 300) return { error: "Use a full link starting with https://" };
  }
  await repo().saveContactPreference({ preferred: ordered[0], methods: ordered, textAfterCall: formData.get("textAfterCall") === "on", onlineUrl: ordered.includes("online") ? url : undefined });
  revalidatePath("/profile");
  return { ok: "Saved." };
}

const site = z.object({
  label: z.string().trim().max(40),
  url: z.string().trim().max(300).regex(/^https?:\/\/[^\s]+\.[^\s]+$/, "Each website needs a full link starting with https://"),
});

function parseLinks(formData: FormData): { ok: true; links: { label: string; url: string }[] } | { ok: false; error: string } {
  const labels = formData.getAll("label").map(String);
  const urls = formData.getAll("url").map(String);
  const rows = urls.map((url, i) => ({ label: labels[i] ?? "", url: url.trim() })).filter((r) => r.url);
  if (rows.length > 8) return { ok: false, error: "Up to 8 links." };
  const parsed = z.array(site).safeParse(rows.map((r) => ({ ...r, url: /^https?:\/\//.test(r.url) ? r.url : `https://${r.url}` })));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the links." };
  return { ok: true, links: parsed.data };
}

export async function saveReviewLinks(_prev: FormState, formData: FormData): Promise<FormState> {
  const r = parseLinks(formData);
  if (!r.ok) return { error: r.error };
  await repo().updateMe({ reviewLinks: r.links });
  revalidatePath("/profile");
  return { ok: "Saved." };
}

export async function saveIdChoice(_prev: FormState, formData: FormData): Promise<FormState> {
  const mls = String(formData.get("mlsAgentId") ?? "").trim();
  const choice = z.enum(["license", "mls_id", "both"]).safeParse(formData.get("idInMessages"));
  if (!choice.success) return { error: "Pick what to show." };
  if (mls.length > 30) return { error: "That MLS ID looks too long." };
  if (choice.data !== "license" && !mls) return { error: "Add your MLS agent ID to show it." };
  await repo().updateMe({ mlsAgentId: mls, idInMessages: choice.data });
  revalidatePath("/profile");
  return { ok: "Saved." };
}

export async function saveWebsites(_prev: FormState, formData: FormData): Promise<FormState> {
  const labels = formData.getAll("label").map(String);
  const urls = formData.getAll("url").map(String);
  const rows = urls.map((url, i) => ({ label: labels[i] ?? "", url: url.trim() })).filter((r) => r.url);
  if (rows.length > 8) return { error: "Up to 8 websites." };
  const parsed = z.array(site).safeParse(rows.map((r) => ({ ...r, url: /^https?:\/\//.test(r.url) ? r.url : `https://${r.url}` })));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  await repo().updateMe({ websites: parsed.data });
  revalidatePath("/profile");
  return { ok: "Saved." };
}

export async function saveMapApp(formData: FormData) {
  const app = z.enum(["google", "apple", "waze"]).safeParse(formData.get("mapApp"));
  if (!app.success) return;
  await repo().updateMe({ mapApp: app.data });
  revalidatePath("/profile");
}

/** Home and office: where tours can start. Addresses are placed on the map with the Census geocoder. */
export async function saveStartPlaces(_prev: FormState, formData: FormData): Promise<FormState> {
  const { geocode } = await import("@/lib/server/geocode");
  const missed: string[] = [];
  async function place(key: "home" | "office") {
    const address = String(formData.get(`${key}Address`) ?? "").trim().slice(0, 200);
    if (!address) return null;
    const lat = Number(formData.get(`${key}Lat`)), lng = Number(formData.get(`${key}Lng`));
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { address, lat, lng };
    const hit = await geocode(address);
    if (!hit) { missed.push(key); return { address, lat: null, lng: null }; }
    return { address, lat: hit.lat, lng: hit.lng };
  }
  const [home, office] = await Promise.all([place("home"), place("office")]);
  await repo().updateMe({ home, office });
  revalidatePath("/profile");
  revalidatePath("/tour");
  if (missed.length) return { error: `Saved, but we couldn't find your ${missed.join(" and ")} address on the map. Check it, or use "Use where I am now".` };
  return { ok: "Saved." };
}

const membership = z.object({
  kind: z.enum(["association", "mls"]),
  name: z.string().trim().min(2, "Add the name.").max(100),
  memberId: z.string().trim().max(40).optional().default(""),
  url: z.string().trim().max(300).optional().default(""),
});

export async function addMembership(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = membership.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  let url = parsed.data.url;
  if (url && !/^https:\/\//.test(url)) url = `https://${url.replace(/^http:\/\//, "")}`;
  if (url && !/^https:\/\/[^\s]+\.[^\s]+$/.test(url)) return { error: "Check the website link." };
  await repo().addMembership({ ...parsed.data, url });
  revalidatePath("/profile");
  revalidatePath("/resources");
  return { ok: "Added." };
}

export async function removeMembership(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) await repo().removeMembership(id);
  revalidatePath("/profile");
  revalidatePath("/resources");
}

export async function requestMlsAccess(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) await repo().requestMlsAccess(id);
  revalidatePath("/profile");
}
