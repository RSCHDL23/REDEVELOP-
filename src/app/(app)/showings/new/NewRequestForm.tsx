"use client";

import { useActionState, useState } from "react";
import { createRequest, type NewRequestState } from "../actions";

type Option = { id: string; label: string; agent: string; preferred: string; minutes: number; instant: boolean };

const METHOD_LABEL: Record<string, string> = {
  app: "REschedule inbox", text: "Text", email: "Email", call: "Phone call", online: "Their online scheduler",
};

export function NewRequestForm({ listings, defaultListing, defaultDate }: { listings: Option[]; defaultListing?: string; defaultDate: string }) {
  const [state, action, pending] = useActionState<NewRequestState, FormData>(createRequest, {});
  const [id, setId] = useState(defaultListing && listings.some((l) => l.id === defaultListing) ? defaultListing : listings[0]?.id ?? "");
  const chosen = listings.find((l) => l.id === id);

  return (
    <form action={action} className="stack" style={{ gap: 14 }}>
      <div className="field">
        <label htmlFor="listingId">Home</label>
        <select id="listingId" name="listingId" className="input" value={id} onChange={(e) => setId(e.target.value)}>
          {listings.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </div>

      {chosen && (
        <div className="card small" style={{ gap: 4 }}>
          <span><span className="strong">{chosen.agent}</span> prefers <span className="strong">{METHOD_LABEL[chosen.preferred] ?? chosen.preferred}</span>.</span>
          {chosen.instant && <span className="pill blue" style={{ alignSelf: "flex-start" }}>Instant approval</span>}
        </div>
      )}

      <div className="grid-2">
        <div className="field">
          <label htmlFor="date">Date</label>
          <input id="date" name="date" type="date" className="input" defaultValue={defaultDate} required />
        </div>
        <div className="field">
          <label htmlFor="time">Start time</label>
          <input id="time" name="time" type="time" className="input" defaultValue="13:00" step={300} required />
        </div>
      </div>

      <div className="field">
        <label htmlFor="minutes">Length</label>
        <select id="minutes" name="minutes" className="input" defaultValue={String(chosen?.minutes ?? 30)} key={chosen?.id}>
          {[15, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="buyerLabel">Buyer</label>
        <input id="buyerLabel" name="buyerLabel" className="input" placeholder="e.g. Maria & Luis Alvarez" maxLength={80} required />
      </div>

      <input type="hidden" name="method" value={chosen?.preferred ?? "app"} />
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn primary lg block" disabled={pending || !chosen}>{pending ? "Sending…" : "Send request"}</button>
    </form>
  );
}
