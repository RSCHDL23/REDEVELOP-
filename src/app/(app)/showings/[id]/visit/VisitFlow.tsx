"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HomeSnapshot as Snapshot } from "@/lib/data/types";
import { HomeSnapshot } from "@/components/HomeSnapshot";
import { arrive, sendFeedback, type ActionState } from "../../actions";

type Next = {
  id: string; address: string; time: string; confirmed: boolean; home: Snapshot;
  preferred: { label: string; href: string }; others: { label: string; href: string }[];
};

const INTEREST = [
  { id: "very", label: "Very interested" },
  { id: "maybe", label: "Maybe" },
  { id: "not", label: "Not for them" },
];
const NEXT_STEP = [
  { id: "none", label: "No next step yet" },
  { id: "second_showing", label: "Wants a second showing" },
  { id: "offer", label: "Wants to write an offer" },
];

export function VisitFlow({ id, arrivedAt, feedbackSent, listingAgent, party, next }: {
  id: string;
  arrivedAt: string | null;
  feedbackSent: boolean;
  listingAgent: { name: string; onApp: boolean; textHref: string | null };
  party: { name: string; href: string }[];
  next: Next | null;
}) {
  const router = useRouter();
  const [arrived, setArrived] = useState(!!arrivedAt);
  const [busy, setBusy] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(sendFeedback, {});
  const [rating, setRating] = useState(0);
  const done = feedbackSent || !!state.ok;
  const first = listingAgent.name.split(" ")[0];

  async function onArrive() {
    setBusy(true);
    await arrive(id);
    setArrived(true);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      {/* 1. Arrive */}
      <section className="card">
        <span className="section-label">1 · Arrive</span>
        {!arrived ? (
          <button type="button" className="btn primary lg block" onClick={onArrive} disabled={busy}>
            📍 I&apos;ve arrived
          </button>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            <span className="small strong" style={{ color: "var(--green)" }}>✓ You&apos;re here. Let everyone know:</span>
            {listingAgent.onApp
              ? <span className="small">✓ {first} was notified in REschedule so they can tell the owners.</span>
              : listingAgent.textHref
                ? <a className="btn block" href={listingAgent.textHref}>Text {first} (to tell the owners)</a>
                : <span className="small muted">Add {first}&apos;s phone to text them.</span>}
            {party.map((p) => <a key={p.name} className="btn block" href={p.href}>Text {p.name}</a>)}
            {party.length === 0 && <span className="tiny muted">Save your buyer&apos;s phone in Clients to text them from here.</span>}
          </div>
        )}
      </section>

      {/* 2. Feedback */}
      {arrived && (
        <section className="card">
          <span className="section-label">2 · Feedback</span>
          {done ? (
            <span className="small strong" style={{ color: "var(--green)" }}>✓ Feedback sent to {first}.</span>
          ) : (
            <form action={action} className="stack" style={{ gap: 12 }}>
              <input type="hidden" name="id" value={id} />
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="small strong" style={{ marginBottom: 6 }}>Overall</legend>
                <div className="row" role="radiogroup" aria-label="Star rating" style={{ gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} style={{ cursor: "pointer", fontSize: 34, lineHeight: 1, color: n <= rating ? "#e1a800" : "var(--line-2)" }}>
                      <input type="radio" name="rating" value={n} className="sr-only" onChange={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} />
                      ★
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
                <legend className="small strong" style={{ marginBottom: 6 }}>Buyer interest</legend>
                <div className="chips">
                  {INTEREST.map((o) => (
                    <label key={o.id} className="chip row" style={{ cursor: "pointer" }}>
                      <input type="radio" name="interest" value={o.id} style={{ width: 18, height: 18 }} /> {o.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="field">
                <label htmlFor="nextStep">Next step</label>
                <select id="nextStep" name="nextStep" className="input" defaultValue="none">
                  {NEXT_STEP.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="comments">Comments about the home</label>
                <textarea id="comments" name="comments" className="input" maxLength={1000} placeholder="Price, condition, layout, what they loved…" />
                <span className="tiny muted">Keep it about the home. Don&apos;t share anything personal about your buyers.</span>
              </div>
              <div className="field">
                <label htmlFor="questions">Questions for {first}</label>
                <textarea id="questions" name="questions" className="input" maxLength={500} placeholder="e.g. Age of the roof? Any offers in?" />
              </div>
              {state.error && <p className="error" role="alert">{state.error}</p>}
              <button className="btn primary block" disabled={pending}>{pending ? "Sending…" : "Send feedback"}</button>
            </form>
          )}
        </section>
      )}

      {/* 3. Next showing */}
      {done && (
        <section className="card dark" aria-live="polite">
          <span className="section-label" style={{ color: "#c3cbd1" }}>3 · Next</span>
          {next ? (
            <>
              <span className="stack" style={{ gap: 2 }}>
                <span style={{ color: "#fff" }}><HomeSnapshot home={next.home} className="strong" /></span>
                <span className="small tabular" style={{ color: "#fff" }}>{next.time}{next.confirmed ? " · confirmed" : " · waiting on approval"}</span>
              </span>
              <a className="btn primary lg block" href={next.preferred.href} target="_blank" rel="noreferrer">Directions in {next.preferred.label}</a>
              <div className="grid-2">
                {next.others.map((o) => <a key={o.label} className="btn block" href={o.href} target="_blank" rel="noreferrer">{o.label}</a>)}
              </div>
              <Link href={`/showings/${next.id}/visit`} className="btn block" style={{ background: "transparent", color: "#fff", borderColor: "#59636b" }}>Open next showing</Link>
            </>
          ) : (
            <>
              <span className="strong" style={{ color: "#fff", fontSize: 18 }}>That was the last showing today 🎉</span>
              <Link href="/today" className="btn primary block">Back to Today</Link>
            </>
          )}
        </section>
      )}
    </div>
  );
}
