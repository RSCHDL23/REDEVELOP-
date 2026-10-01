import type { Metadata } from "next";
import { isDemoMode } from "@/lib/env";
import { LoginForms } from "./LoginForms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="shell" style={{ background: "var(--ground)" }}>
      <header style={{ background: "var(--ink)", borderRadius: "0 0 28px 28px", padding: "36px 24px 26px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <img src="/icon.png" alt="" width={64} height={64} style={{ borderRadius: 16 }} />
        <img src="/wordmark-dark.png" alt="REschedule" height={26} style={{ height: 26, width: "auto" }} />
        <span style={{ color: "#c3cbd1", fontSize: 14 }}>One app for every showing and every deal</span>
      </header>
      {isDemoMode && (
        <p className="notice amber" style={{ margin: "16px 20px 0" }}>
          Demo mode: Supabase is not connected yet, so any email and password opens the app with sample data.
        </p>
      )}
      {error === "link" && <p className="notice amber" style={{ margin: "16px 20px 0" }}>That link expired or was already used. Try again.</p>}
      <LoginForms demo={isDemoMode} />
    </main>
  );
}
