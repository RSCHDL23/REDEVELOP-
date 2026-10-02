"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { addPerson, addTodo, updatePerson, updateTodo, verifyAndClose, type PersonState } from "../actions";
import { Modal } from "@/components/Modal";

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

const digits = (p: string) => p.replace(/[^\d+]/g, "");

/** One Contact button per person, with every way to reach them. */
export function ContactMenu({ name, phone, email }: { name: string; phone?: string; email?: string }) {
  if (!phone && !email) return <span className="tiny muted">No phone or email</span>;
  return (
    <details className="menu">
      <summary className="btn" style={{ minHeight: 38 }} aria-label={`Contact ${name}`}>Contact ▾</summary>
      <div className="menu-list" role="menu">
        {phone && <a role="menuitem" href={`sms:${digits(phone)}`}>💬 Text {phone}</a>}
        {phone && <a role="menuitem" href={`tel:${digits(phone)}`}>📞 Call {phone}</a>}
        {email && <a role="menuitem" href={`mailto:${email}`}>✉️ Email {email}</a>}
        {phone && <button type="button" role="menuitem" onClick={() => navigator.clipboard?.writeText(phone).catch(() => {})}>Copy phone</button>}
        {email && <button type="button" role="menuitem" onClick={() => navigator.clipboard?.writeText(email).catch(() => {})}>Copy email</button>}
      </div>
    </details>
  );
}

/** Update a person's role, name, phone or email after they've been added. */
export function EditPersonForm({ dealId, member }: { dealId: string; member: { id: string; role: string; name: string; phone?: string; email?: string } }) {
  const [state, action, pending] = useActionState<PersonState, FormData>(updatePerson, {});
  const [open, setOpen] = useState(false);
  useEffect(() => { if (state.ok) setOpen(false); }, [state]);
  const id = member.id;
  if (!open) return <button type="button" className="btn" style={{ minHeight: 38 }} onClick={() => setOpen(true)} aria-label={`Edit ${member.name}`}>Edit</button>;
  return (
    <form action={action} className="stack" style={{ gap: 8, width: "100%", background: "var(--ground)", padding: 10, borderRadius: 12 }}>
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="memberId" value={id} />
      <div className="grid-2">
        <div className="field">
          <label className="small strong" htmlFor={`er-${id}`}>Role</label>
          <select id={`er-${id}`} name="role" className="input" defaultValue={member.role}>
            {ROLE_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </div>
        <div className="field"><label className="small strong" htmlFor={`en-${id}`}>Name</label><input id={`en-${id}`} name="name" className="input" defaultValue={member.name} required maxLength={80} /></div>
        <div className="field"><label className="small strong" htmlFor={`ep-${id}`}>Phone</label><input id={`ep-${id}`} name="phone" type="tel" className="input" defaultValue={member.phone ?? ""} maxLength={30} /></div>
        <div className="field"><label className="small strong" htmlFor={`ee-${id}`}>Email</label><input id={`ee-${id}`} name="email" type="email" className="input" defaultValue={member.email ?? ""} maxLength={120} /></div>
      </div>
      {state.error && <p className="error" role="alert" style={{ margin: 0 }}>{state.error}</p>}
      <div className="grid-2">
        <button className="btn dark block" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        <button type="button" className="btn block" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

/** Change a to-do's wording, due date or who it's assigned to. */
export function EditTodoForm({ dealId, task, assignees }: { dealId: string; task: { id: string; title: string; assignee: string; due: string | null }; assignees: string[] }) {
  const [state, action, pending] = useActionState<PersonState, FormData>(updateTodo, {});
  const [open, setOpen] = useState(false);
  useEffect(() => { if (state.ok) setOpen(false); }, [state]);
  const id = task.id;
  if (!open) return <button type="button" className="btn" style={{ minHeight: 38 }} onClick={() => setOpen(true)} aria-label={`Edit ${task.title}`}>Edit</button>;
  return (
    <form action={action} className="stack" style={{ gap: 8, width: "100%", background: "var(--ground)", padding: 10, borderRadius: 12 }}>
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="taskId" value={id} />
      <div className="field"><label className="small strong" htmlFor={`tt-${id}`}>To-do</label><input id={`tt-${id}`} name="title" className="input" defaultValue={task.title} required maxLength={200} /></div>
      <div className="grid-2">
        <div className="field">
          <label className="small strong" htmlFor={`tw-${id}`}>Assigned to</label>
          <input id={`tw-${id}`} name="assignee" className="input" list={`tw-list-${id}`} defaultValue={task.assignee} maxLength={60} />
          <datalist id={`tw-list-${id}`}>{assignees.map((a) => <option key={a} value={a} />)}</datalist>
        </div>
        <div className="field"><label className="small strong" htmlFor={`td-${id}`}>Due</label><input id={`td-${id}`} name="due" type="date" className="input" defaultValue={task.due ?? ""} /></div>
      </div>
      {state.error && <p className="error" role="alert" style={{ margin: 0 }}>{state.error}</p>}
      <div className="grid-2">
        <button className="btn dark block" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        <button type="button" className="btn block" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

/** Checking off Closing with earlier dates still open: confirm each one first. */
export function VerifyClosing({ dealId, open, missing }: { dealId: string; open: { id: string; label: string; due: string }[]; missing: boolean }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const all = checked.size === open.length;
  return (
    <Modal labelledBy="verify-h">
      <h2 id="verify-h" style={{ margin: 0, fontSize: 20 }}>Before you close</h2>
      <p className="small" style={{ margin: 0 }}>{open.length === 1 ? "This date isn't" : `These ${open.length} dates aren't`} checked off yet. Confirm each one is done (or waived), then close the deal.</p>
      <form action={verifyAndClose} className="stack" style={{ gap: 8 }}>
        <input type="hidden" name="dealId" value={dealId} />
        <ul className="list">
          {open.map((m) => (
            <li key={m.id}>
              <label className="row" style={{ cursor: "pointer" }}>
                <input type="checkbox" name="verified" value={m.id} checked={checked.has(m.id)} style={{ width: 22, height: 22 }}
                  onChange={(e) => setChecked((c) => { const n = new Set(c); if (e.target.checked) n.add(m.id); else n.delete(m.id); return n; })} />
                <span className="stack" style={{ gap: 0, flex: 1 }}>
                  <span className="strong small">{m.label}</span>
                  <span className="tiny muted">Due {m.due}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {missing && !all && <p className="error small" role="alert" style={{ margin: 0 }}>Check off every date to close the deal.</p>}
        <button type="button" className="btn" onClick={() => setChecked(new Set(open.map((m) => m.id)))}>All of these are done</button>
        <button className="btn primary lg block" disabled={!all}>{all ? "Check them off and close 🎉" : `Confirm ${open.length - checked.size} more`}</button>
        <Link href={`/deals/${dealId}?tab=dates`} className="btn block" replace>Go back to the dates</Link>
      </form>
    </Modal>
  );
}
