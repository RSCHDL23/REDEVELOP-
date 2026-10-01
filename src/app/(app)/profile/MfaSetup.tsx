"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type Step = { kind: "loading" } | { kind: "off" } | { kind: "on"; factorId: string } | { kind: "enrolling"; factorId: string; qr: string; secret: string };

/** Two-step sign-in with an authenticator app (Google Authenticator, 1Password, Authy...). */
export function MfaSetup({ demo }: { demo: boolean }) {
  const [step, setStep] = useState<Step>(demo ? { kind: "off" } : { kind: "loading" });
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (demo) return;
    createClient().auth.mfa.listFactors().then(({ data }) => {
      const f = data?.totp.find((x) => x.status === "verified");
      setStep(f ? { kind: "on", factorId: f.id } : { kind: "off" });
    });
  }, [demo]);

  async function start() {
    setError("");
    if (demo) return setError("Two-step sign-in turns on once your Supabase project is connected.");
    const sb = createClient();
    // Clear any half-finished setup first.
    const { data: existing } = await sb.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data, error: e } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" });
    if (e || !data) return setError("Couldn't start setup. Make sure two-step sign-in is turned on in Supabase.");
    setStep({ kind: "enrolling", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm() {
    if (step.kind !== "enrolling") return;
    setError("");
    const { error: e } = await createClient().auth.mfa.challengeAndVerify({ factorId: step.factorId, code: code.trim() });
    if (e) return setError("That code didn't match. Use the newest 6-digit code.");
    setStep({ kind: "on", factorId: step.factorId });
    setCode("");
  }

  async function turnOff() {
    if (step.kind !== "on") return;
    if (!window.confirm("Turn off two-step sign-in? Your account will only be protected by your password.")) return;
    const { error: e } = await createClient().auth.mfa.unenroll({ factorId: step.factorId });
    if (e) return setError("Sign in again with your code, then try turning it off.");
    setStep({ kind: "off" });
  }

  return (
    <div className="stack">
      <div className="between">
        <span className="stack" style={{ gap: 0 }}>
          <span className="strong">Two-step sign-in</span>
          <span className="tiny muted">A 6-digit code from an authenticator app each time you sign in</span>
        </span>
        {step.kind === "on" && <span className="pill blue">On</span>}
        {step.kind === "off" && <span className="pill amber">Off</span>}
      </div>
      {step.kind === "off" && <button type="button" className="btn block" onClick={start}>Turn on</button>}
      {step.kind === "on" && <button type="button" className="btn danger block" onClick={turnOff}>Turn off</button>}
      {step.kind === "enrolling" && (
        <div className="stack">
          <span className="small">1. Scan this with your authenticator app.</span>
          <img src={step.qr} alt="QR code for your authenticator app" width={180} height={180} style={{ alignSelf: "center", background: "#fff", padding: 8, borderRadius: 12 }} />
          <span className="tiny muted" style={{ wordBreak: "break-all" }}>Can&apos;t scan? Enter this key: <span className="strong tabular">{step.secret}</span></span>
          <label className="small" htmlFor="mfa-code">2. Enter the 6-digit code it shows.</label>
          <input id="mfa-code" className="input tabular" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <button type="button" className="btn primary block" onClick={confirm} disabled={code.length !== 6}>Confirm</button>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
