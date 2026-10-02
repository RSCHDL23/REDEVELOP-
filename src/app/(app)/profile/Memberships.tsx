"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addMembership, type FormState } from "./actions";

// Well-known names to pick from; type any other.
const SUGGESTIONS = {
  association: [
    ["National Association of REALTORS®", "https://www.nar.realtor"],
    ["Illinois REALTORS®", "https://www.illinoisrealtors.org"],
    ["Chicago Association of REALTORS®", "https://chicagorealtor.com"],
    ["Indiana REALTORS®", ""],
    ["Mainstreet Organization of REALTORS®", ""],
  ],
  mls: [
    ["MRED (Midwest Real Estate Data)", ""],
  ],
} as const;

export function AddMembershipForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addMembership, {});
  const [kind, setKind] = useState<"association" | "mls">("association");
  const [url, setUrl] = useState("");
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) { form.current?.reset(); setUrl(""); } }, [state]);
  return (
    <details className="card">
      <summary className="strong" style={{ cursor: "pointer", minHeight: 28 }}>+ Add an association or MLS</summary>
      <form ref={form} action={action} className="stack" style={{ marginTop: 10 }}>
        <div className="chips" role="group" aria-label="Type">
          {(["association", "mls"] as const).map((k) => <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{k === "mls" ? "MLS" : "Association / board"}</button>)}
        </div>
        <input type="hidden" name="kind" value={kind} />
        <div className="field">
          <label htmlFor="m-name">Name</label>
          <input id="m-name" name="name" className="input" list="m-names" required maxLength={100} onChange={(e) => {
            const hit = SUGGESTIONS[kind].find(([n]) => n === e.target.value);
            if (hit?.[1]) setUrl(hit[1]);
          }} />
          <datalist id="m-names">{SUGGESTIONS[kind].map(([n]) => <option key={n} value={n} />)}</datalist>
        </div>
        <div className="grid-2">
          <div className="field"><label htmlFor="m-id">Member ID</label><input id="m-id" name="memberId" className="input" maxLength={40} /></div>
          <div className="field"><label htmlFor="m-url">Website</label><input id="m-url" name="url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" maxLength={300} /></div>
        </div>
        {state.error && <p className="error" role="alert">{state.error}</p>}
        <button className="btn dark block" disabled={pending}>{pending ? "Adding…" : "Add"}</button>
      </form>
    </details>
  );
}
