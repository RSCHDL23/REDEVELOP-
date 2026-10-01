"use client";
import { useActionState } from "react";
import { verifyCode } from "../actions";

export default function VerifyPage() {
  const [state, action, pending] = useActionState(verifyCode, {});
  return (
    <main className="shell">
      <form action={action} className="page">
        <h1 className="page-title">Enter your 6-digit code</h1>
        <p className="page-sub">Open your authenticator app. This second step keeps your deals safe even if someone learns your password.</p>
        <div className="field">
          <label htmlFor="code">Code</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="input tabular" style={{ fontSize: 28, letterSpacing: "0.3em", textAlign: "center" }} />
        </div>
        {state.error && <p role="alert" className="error">{state.error}</p>}
        <button className="btn primary lg block" disabled={pending}>Verify</button>
      </form>
    </main>
  );
}
