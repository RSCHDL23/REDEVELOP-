"use client";

import { useActionState, useState } from "react";
import { leaveReview, type ReviewState } from "./actions";

export function ReviewForm({ token, agentFirst, clientFirst, sites }: { token: string; agentFirst: string; clientFirst: string; sites: { label: string; url: string }[] }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(leaveReview, {});
  const [stars, setStars] = useState(0);
  if (state.ok) {
    return (
      <div className="card status-card status-approved" role="status">
        <span className="strong" style={{ fontSize: 18 }}>Thank you, {clientFirst}! 💙</span>
        <span className="small">Your review is on {agentFirst}&apos;s profile.</span>
        {sites.length > 0 && (
          <>
            <span className="small">Would you share it on one of these too?</span>
            <div className="stack" style={{ gap: 6 }}>
              {sites.map((s) => <a key={s.url} className="btn block" style={{ background: "#fff" }} href={s.url} target="_blank" rel="noopener noreferrer">{s.label} ↗</a>)}
            </div>
          </>
        )}
      </div>
    );
  }
  return (
    <form action={action} className="card" style={{ gap: 12 }}>
      <input type="hidden" name="token" value={token} />
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="strong" style={{ marginBottom: 6 }}>How did {agentFirst} do?</legend>
        <div className="row" role="radiogroup" aria-label="Star rating" style={{ gap: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} style={{ cursor: "pointer", fontSize: 40, lineHeight: 1, color: n <= stars ? "#e1a800" : "var(--line-2)" }}>
              <input type="radio" name="stars" value={n} className="sr-only" onChange={() => setStars(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} />★
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field"><label htmlFor="body">Your review</label><textarea id="body" name="body" className="input" maxLength={1500} rows={5} placeholder={`What was it like working with ${agentFirst}?`} /></div>
      <div className="field"><label htmlFor="name">Name to show</label><input id="name" name="name" className="input" maxLength={60} defaultValue={clientFirst} /></div>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn primary lg block" disabled={pending}>{pending ? "Sending…" : "Post review"}</button>
    </form>
  );
}
