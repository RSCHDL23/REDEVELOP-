"use client";

import { useActionState, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LengthSelect, TimeSelect } from "@/components/TimeFields";
import { createRequest, type NewRequestState } from "../actions";
import { HomeSnapshot } from "@/components/HomeSnapshot";
import { AttachDocs } from "@/components/AttachDocs";
import type { Attachment } from "@/lib/data/types";

type Home = { id: string; address: string; city: string; photoUrl: string | null; source: string; agent: string; preferred: string; methods: string[]; minutes: number; instant: boolean; beds: number; baths: number; sqft: number | null; price: number | null };
type ClientOption = { id: string; name: string; preApproved: boolean };

const METHOD_LABEL: Record<string, string> = {
  app: "the REschedule app", text: "text", email: "email", call: "a phone call", online: "their online scheduler",
};
const SOURCE_LABEL: Record<string, string> = { mls: "MLS", fsbo: "FSBO", app: "REschedule" };

export function NewRequestForm({ homes, clients, defaultListing, defaultClient, defaultDate, defaultStart, defaultMinutes, defaultAddress }: {
  homes: Home[]; clients: ClientOption[]; defaultListing?: string; defaultClient?: string; defaultDate: string;
  defaultStart?: number; defaultMinutes?: number; defaultAddress?: string;
}) {
  const [state, action, pending] = useActionState<NewRequestState, FormData>(createRequest, {});
  const initial = homes.find((h) => h.id === defaultListing) ?? null;
  const [home, setHome] = useState<Home | null>(initial);
  const [typed, setTyped] = useState(!initial && !!defaultAddress); // a typed-in home that isn't in the system
  const [query, setQuery] = useState(initial ? `${initial.address}, ${initial.city}` : defaultAddress ?? "");
  const [docs, setDocs] = useState<Attachment[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [clientId, setClientId] = useState(clients.some((c) => c.id === defaultClient) ? defaultClient! : clients[0]?.id ?? "new");
  const listId = useId();
  const box = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    return homes.filter((h) => words.every((w) => `${h.address} ${h.city}`.toLowerCase().includes(w))).slice(0, 8);
  }, [homes, query]);
  const canType = query.trim().length >= 5 && !matches.some((h) => `${h.address}, ${h.city}`.toLowerCase() === query.trim().toLowerCase());
  const options = [...matches.map((h) => ({ kind: "home" as const, h })), ...(canType ? [{ kind: "typed" as const }] : [])];

  function choose(i: number) {
    const o = options[i];
    if (!o) return;
    if (o.kind === "home") { setHome(o.h); setTyped(false); setQuery(`${o.h.address}, ${o.h.city}`); }
    else { setHome(null); setTyped(true); }
    setOpen(false);
  }

  if (state.send) {
    return (
      <section className="card status-card status-pending" aria-live="polite">
        <span className="strong" style={{ fontSize: 18 }}>Request saved</span>
        <span className="small">This listing agent isn&apos;t on REschedule yet, so send it from your phone. It&apos;s written for you:</span>
        <p className="small" style={{ margin: 0, whiteSpace: "pre-wrap", background: "#fff", padding: 10, borderRadius: 10 }}>{state.send.body}</p>
        {state.send.href && <a className="btn primary lg block" href={state.send.href}>{state.send.label}</a>}
        {state.alsoText && <a className="btn block" style={{ background: "#fff" }} href={state.alsoText.href}>📎 {state.alsoText.label}</a>}
        <Link href="/showings?tab=sent" className="btn block" style={{ background: "#fff" }}>Done</Link>
      </section>
    );
  }

  return (
    <form action={action} className="stack" style={{ gap: 14 }}>
      {/* Home: pick from the MLS/FSBO/REschedule list, or type an address that isn't listed. */}
      <div className="field" style={{ position: "relative" }}>
        <label htmlFor="home">Home</label>
        <div className="row" style={{ gap: 6 }}>
          <input
            ref={box}
            id="home"
            className="input"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            placeholder="Search address, or type a new one"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); setHome(null); setTyped(false); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter" && open && options.length) { e.preventDefault(); choose(active); }
              else if (e.key === "Escape") setOpen(false);
            }}
          />
          <button type="button" className="btn" aria-label="Show all homes" onClick={() => { setOpen((o) => !o); box.current?.focus(); }} style={{ width: 48, padding: 0 }}>▾</button>
        </div>
        {open && options.length > 0 && (
          <ul id={listId} role="listbox" className="suggest">
            {options.map((o, i) => (
              <li key={o.kind === "home" ? o.h.id : "typed"}>
                <button type="button" role="option" aria-selected={i === active} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(i)}>
                  {o.kind === "home" ? (
                    <>
                      {o.h.photoUrl ? <img src={o.h.photoUrl} alt="" style={{ width: 52, height: 40, objectFit: "cover", borderRadius: 6 }} /> : <span style={{ width: 52 }} />}
                      <span className="stack" style={{ gap: 0, flex: 1 }}>
                        <span className="strong small">{o.h.address}</span>
                        <span className="tiny muted">{o.h.city} · {o.h.agent}</span>
                      </span>
                      <span className="pill">{SOURCE_LABEL[o.h.source] ?? "MLS"}</span>
                    </>
                  ) : (
                    <span className="small"><span className="strong">Use &ldquo;{query.trim()}&rdquo;</span><br /><span className="tiny muted">Not on the MLS or FSBO. You&apos;ll add the listing agent.</span></span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        <input type="hidden" name="listingId" value={home?.id ?? ""} />
        <input type="hidden" name="address" value={typed ? query.trim() : ""} />
      </div>

      {home && (
        <div className="card row" style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {home.photoUrl && <img src={home.photoUrl} alt={`Photo of ${home.address}`} className="thumb" />}
          <span className="stack small" style={{ gap: 2 }}>
            <HomeSnapshot home={{ address: home.address, city: home.city, photoUrl: home.photoUrl, beds: home.beds, baths: home.baths, sqft: home.sqft, price: home.price }} />
            <span className="muted">{home.beds} bd · {home.baths} ba{home.sqft ? ` · ${home.sqft.toLocaleString()} sq ft` : ""}</span>
            <span><span className="strong">{home.agent}</span> takes requests by {home.methods.map((m) => METHOD_LABEL[m] ?? m).join(" or ")}.</span>
            {home.instant && <span className="pill blue" style={{ alignSelf: "flex-start" }}>Instant approval</span>}
          </span>
        </div>
      )}

      {typed && (
        <fieldset className="card" style={{ margin: 0 }}>
          <legend className="small strong" style={{ padding: "0 4px" }}>Listing agent</legend>
          <div className="field"><label htmlFor="agentName">Name</label><input id="agentName" name="agentName" className="input" maxLength={80} required /></div>
          <div className="grid-2">
            <div className="field"><label htmlFor="agentPhone">Mobile</label><input id="agentPhone" name="agentPhone" type="tel" className="input" maxLength={30} /></div>
            <div className="field"><label htmlFor="agentEmail">Email</label><input id="agentEmail" name="agentEmail" type="email" className="input" maxLength={120} /></div>
          </div>
          <span className="tiny muted">Add a phone or email. You&apos;ll get a ready-to-send text or email.</span>
        </fieldset>
      )}

      <div className="field">
        <label htmlFor="date">Date</label>
        <input id="date" name="date" type="date" className="input" defaultValue={defaultDate} required />
      </div>
      <TimeSelect name="time" defaultMinutes={defaultStart ?? 13 * 60} />
      <LengthSelect defaultValue={defaultMinutes ?? home?.minutes ?? 30} key={home?.id ?? "none"} />

      {/* Buyer: from your saved clients, or someone new. */}
      <div className="field">
        <label htmlFor="clientId">Buyer</label>
        <select id="clientId" name="clientId" className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.preApproved ? " · pre-approved" : ""}</option>)}
          <option value="new">+ Someone new…</option>
        </select>
      </div>
      {clientId === "new" && (
        <fieldset className="card" style={{ margin: 0 }}>
          <legend className="small strong" style={{ padding: "0 4px" }}>New buyer</legend>
          <div className="field"><label htmlFor="buyerName">Name</label><input id="buyerName" name="buyerName" className="input" maxLength={80} required placeholder="e.g. Jordan & Sam Reyes" /></div>
          <div className="grid-2">
            <div className="field"><label htmlFor="buyerPhone">Mobile</label><input id="buyerPhone" name="buyerPhone" type="tel" className="input" maxLength={30} /></div>
            <div className="field"><label htmlFor="buyerEmail">Email</label><input id="buyerEmail" name="buyerEmail" type="email" className="input" maxLength={120} /></div>
          </div>
          <label className="row small" style={{ cursor: "pointer" }}><input type="checkbox" name="preApproved" style={{ width: 20, height: 20 }} /> Pre-approved</label>
          <label className="row small" style={{ cursor: "pointer" }}><input type="checkbox" name="saveBuyer" defaultChecked style={{ width: 20, height: 20 }} /> Save to my clients</label>
        </fieldset>
      )}

      <div className="field">
        <label htmlFor="comments">Comments for the listing agent (optional)</label>
        <textarea id="comments" name="comments" className="input" maxLength={500} placeholder="e.g. Buyers are relocating from Atlanta; we may run 5 minutes late." />
        <span className="tiny muted">Your name, license or MLS ID, brokerage, phone and email are added automatically.</span>
      </div>
      <AttachDocs value={docs} onChange={setDocs} />

      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn primary lg block" disabled={pending || (!home && !typed)}>{pending ? "Sending…" : "Send request"}</button>
    </form>
  );
}
