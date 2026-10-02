"use client";

import { useActionState, useState } from "react";
import { PROFESSION_LABELS, type Profession } from "@/lib/core/access";
import type { ContactPreference, Website } from "@/lib/data/types";
import { addLicense, saveContact, saveDetails, saveIdChoice, saveReviewLinks, saveStartPlaces, saveWebsites, type FormState } from "./actions";
import type { Place } from "@/lib/data/types";

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
  const [picked, setPicked] = useState<string[]>(pref.methods.length ? pref.methods : [pref.preferred]);
  const [first, setFirst] = useState<string>(pref.methods[0] ?? pref.preferred);
  const toggle = (id: string, on: boolean) => {
    const next = on ? [...picked, id] : picked.filter((m) => m !== id);
    setPicked(next);
    if (!next.includes(first) && next[0]) setFirst(next[0]);
    if (on && next.length === 1) setFirst(id);
  };
  return (
    <form action={action} className="card">
      <fieldset style={{ border: 0, margin: 0, padding: 0 }} className="stack">
        <legend className="small muted" style={{ marginBottom: 6 }}>How other agents can request showings on your listings. Pick as many as you like.</legend>
        {METHODS.map((m) => (
          <label key={m.id} className="row" style={{ alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" name="methods" value={m.id} checked={picked.includes(m.id)} onChange={(e) => toggle(m.id, e.target.checked)} style={{ width: 20, height: 20, marginTop: 2 }} />
            <span className="stack" style={{ gap: 0, flex: 1 }}><span className="strong">{m.label}</span><span className="tiny muted">{m.hint}</span></span>
            {picked.includes(m.id) && first === m.id && <span className="pill blue">First choice</span>}
          </label>
        ))}
      </fieldset>
      {picked.length > 1 && (
        <div className="field">
          <label htmlFor="first">First choice</label>
          <select id="first" name="first" className="input" value={first} onChange={(e) => setFirst(e.target.value)}>
            {METHODS.filter((m) => picked.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
      )}
      {picked.length === 1 && <input type="hidden" name="first" value={picked[0]} />}
      {picked.includes("online") && <div className="field"><label htmlFor="onlineUrl">Scheduler link</label><input id="onlineUrl" name="onlineUrl" type="url" className="input" defaultValue={pref.onlineUrl ?? ""} placeholder="https://" /></div>}
      <label className="row small" style={{ cursor: "pointer" }}>
        <input type="checkbox" name="textAfterCall" defaultChecked={pref.textAfterCall} style={{ width: 20, height: 20 }} />
        After I call another agent, offer to text them a recap
      </label>
      <Status state={state} />
      <button className="btn primary block" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}

export function WebsitesForm({ websites, kind = "websites" }: { websites: Website[]; kind?: "websites" | "reviews" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(kind === "reviews" ? saveReviewLinks : saveWebsites, {});
  const [rows, setRows] = useState(websites.length ? websites.map((w, i) => ({ ...w, key: i })) : [{ label: "", url: "", key: 0 }]);
  return (
    <form action={action} className="card">
      <span className="small muted">{kind === "reviews"
        ? "Where clients can review you: Zillow, Google, Realtor.com, Yelp… Added to every review request."
        : "Your brokerage site, IDX search, Zillow, Instagram, YouTube… Shown on your public profile."}</span>
      {rows.map((r, i) => (
        <div key={r.key} className="stack" style={{ gap: 6, paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>
          <div className="row" style={{ gap: 6 }}>
            <input name="label" className="input" aria-label={`Website ${i + 1} name`} placeholder={kind === "reviews" ? "Site, e.g. Zillow" : "Name, e.g. My listings"} defaultValue={r.label} maxLength={40} style={{ flex: 1 }} />
            <button type="button" className="btn danger" aria-label={`Remove website ${i + 1}`} onClick={() => setRows(rows.filter((x) => x.key !== r.key))} style={{ width: 48, padding: 0 }}>✕</button>
          </div>
          <input name="url" className="input" aria-label={`Website ${i + 1} link`} placeholder="https://" defaultValue={r.url} maxLength={300} inputMode="url" />
        </div>
      ))}
      {rows.length < 8 && <button type="button" className="btn block" onClick={() => setRows([...rows, { label: "", url: "", key: Date.now() }])}>{kind === "reviews" ? "+ Add review site" : "+ Add website"}</button>}
      <Status state={state} />
      <button className="btn primary block" disabled={pending}>{pending ? "Saving…" : kind === "reviews" ? "Save review sites" : "Save websites"}</button>
    </form>
  );
}

export function IdChoiceForm({ mlsAgentId, idInMessages }: { mlsAgentId: string; idInMessages: "license" | "mls_id" | "both" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveIdChoice, {});
  return (
    <form action={action} className="card">
      <span className="small muted">What to show in showing requests you send outside the app.</span>
      <div className="field"><label htmlFor="mlsAgentId">MLS agent ID</label><input id="mlsAgentId" name="mlsAgentId" className="input" defaultValue={mlsAgentId} maxLength={30} placeholder="e.g. 70012345" /></div>
      <fieldset style={{ border: 0, margin: 0, padding: 0 }} className="stack">
        <legend className="small strong" style={{ marginBottom: 6 }}>Show in requests</legend>
        {[["license", "License number"], ["mls_id", "MLS agent ID"], ["both", "Both"]].map(([id, label]) => (
          <label key={id} className="row" style={{ cursor: "pointer" }}>
            <input type="radio" name="idInMessages" value={id} defaultChecked={idInMessages === id} style={{ width: 20, height: 20 }} /> {label}
          </label>
        ))}
      </fieldset>
      <Status state={state} />
      <button className="btn primary block" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}

export function StartPlacesForm({ home, office }: { home: Place | null; office: Place | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveStartPlaces, {});
  const [coords, setCoords] = useState<Record<string, { lat: number; lng: number } | null>>({ home: null, office: null });
  const [addr, setAddr] = useState({ home: home?.address ?? "", office: office?.address ?? "" });
  const [msg, setMsg] = useState("");
  function here(key: "home" | "office") {
    if (!navigator.geolocation) { setMsg("Location isn't available on this device."); return; }
    setMsg("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords((c) => ({ ...c, [key]: { lat: p.coords.latitude, lng: p.coords.longitude } })); setAddr((a) => ({ ...a, [key]: a[key] || (key === "home" ? "Home" : "Office") })); setMsg(`Got it. Tap Save to keep this as your ${key}.`); },
      () => setMsg("Allow location access, or type the address."),
      { timeout: 10000 },
    );
  }
  return (
    <form action={action} className="card">
      <span className="small muted">Where your tours can start. Used for drive times and &ldquo;time to leave&rdquo; alerts.</span>
      {(["home", "office"] as const).map((k) => {
        const saved = k === "home" ? home : office;
        return (
          <div key={k} className="field">
            <label htmlFor={`${k}Address`}>{k === "home" ? "Home address" : "Office address"}</label>
            <input id={`${k}Address`} name={`${k}Address`} className="input" value={addr[k]} onChange={(e) => { setAddr((a) => ({ ...a, [k]: e.target.value })); setCoords((c) => ({ ...c, [k]: null })); }} maxLength={200} placeholder="Street, city, state" />
            <input type="hidden" name={`${k}Lat`} value={coords[k]?.lat ?? ""} />
            <input type="hidden" name={`${k}Lng`} value={coords[k]?.lng ?? ""} />
            <div className="between">
              <span className="tiny muted">{coords[k] ? "📍 Using your current location" : saved?.lat != null ? "📍 On the map" : saved ? "Not found on the map yet" : ""}</span>
              <button type="button" className="btn" style={{ minHeight: 32, fontSize: 12 }} onClick={() => here(k)}>Use where I am now</button>
            </div>
          </div>
        );
      })}
      {msg && <span className="small" role="status">{msg}</span>}
      <Status state={state} />
      <button className="btn primary block" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
