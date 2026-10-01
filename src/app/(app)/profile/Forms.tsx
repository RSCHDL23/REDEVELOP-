"use client";

import { useActionState, useState } from "react";
import { PROFESSION_LABELS, type Profession } from "@/lib/core/access";
import type { ContactPreference } from "@/lib/data/types";
import { addLicense, saveContact, saveDetails, type FormState } from "./actions";

function Status({ state }: { state: FormState }) {
  if (state.error) return <p className="error" role="alert">{state.error}</p>;
  if (state.ok) return <p className="small strong" style={{ color: "var(--blue-text)", margin: 0 }} role="status">{state.ok}</p>;
  return null;
}

export function DetailsForm({ fullName, phone, tagline, bio, isPro }: { fullName: string; phone: string; tagline: string; bio: string; isPro: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveDetails, {});
  const [tag, setTag] = useState(tagline);
  return (
    <form action={action} className="card">
      <div className="field"><label htmlFor="fullName">Name</label><input id="fullName" name="fullName" className="input" defaultValue={fullName} maxLength={80} required autoComplete="name" /></div>
      <div className="field"><label htmlFor="phone">Mobile phone</label><input id="phone" name="phone" type="tel" className="input" defaultValue={phone} maxLength={30} autoComplete="tel" /></div>
      {isPro && (
        <div className="field">
          <div className="between"><label htmlFor="tagline">Tagline</label><span className="tiny muted tabular">{tag.length}/80</span></div>
          <input id="tagline" name="tagline" className="input" value={tag} onChange={(e) => setTag(e.target.value.slice(0, 80))} maxLength={80} placeholder="e.g. Your home, on your schedule." />
          <span className="tiny muted">Shows under your name on your profile, showing requests and reviews.</span>
        </div>
      )}
      {isPro && <div className="field"><label htmlFor="bio">About you</label><textarea id="bio" name="bio" className="input" defaultValue={bio} maxLength={600} /></div>}
      <Status state={state} />
      <button className="btn primary block" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}

export function LicenseForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addLicense, {});
  return (
    <details className="card">
      <summary className="strong" style={{ cursor: "pointer", minHeight: 28 }}>+ Add a license</summary>
      <form action={action} className="stack" style={{ marginTop: 10 }}>
        <div className="field">
          <label htmlFor="profession">License type</label>
          <select id="profession" name="profession" className="input" defaultValue="real_estate_broker">
            {(Object.keys(PROFESSION_LABELS) as Profession[]).map((p) => <option key={p} value={p}>{PROFESSION_LABELS[p]}</option>)}
          </select>
        </div>
        <div className="grid-2">
          <div className="field"><label htmlFor="state">State</label><input id="state" name="state" className="input" maxLength={2} placeholder="IL" required style={{ textTransform: "uppercase" }} /></div>
          <div className="field"><label htmlFor="expiresOn">Expires</label><input id="expiresOn" name="expiresOn" type="date" className="input" /></div>
        </div>
        <div className="field"><label htmlFor="number">License or NMLS number</label><input id="number" name="number" className="input" maxLength={40} required /></div>
        <div className="field"><label htmlFor="sponsor">Sponsoring broker or company</label><input id="sponsor" name="sponsor" className="input" maxLength={80} /></div>
        <Status state={state} />
        <button className="btn dark block" disabled={pending}>{pending ? "Adding…" : "Add license"}</button>
      </form>
    </details>
  );
}

const METHODS = [
  { id: "app", label: "REschedule app", hint: "Requests arrive here; approve with one tap." },
  { id: "text", label: "Text", hint: "Agents get a ready-to-send text to your phone." },
  { id: "email", label: "Email", hint: "Agents get a ready-to-send email." },
  { id: "call", label: "Phone call", hint: "Agents get a call script, then can text a recap." },
  { id: "online", label: "My online scheduler", hint: "Agents are sent to your scheduling link." },
] as const;

export function ContactForm({ pref }: { pref: ContactPreference }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveContact, {});
  const [method, setMethod] = useState<string>(pref.preferred);
  return (
    <form action={action} className="card">
      <fieldset style={{ border: 0, margin: 0, padding: 0 }} className="stack">
        <legend className="small muted" style={{ marginBottom: 6 }}>How other agents should request showings on your listings</legend>
        {METHODS.map((m) => (
          <label key={m.id} className="row" style={{ alignItems: "flex-start", cursor: "pointer" }}>
            <input type="radio" name="preferred" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} style={{ width: 20, height: 20, marginTop: 2 }} />
            <span className="stack" style={{ gap: 0 }}><span className="strong">{m.label}</span><span className="tiny muted">{m.hint}</span></span>
          </label>
        ))}
      </fieldset>
      {method === "online" && <div className="field"><label htmlFor="onlineUrl">Scheduler link</label><input id="onlineUrl" name="onlineUrl" type="url" className="input" defaultValue={pref.onlineUrl ?? ""} placeholder="https://" /></div>}
      <label className="row small" style={{ cursor: "pointer" }}>
        <input type="checkbox" name="textAfterCall" defaultChecked={pref.textAfterCall} style={{ width: 20, height: 20 }} />
        After I call another agent, offer to text them a recap
      </label>
      <Status state={state} />
      <button className="btn primary block" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
