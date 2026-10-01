"use client";
import { useActionState, useState } from "react";
import { checkPassword } from "@/lib/core/password";
import { sendReset, signIn, signUp, type AuthState } from "./actions";

type View = "signin" | "create" | "reset";

export function LoginForms({ demo }: { demo: boolean }) {
  const [view, setView] = useState<View>("signin");
  const [show, setShow] = useState(false);
  return (
    <div className="page" style={{ paddingBottom: 32 }}>
      {view === "signin" && <SignIn show={show} setShow={setShow} onCreate={() => setView("create")} onForgot={() => setView("reset")} demo={demo} />}
      {view === "create" && <Create show={show} setShow={setShow} onSignIn={() => setView("signin")} />}
      {view === "reset" && <Reset onBack={() => setView("signin")} />}
    </div>
  );
}

function PasswordInput({ id, name, show, setShow, value, onChange, autoComplete }: { id: string; name: string; show: boolean; setShow: (v: boolean) => void; value?: string; onChange?: (v: string) => void; autoComplete: string }) {
  return (
    <div className="row" style={{ border: "1px solid var(--line-2)", borderRadius: 12, background: "#fff", gap: 0 }}>
      <input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required className="input" style={{ border: 0, flex: 1 }}
        value={value} onChange={onChange ? (e) => onChange(e.target.value) : undefined} />
      <button type="button" className="btn" style={{ border: 0, color: "var(--blue-text)" }} onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function Status({ state }: { state: AuthState }) {
  if (state.error) return <p role="alert" className="error">{state.error}</p>;
  if (state.message) return <p role="status" className="notice">{state.message}</p>;
  return null;
}

function SignIn({ show, setShow, onCreate, onForgot, demo }: { show: boolean; setShow: (v: boolean) => void; onCreate: () => void; onForgot: () => void; demo: boolean }) {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="stack" style={{ gap: 14 }}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required={!demo} className="input" placeholder="you@example.com" />
      </div>
      <div className="field">
        <div className="between">
          <label htmlFor="password">Password</label>
          <button type="button" onClick={onForgot} className="btn" style={{ border: 0, minHeight: 32, padding: 0, color: "var(--blue-text)" }}>Forgot password?</button>
        </div>
        <PasswordInput id="password" name="password" show={show} setShow={setShow} autoComplete="current-password" />
      </div>
      <Status state={state} />
      <button className="btn primary lg block" disabled={pending}>{pending ? "Signing in..." : "Sign in"}</button>
      <p className="tiny muted" style={{ margin: 0, textAlign: "center" }}>Accounts with 2-step verification are asked for a code next.</p>
      <button type="button" onClick={onCreate} className="btn block" style={{ border: 0, background: "transparent" }}>
        New to REschedule?&nbsp;<span style={{ color: "var(--blue-text)", fontWeight: 900 }}>Create an account</span>
      </button>
    </form>
  );
}

function Create({ show, setShow, onSignIn }: { show: boolean; setShow: (v: boolean) => void; onSignIn: () => void }) {
  const [state, action, pending] = useActionState(signUp, {});
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const check = checkPassword(pw, [name, ...name.split(" ")]);
  const meter = ["#e1e5e9", "#a12a2a", "#b8741f", "#12a9ee", "#0a6fa8"][check.score];
  return (
    <form action={action} className="stack" style={{ gap: 12 }}>
      <h1 className="page-title" style={{ fontSize: 22 }}>Create your account</h1>
      <div className="field"><label htmlFor="fullName">Full name</label><input id="fullName" name="fullName" autoComplete="name" required className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label htmlFor="cemail">Email</label><input id="cemail" name="email" type="email" autoComplete="email" required className="input" /></div>
      <div className="field"><label htmlFor="phone">Mobile number</label><input id="phone" name="phone" type="tel" autoComplete="tel" className="input" placeholder="For showing alerts" /></div>
      <div className="field">
        <label htmlFor="newpw">Create a password</label>
        <PasswordInput id="newpw" name="password" show={show} setShow={setShow} value={pw} onChange={setPw} autoComplete="new-password" />
        <div className="grid-3" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }} aria-hidden="true">
          {[1, 2, 3, 4].map((i) => <span key={i} style={{ height: 6, borderRadius: 3, background: i <= check.score ? meter : "#e1e5e9" }} />)}
        </div>
        <span className="small strong" aria-live="polite">{check.label}</span>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }} className="stack">
          {check.rules.map((r) => (
            <li key={r.label} className="row small" style={{ gap: 8, color: r.ok ? "var(--ink)" : "var(--muted)" }}>
              <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 9, background: r.ok ? "var(--blue)" : "#e6e9ed", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>{r.ok ? "✓" : ""}</span>
              <span className="strong">{r.label}</span>
              <span className="sr-only">{r.ok ? "(met)" : "(not met)"}</span>
            </li>
          ))}
        </ul>
      </div>
      <label className="row small" style={{ alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
        <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 22, height: 22, marginTop: 2 }} />
        <span className="muted">I agree to the Terms and Privacy Policy, and to get texts about my showings and deals. Message and data rates may apply. Reply STOP to opt out.</span>
      </label>
      <Status state={state} />
      <button className="btn primary lg block" disabled={pending || !check.strong || !consent}>{pending ? "Creating..." : "Create account"}</button>
      <button type="button" onClick={onSignIn} className="btn block" style={{ border: 0, background: "transparent" }}>
        Already have an account?&nbsp;<span style={{ color: "var(--blue-text)", fontWeight: 900 }}>Sign in</span>
      </button>
    </form>
  );
}

function Reset({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState(sendReset, {});
  return (
    <form action={action} className="stack" style={{ gap: 14 }}>
      <h1 className="page-title" style={{ fontSize: 22 }}>Reset your password</h1>
      <p className="page-sub">We will email you a link that works once and expires soon.</p>
      <div className="field"><label htmlFor="remail">Email</label><input id="remail" name="email" type="email" autoComplete="email" required className="input" /></div>
      <Status state={state} />
      <button className="btn primary lg block" disabled={pending}>Send reset link</button>
      <button type="button" onClick={onBack} className="btn block" style={{ border: 0, background: "transparent", color: "var(--blue-text)" }}>Back to sign in</button>
    </form>
  );
}
