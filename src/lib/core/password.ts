/**
 * Password rules shown live on the sign-up screen. Supabase also enforces a
 * minimum length on the server; turn on "Leaked password protection" in
 * Supabase Auth settings so breached passwords are rejected too.
 */

const COMMON = new Set([
  "password", "password1", "password123", "123456789012", "qwerty123456", "letmein12345",
  "realestate1", "realestate123", "iloveyou1234", "welcome12345", "changeme1234",
]);

export interface PasswordCheck {
  rules: { label: string; ok: boolean }[];
  score: 0 | 1 | 2 | 3 | 4;
  label: "Type a password" | "Weak" | "Fair" | "Good" | "Strong";
  strong: boolean;
}

export const MIN_PASSWORD_LENGTH = 12;

export function checkPassword(pw: string, context: string[] = []): PasswordCheck {
  const lower = pw.toLowerCase();
  const personal = context.filter((c) => c.length >= 3).some((c) => lower.includes(c.toLowerCase()));
  const rules = [
    { label: `At least ${MIN_PASSWORD_LENGTH} characters`, ok: pw.length >= MIN_PASSWORD_LENGTH },
    { label: "Upper and lowercase letters", ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
    { label: "At least one number", ok: /\d/.test(pw) },
    { label: "At least one symbol, like ! or #", ok: /[^A-Za-z0-9]/.test(pw) },
    { label: "Not a common password or your name or email", ok: pw.length > 0 && !COMMON.has(lower) && !personal },
  ];
  const passed = rules.filter((r) => r.ok).length;
  const score = (pw.length === 0 ? 0 : passed <= 2 ? 1 : passed === 3 ? 2 : passed === 4 ? 3 : 4) as PasswordCheck["score"];
  const labels = ["Type a password", "Weak", "Fair", "Good", "Strong"] as const;
  return { rules, score, label: labels[score], strong: passed === rules.length };
}
