"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { repo } from "@/lib/data";

const SELF_ROLES = ["buyer", "seller", "landlord", "tenant", "renter", "transaction_coordinator", "title", "surveyor", "photographer"] as const;

const schema = z.object({
  fullName: z.string().trim().min(1, "Add your name.").max(80),
  phone: z.string().trim().max(30),
  roles: z.array(z.enum(SELF_ROLES)).max(SELF_ROLES.length),
  licensed: z.boolean(),
});

export type OnboardingState = { error?: string };

export async function finishOnboarding(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? "",
    roles: formData.getAll("roles"),
    licensed: formData.get("licensed") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!parsed.data.licensed && parsed.data.roles.length === 0) return { error: "Pick at least one." };
  await repo().updateMe({ fullName: parsed.data.fullName, phone: parsed.data.phone, selfRoles: parsed.data.roles });
  // Buyers and renters go straight to "Get ready": pre-approval, proof of funds, lenders, an estimate, or NACA.
  const shopper = parsed.data.roles.some((r) => r === "buyer" || r === "renter" || r === "tenant");
  redirect(parsed.data.licensed ? "/profile#licenses" : shopper ? "/get-ready" : "/today");
}
