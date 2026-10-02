"use client";

import { useActionState, useEffect, useRef } from "react";
import { addClient, type ClientState } from "./actions";
import { TipsSender } from "./TipsButton";
import { buyerDosAndDonts, sellerDosAndDonts } from "@/lib/core/clientTips";
import { greetingName } from "@/lib/core/closing";

export function AddClient({ stage, agentName, agentPhone }: { stage: string; agentName: string; agentPhone: string }) {
  const [state, action, pending] = useActionState<ClientState, FormData>(addClient, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) form.current?.reset(); }, [state]);
  return (
    <details className="card">
      <summary className="strong" style={{ cursor: "pointer", minHeight: 28 }}>+ Add a client</summary>
      <form ref={form} action={action} className="stack" style={{ marginTop: 10 }}>
        <div className="field"><label htmlFor="c-name">Name</label><input id="c-name" name="name" className="input" required maxLength={80} placeholder="e.g. Jordan & Sam Reyes" /></div>
        <div className="grid-2">
          <div className="field"><label htmlFor="c-phone">Mobile</label><input id="c-phone" name="phone" type="tel" className="input" maxLength={30} /></div>
          <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" name="email" type="email" className="input" maxLength={120} /></div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="c-intent">Looking to</label>
            <select id="c-intent" name="intent" className="input" defaultValue="Buying">
              {["Buying", "Selling", "Renting", "Investing", "Other"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="c-stage">List</label>
            <select id="c-stage" name="stage" className="input" defaultValue={stage === "all" ? "present" : stage}>
              <option value="future">Future</option>
              <option value="present">Present</option>
              <option value="past">Past</option>
            </select>
          </div>
        </div>
        <div className="field"><label htmlFor="c-notes">Notes</label><textarea id="c-notes" name="notes" className="input" maxLength={500} placeholder="e.g. 3 bed, under $650k, near the Brown Line" /></div>
        <label className="row small" style={{ cursor: "pointer" }}><input type="checkbox" name="preApproved" style={{ width: 20, height: 20 }} /> Pre-approved</label>
        {state.error && <p className="error" role="alert">{state.error}</p>}
        {state.ok && <p className="small strong" role="status" style={{ color: "var(--green)", margin: 0 }}>✓ {state.ok}</p>}
        {state.added && (
          <TipsSender
            key={state.added.name + state.ok}
            startOpen
            name={state.added.name}
            phone={state.added.phone}
            email={state.added.email}
            title={state.added.intent === "Selling" ? "Seller do's and don'ts" : "Homebuyer do's and don'ts"}
            message={(state.added.intent === "Selling" ? sellerDosAndDonts : buyerDosAndDonts)({ clientFirst: greetingName(state.added.name), agentName, agentPhone })}
          />
        )}
        <button className="btn dark block" disabled={pending}>{pending ? "Adding…" : "Add client"}</button>
      </form>
    </details>
  );
}
