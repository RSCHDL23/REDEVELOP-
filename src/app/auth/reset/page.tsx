"use client";
import { useActionState, useState } from "react";
import { checkPassword } from "@/lib/core/password";
import { setNewPassword } from "@/app/login/actions";

export default function ResetPage() {
  const [state, action, pending] = useActionState(setNewPassword, {});
  const [pw, setPw] = useState("");
  const check = checkPassword(pw);
  return (
    <main className="shell">
      <form action={action} className="page">
        <h1 className="page-title">Choose a new password</h1>
        <div className="field">
          <label htmlFor="pw">New password</label>
          <input id="pw" name="password" type="password" autoComplete="new-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <ul className="stack small" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {check.rules.map((r) => <li key={r.label} style={{ color: r.ok ? "var(--ink)" : "var(--muted)" }}>{r.ok ? "✓ " : "○ "}{r.label}</li>)}
        </ul>
        {state.error && <p role="alert" className="error">{state.error}</p>}
        <button className="btn primary lg block" disabled={pending || !check.strong}>Save new password</button>
      </form>
    </main>
  );
}
