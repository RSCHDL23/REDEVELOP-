"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isDemoMode, siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { checkPassword } from "@/lib/core/password";

export interface AuthState { error?: string; message?: string }

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.");

async function startDemo(): Promise<never> {
  (await cookies()).set("re_demo", "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
  redirect("/today");
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  if (isDemoMode) return startDemo();
  const email = emailSchema.safeParse(form.get("email"));
  const password = String(form.get("password") ?? "");
  if (!email.success || !password) return { error: "Enter your email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  // Same message for every failure so nobody can find out which emails have accounts.
  if (error) return { error: "That email and password do not match. After 5 tries, wait 15 minutes." };
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") redirect("/login/verify");
  redirect("/today");
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const fullName = String(form.get("fullName") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const email = emailSchema.safeParse(form.get("email"));
  const password = String(form.get("password") ?? "");
  if (!fullName) return { error: "Enter your full name." };
  if (!email.success) return { error: email.error.issues[0].message };
  if (!checkPassword(password, [fullName, ...fullName.split(" "), email.data.split("@")[0]]).strong) return { error: "Your password needs to meet every rule." };
  if (form.get("consent") !== "on") return { error: "Please agree to the terms and to texts about your showings and deals." };
  if (isDemoMode) return startDemo();
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: email.data,
    password,
    options: { data: { full_name: fullName, phone, texts_consent_at: new Date().toISOString() }, emailRedirectTo: `${siteUrl}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: error.message };
  return { message: "Check your email to confirm your account, then sign in." };
}

export async function sendReset(_: AuthState, form: FormData): Promise<AuthState> {
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { error: "Enter the email you signed up with." };
  if (isDemoMode) return { message: "Demo mode: no email is sent. Connect Supabase to turn on password resets." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${siteUrl}/auth/callback?next=/auth/reset` });
  return { message: "If that email has an account, a reset link is on its way. It works once." };
}

export async function verifyCode(_: AuthState, form: FormData): Promise<AuthState> {
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { error: "Enter the 6-digit code from your authenticator app." };
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.[0];
  if (!factor) redirect("/today");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { error: "That code did not work. Codes change every 30 seconds." };
  redirect("/today");
}

export async function setNewPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  if (!checkPassword(password).strong) return { error: "Your password needs to meet every rule." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/today");
}
