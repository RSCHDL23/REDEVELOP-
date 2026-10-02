"use client";

import { useActionState, useEffect, useRef } from "react";
import { addClient, type ClientState } from "./actions";
import { TipsSender } from "./TipsButton";
import { AgreementSender } from "./AgreementSender";
import { agreementFor, agreementHeadsUp } from "@/lib/core/agreements";
import { buyerDosAndDonts, sellerDosAndDonts } from "@/lib/core/clientTips";
import { greetingName } from "@/lib/core/closing";
import { nacaIntroMessage } from "@/lib/core/naca";
import { askForFinancingMessage } from "@/lib/core/financing";
import { simpleDrafts } from "@/lib/core/messages";
import { SendPanel } from "@/components/SendPanel";

export function AddClient({ stage, agentName, agentPhone, esign }: { stage: string; agentName: string; agentPhone: string; esign: { provider: string | null; url: string } }) {
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
        <div className="field">
          <label htmlFor="c-loan">Loan</label>
          <select id="c-loan" name="loanProgram" className="input" defaultValue="unknown">
            {[["unknown", "Not sure yet"], ["conventional", "Conventional"], ["fha", "FHA"], ["va", "VA"], ["usda", "USDA"], ["naca", "NACA"], ["cash", "Cash"], ["other", "Other"]].map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="c-notes">Notes</label><textarea id="c-notes" name="notes" className="input" maxLength={500} placeholder="e.g. 3 bed, under $650k, near the Brown Line" /></div>
        <label className="row small" style={{ cursor: "pointer" }}><input type="checkbox" name="preApproved" style={{ width: 20, height: 20 }} /> Pre-approved</label>
        {state.error && <p className="error" role="alert">{state.error}</p>}
        {state.ok && <p className="small strong" role="status" style={{ color: "var(--green)", margin: 0 }}>✓ {state.ok}</p>}
        {state.added && (
          <AgreementSender
            key={`a-${state.added.id}`}
            startOpen
            clientId={state.added.id} name={state.added.name} phone={state.added.phone} email={state.added.email} sentAt={null}
            agreement={agreementFor(state.added.intent)} buyer={state.added.intent === "Buying" || state.added.intent === "Investing"}
            provider={esign.provider} providerUrl={esign.url}
            headsUp={agreementHeadsUp({ clientFirst: greetingName(state.added.name), agreement: agreementFor(state.added.intent), provider: esign.provider ?? "e-signature", agentName, agentPhone })}
          />
        )}
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
        {state.added && state.added.intent === "Renting" && (
          <SendPanel
            key={`n-${state.added.id}`} startOpen tone="green"
            label="Introduce NACA" title={`Introduce ${greetingName(state.added.name)} to NACA?`}
            drafts={simpleDrafts(state.added, nacaIntroMessage({ clientFirst: greetingName(state.added.name), agentName, agentPhone }), "A way to buy with no down payment: NACA")}
          />
        )}
        {state.added && (state.added.intent === "Buying" || state.added.intent === "Investing") && !state.added.preApproved && state.added.loanProgram !== "cash" && (
          <SendPanel
            key={`f-${state.added.id}`} startOpen
            label="Ask for pre-approval" title={`Ask ${greetingName(state.added.name)} for their pre-approval?`}
            drafts={simpleDrafts(state.added, askForFinancingMessage({ clientFirst: greetingName(state.added.name), agentName, agentPhone }), "Your pre-approval letter")}
          />
        )}
        <button className="btn dark block" disabled={pending}>{pending ? "Adding…" : "Add client"}</button>
      </form>
    </details>
  );
}
