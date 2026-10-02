"use client";

import { useActionState } from "react";
import { connect, type ConnectState } from "./actions";

export function ConnectForm({ slug, firstName }: { slug: string; firstName: string }) {
  const [state, action, pending] = useActionState<ConnectState, FormData>(connect, {});
  if (state.ok) {
    return (
      <div className="card status-card status-approved" role="status">
        <span className="strong" style={{ fontSize: 18 }}>Thanks, {state.ok}! 🎉</span>
        <span className="small">{firstName} has your info and will reach out soon.</span>
      </div>
    );
  }
  return (
    <form action={action} className="card" style={{ gap: 12 }}>
      <span className="strong" style={{ fontSize: 18 }}>Connect with {firstName}</span>
      <input type="hidden" name="slug" value={slug} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999 }} />
      <div className="field"><label htmlFor="name">Your name</label><input id="name" name="name" className="input" required maxLength={80} autoComplete="name" /></div>
      <div className="field"><label htmlFor="phone">Mobile phone</label><input id="phone" name="phone" type="tel" className="input" maxLength={30} autoComplete="tel" /></div>
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" className="input" maxLength={120} autoComplete="email" /></div>
      <div className="field">
        <label htmlFor="intent">I&apos;m interested in</label>
        <select id="intent" name="intent" className="input" defaultValue="Buying">
          {["Buying", "Selling", "Renting", "Investing", "Other"].map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>
      <label className="row small" style={{ alignItems: "flex-start", cursor: "pointer" }}>
        <input type="checkbox" name="consent" required style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0 }} />
        <span>I agree that {firstName} may contact me by call, text or email about real estate. Message and data rates may apply. Reply STOP to opt out.</span>
      </label>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn primary lg block" disabled={pending}>{pending ? "Sending…" : "Send my info"}</button>
    </form>
  );
}
