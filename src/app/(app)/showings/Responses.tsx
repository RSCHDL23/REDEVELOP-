"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LengthSelect, TimeSelect } from "@/components/TimeFields";
import { acceptNewTime, cancel, editRequest, nudge, recordAnswer, respond, type ActionState } from "./actions";

type Status = "pending" | "approved" | "declined" | "countered" | "cancelled";
type Slot = { date: string; start: number; minutes: number };

const Hidden = ({ id, status }: { id: string; status?: string }) => (
  <>
    <input type="hidden" name="id" value={id} />
    {status && <input type="hidden" name="status" value={status} />}
  </>
);

/** Date, 5-minute start time and length, shared by every "pick a time" form. */
function SlotFields({ id, slot }: { id: string; slot: Slot }) {
  return (
    <>
      <div className="field">
        <label htmlFor={`d-${id}`}>Date</label>
        <input id={`d-${id}`} name="date" type="date" className="input" defaultValue={slot.date} required />
      </div>
      <TimeSelect name="time" defaultMinutes={slot.start} idPrefix={`t-${id}`} />
      <LengthSelect id={`m-${id}`} defaultValue={slot.minutes} />
    </>
  );
}

/** Listing side: approve, suggest a new time or decline; edit the suggestion or change the answer later. */
export function IncomingResponse({ id, status, request, proposal, note }: {
  id: string; status: Status; request: Slot; proposal: Slot | null; note: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(respond, {});
  const [open, setOpen] = useState(status === "pending");
  const [newTime, setNewTime] = useState(false);

  useEffect(() => {
    if (state.ok) { setOpen(false); setNewTime(false); }
  }, [state]);

  if (status === "cancelled") return null;

  const timeForm = (
    <form action={action} className="card" style={{ background: "#fff", gap: 12 }}>
      <Hidden id={id} status="countered" />
      <span className="strong">{proposal ? "Edit the new time" : "Suggest a new time"}</span>
      <SlotFields id={id} slot={proposal ?? { ...request, start: request.start + 60 }} />
      <div className="field">
        <label htmlFor={`n-${id}`}>Note (optional)</label>
        <input id={`n-${id}`} name="note" className="input" maxLength={280} defaultValue={note} placeholder="e.g. Sellers are home until 2:30" />
      </div>
      <div className="grid-2">
        <button type="button" className="btn block" onClick={() => { setNewTime(false); if (status !== "pending") setOpen(false); }}>Back</button>
        <button className="btn yellow block" disabled={pending}>{pending ? "Sending…" : proposal ? "Send changes" : "Send new time"}</button>
      </div>
    </form>
  );

  if (newTime) return <div className="stack">{timeForm}{state.error && <p className="error" role="alert">{state.error}</p>}</div>;

  if (!open) {
    return (
      <div className={status === "countered" ? "grid-2" : "stack"}>
        {status === "countered" && (
          <button type="button" className="btn yellow block" onClick={() => setNewTime(true)}>Edit new time</button>
        )}
        <button type="button" className="btn block" onClick={() => setOpen(true)} style={{ background: "rgba(255,255,255,0.7)" }}>
          Change response
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="grid-3">
        <form action={action}><Hidden id={id} status="approved" /><button className="btn green block" disabled={pending || status === "approved"}>Approve</button></form>
        <button type="button" className="btn yellow block" onClick={() => setNewTime(true)} disabled={pending}>New time</button>
        <form action={action}><Hidden id={id} status="declined" /><button className="btn red block" disabled={pending || status === "declined"}>Deny</button></form>
      </div>
      {status !== "pending" && (
        <button type="button" className="btn block" style={{ border: 0, background: "transparent", minHeight: 36 }} onClick={() => setOpen(false)}>Keep my answer</button>
      )}
      {state.error && <p className="error" role="alert">{state.error}</p>}
    </div>
  );
}

type Nudge = { method: string; href: string | null; label: string; body: string; subject?: string };
type Contact = { name: string; phone: string; email: string };

const digits = (p: string) => p.replace(/[^\d+]/g, "");

/** Requesting side: edit, resend, accept a new time, cancel, and contact the listing agent. */
export function SentActions({ id, status, typedIn, listingId, agent, resend, reminded, slot, comments }: {
  id: string; status: Status; typedIn: boolean; listingId: string | null; agent: Contact; resend: Nudge; reminded: string | null; slot: Slot; comments: string;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<"resend" | "edit" | null>(null);
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const [editState, editAction, saving] = useActionState<ActionState, FormData>(editRequest, {});
  const first = agent.name.split(" ")[0] || "the listing agent";

  useEffect(() => {
    if (editState.ok) {
      setDone(editState.ok);
      // Not on REschedule? Offer to send the new time right away.
      setPanel(resend.method === "app" ? null : "resend");
      router.refresh();
    }
  }, [editState, resend.method, router]);

  async function send() {
    setBusy(true);
    if (resend.href) {
      if (resend.method === "online") window.open(resend.href, "_blank", "noopener"); else window.location.href = resend.href;
    }
    await nudge(id);
    setBusy(false);
    setDone(resend.method === "app" ? `Request sent to ${first} in REschedule.` : `Opened your ${resend.method === "email" ? "email" : resend.method === "call" ? "phone" : "messages"} app.`);
    setPanel(null);
  }

  if (status === "cancelled") return null;

  const contact = (
    <div className="row small" style={{ flexWrap: "wrap", gap: 6 }}>
      <span className="muted">Contact {first}:</span>
      {agent.phone && <a className="chip row" style={{ color: "var(--ink)" }} href={`sms:${digits(agent.phone)}`}>Text</a>}
      {agent.phone && <a className="chip row" style={{ color: "var(--ink)" }} href={`tel:${digits(agent.phone)}`}>Call</a>}
      {agent.email && <a className="chip row" style={{ color: "var(--ink)" }} href={`mailto:${agent.email}`}>Email</a>}
      {!agent.phone && !agent.email && <span className="muted">no phone or email on file</span>}
    </div>
  );

  if (panel === "edit") {
    return (
      <form action={editAction} className="card" style={{ background: "#fff", gap: 12 }}>
        <input type="hidden" name="id" value={id} />
        <span className="strong">Edit request</span>
        <SlotFields id={`e-${id}`} slot={slot} />
        <div className="field">
          <label htmlFor={`c-${id}`}>Comments</label>
          <textarea id={`c-${id}`} name="comments" className="input" maxLength={500} defaultValue={comments} />
        </div>
        <span className="tiny muted">A new date or time goes back to {first} as Pending.</span>
        {editState.error && <p className="error" role="alert">{editState.error}</p>}
        <div className="grid-2">
          <button type="button" className="btn block" onClick={() => setPanel(null)}>Back</button>
          <button className="btn primary block" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    );
  }

  const editBtn = <button type="button" className="btn block" style={{ background: "#fff" }} onClick={() => { setPanel("edit"); setDone(""); }}>Edit</button>;
  const cancelBtn = <form action={cancel}><Hidden id={id} /><button className="btn block" style={{ background: "#fff", color: "var(--red)" }}>Cancel showing</button></form>;

  return (
    <div className="stack">
      {status === "pending" && !panel && (
        <div className="grid-2">
          {editBtn}
          <button type="button" className="btn block" style={{ background: "#fff" }} onClick={() => { setPanel("resend"); setDone(""); }}>Resend request</button>
        </div>
      )}
      {status === "approved" && <div className="grid-2">{editBtn}{cancelBtn}</div>}
      {status === "countered" && (
        <>
          <div className="grid-2">
            <form action={acceptNewTime}><Hidden id={id} /><button className="btn green block">Accept new time</button></form>
            {cancelBtn}
          </div>
          <button type="button" className="btn block" style={{ background: "#fff" }} onClick={() => { setPanel("edit"); setDone(""); }}>Edit: ask for a different time</button>
        </>
      )}

      {panel === "resend" && (
        <div className="card" style={{ background: "#fff", gap: 8 }}>
          <span className="small strong">Request to {first}</span>
          {resend.subject && <span className="small strong">{resend.subject}</span>}
          <p className="small" style={{ margin: 0, whiteSpace: "pre-wrap", background: "var(--ground)", padding: 10, borderRadius: 10 }}>{resend.body}</p>
          <div className="grid-2">
            <button type="button" className="btn block" onClick={() => setPanel(null)}>Back</button>
            <button type="button" className="btn primary block" onClick={send} disabled={busy}>{resend.label}</button>
          </div>
        </div>
      )}

      {done && <p className="small strong" role="status" style={{ margin: 0, color: "var(--green)" }}>✓ {done}</p>}
      {reminded && !done && <span className="tiny muted">{reminded}</span>}

      {typedIn && status === "pending" && (
        <div className="stack" style={{ gap: 6 }}>
          <span className="tiny muted">{first} isn&apos;t on REschedule. When they answer, record it here:</span>
          <div className="grid-2">
            <form action={recordAnswer}><Hidden id={id} status="approved" /><button className="btn block" style={{ background: "#fff" }}>They confirmed</button></form>
            <form action={recordAnswer}><Hidden id={id} status="declined" /><button className="btn block" style={{ background: "#fff" }}>They denied</button></form>
          </div>
        </div>
      )}

      {status === "pending" && (
        <form action={cancel}><Hidden id={id} /><button className="btn danger block" style={{ border: 0, background: "transparent", minHeight: 36 }}>Cancel showing</button></form>
      )}

      {status === "declined" && listingId && (
        <Link href={`/showings/new?listing=${listingId}`} className="btn block" style={{ background: "#fff" }}>Request another time</Link>
      )}

      {contact}
    </div>
  );
}
