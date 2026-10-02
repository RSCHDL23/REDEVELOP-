"use client";

import { useActionState, useEffect, useRef } from "react";
import { addPerson, addTodo, type PersonState } from "../actions";

const ROLE_OPTIONS: [string, string][] = [
  ["buyer", "Buyer"], ["seller", "Seller"], ["buyers_agent", "Buyer's agent"], ["listing_agent", "Listing agent"],
  ["lender", "Lender / loan officer"], ["attorney", "Attorney"], ["transaction_coordinator", "Transaction coordinator"],
  ["inspector", "Inspector"], ["appraiser", "Appraiser"], ["title", "Title / escrow"], ["insurance", "Insurance agent"],
  ["contractor", "Contractor"], ["surveyor", "Surveyor"], ["property_manager", "Property manager"], ["photographer", "Photographer"],
];

function useResetOnOk(state: PersonState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return ref;
}

export function AddPersonForm({ dealId }: { dealId: string }) {
  const [state, action, pending] = useActionState<PersonState, FormData>(addPerson, {});
  const ref = useResetOnOk(state);
  return (
    <details className="card">
      <summary className="strong" style={{ cursor: "pointer", minHeight: 28 }}>+ Add a person</summary>
      <form ref={ref} action={action} className="stack" style={{ marginTop: 10 }}>
        <input type="hidden" name="dealId" value={dealId} />
        <div className="field">
          <label htmlFor="p-role">Role</label>
          <select id="p-role" name="role" className="input" defaultValue="attorney">
            {ROLE_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="p-name">Name</label><input id="p-name" name="name" className="input" required maxLength={80} placeholder="Name and company, e.g. Rachel Kim, Kim Law" /></div>
        <div className="grid-2">
          <div className="field"><label htmlFor="p-phone">Phone</label><input id="p-phone" name="phone" type="tel" className="input" maxLength={30} /></div>
          <div className="field"><label htmlFor="p-email">Email</label><input id="p-email" name="email" type="email" className="input" maxLength={120} /></div>
        </div>
        {state.error && <p className="error" role="alert">{state.error}</p>}
        {state.ok && <p className="small strong" style={{ color: "var(--green)", margin: 0 }} role="status">✓ {state.ok}</p>}
        <button className="btn dark block" disabled={pending}>{pending ? "Adding…" : "Add person"}</button>
      </form>
    </details>
  );
}

export function AddTodoForm({ dealId, assignees }: { dealId: string; assignees: string[] }) {
  const [state, action, pending] = useActionState<PersonState, FormData>(addTodo, {});
  const ref = useResetOnOk(state);
  return (
    <details className="card">
      <summary className="strong" style={{ cursor: "pointer", minHeight: 28 }}>+ Add a to-do</summary>
      <form ref={ref} action={action} className="stack" style={{ marginTop: 10 }}>
        <input type="hidden" name="dealId" value={dealId} />
        <div className="field"><label htmlFor="t-title">To-do</label><input id="t-title" name="title" className="input" required maxLength={200} placeholder="e.g. Send water certification to buyer's attorney" /></div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="t-who">Who</label>
            <input id="t-who" name="assignee" className="input" list="t-who-list" defaultValue="You" maxLength={60} />
            <datalist id="t-who-list">{assignees.map((a) => <option key={a} value={a} />)}</datalist>
          </div>
          <div className="field"><label htmlFor="t-due">Due</label><input id="t-due" name="due" type="date" className="input" /></div>
        </div>
        {state.error && <p className="error" role="alert">{state.error}</p>}
        <button className="btn dark block" disabled={pending}>{pending ? "Adding…" : "Add to-do"}</button>
      </form>
    </details>
  );
}
