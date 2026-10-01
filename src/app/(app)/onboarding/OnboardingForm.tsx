"use client";

import { useActionState } from "react";
import type { Role } from "@/lib/core/access";
import { finishOnboarding, type OnboardingState } from "./actions";

const CHOICES: { id: Role; label: string; hint: string }[] = [
  { id: "buyer", label: "Buying a home", hint: "Tour homes, rate them, track your purchase" },
  { id: "seller", label: "Selling a home", hint: "See showings, feedback and your sale's progress" },
  { id: "landlord", label: "Landlord", hint: "Approve showings at your rentals" },
  { id: "tenant", label: "Tenant in a home for sale", hint: "Approve or decline showings of your unit" },
  { id: "renter", label: "Looking to rent", hint: "Schedule rental tours" },
  { id: "transaction_coordinator", label: "Transaction coordinator", hint: "Run deal dates and to-dos for agents" },
  { id: "photographer", label: "Real estate photographer", hint: "Book shoots and share your work" },
  { id: "title", label: "Title or escrow", hint: "Follow closings you're working on" },
  { id: "surveyor", label: "Surveyor", hint: "Book surveys and share documents" },
];

export function OnboardingForm({ fullName, phone, selfRoles }: { fullName: string; phone: string; selfRoles: Role[] }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(finishOnboarding, {});
  return (
    <form action={action} className="stack" style={{ gap: 16 }}>
      <div className="card">
        <div className="field"><label htmlFor="fullName">Your name</label><input id="fullName" name="fullName" className="input" defaultValue={fullName} required maxLength={80} autoComplete="name" /></div>
        <div className="field"><label htmlFor="phone">Mobile phone</label><input id="phone" name="phone" type="tel" className="input" defaultValue={phone} maxLength={30} autoComplete="tel" /></div>
      </div>

      <label className="card row" style={{ cursor: "pointer", alignItems: "flex-start", borderColor: "var(--blue)" }}>
        <input type="checkbox" name="licensed" style={{ width: 22, height: 22, marginTop: 2 }} />
        <span className="stack" style={{ gap: 1 }}>
          <span className="strong">I&apos;m a licensed professional</span>
          <span className="small muted">Agent, broker, loan officer, appraiser, inspector, attorney, contractor or insurance. You&apos;ll add each license next, in every state you hold one.</span>
        </span>
      </label>

      <fieldset className="list" style={{ margin: 0 }}>
        <legend className="section-label" style={{ marginBottom: 8 }}>Or I&apos;m…</legend>
        {CHOICES.map((c) => (
          <label key={c.id} className="row" style={{ padding: "12px 14px", borderTop: "1px solid var(--line)", cursor: "pointer", alignItems: "flex-start" }}>
            <input type="checkbox" name="roles" value={c.id} defaultChecked={selfRoles.includes(c.id)} style={{ width: 22, height: 22, marginTop: 2 }} />
            <span className="stack" style={{ gap: 0 }}><span className="strong">{c.label}</span><span className="tiny muted">{c.hint}</span></span>
          </label>
        ))}
      </fieldset>

      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn primary lg block" disabled={pending}>{pending ? "Saving…" : "Continue"}</button>
    </form>
  );
}
