"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { LengthSelect, TimeSelect } from "@/components/TimeFields";
import { acceptNewTime, cancel, nudge, recordAnswer, respond, type ActionState } from "./actions";

type Status = "pending" | "approved" | "declined" | "countered" | "cancelled";

const Hidden = ({ id, status }: { id: string; status?: string }) => (
  <>
    <input type="hidden" name="id" value={id} />
    {status && <input type="hidden" name="status" value={status} />}
  </>
);

/** Listing side: approve, suggest a new time or decline, and change the answer later. */
export function IncomingResponse({ id, status, date, start, minutes }: { id: string; status: Status; date: string; start: number; minutes: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(respond, {});
  const [open, setOpen] = useState(status === "pending");
  const [newTime, setNewTime] = useState(false);

  // Close the controls after a successful answer.
  useEffect(() => {
    if (state.ok) { setOpen(false); setNewTime(false); }
  }, [state]);

  if (status === "cancelled") return null;

  if (!open) {
    return (
      <button type="button" className="btn block" onClick={() => setOpen(true)} style={{ background: "rgba(255,255,255,0.7)" }}>
        Change response
      </button>
    );
  }

  return (
    <div className="stack">
      {!newTime && (
        <div className="grid-3">
          <form action={action}><Hidden id={id} status="approved" /><button className="btn green block" disabled={pending || status === "approved"}>Approve</button></form>
          <button type="button" className="btn yellow block" onClick={() => setNewTime(true)} disabled={pending}>New time</button>
          <form action={action}><Hidden id={id} status="declined" /><button className="btn red block" disabled={pending || status === "declined"}>Decline</button></form>
        </div>
      )}

      {newTime && (
        <form action={action} className="card" style={{ background: "#fff", gap: 12 }}>
          <Hidden id={id} status="countered" />
          <span className="strong">Suggest a new time</span>
          <div className="field">
            <label htmlFor={`d-${id}`}>Date</label>
            <input id={`d-${id}`} name="date" type="date" className="input" defaultValue={date} required />
          </div>
          <TimeSelect name="time" defaultMinutes={start + 60} idPrefix={`t-${id}`} />
          <LengthSelect id={`m-${id}`} defaultValue={minutes} />
          <div className="field">
            <label htmlFor={`n-${id}`}>Note (optional)</label>
            <input id={`n-${id}`} name="note" className="input" maxLength={280} placeholder="e.g. Sellers are home until 2:30" />
          </div>
          <div className="grid-2">
            <button type="button" className="btn block" onClick={() => setNewTime(false)}>Back</button>
            <button className="btn yellow block" disabled={pending}>{pending ? "Sending…" : "Send new time"}</button>
          </div>
        </form>
      )}

      {status !== "pending" && !newTime && (
        <button type="button" className="btn block" style={{ border: 0, background: "transparent", minHeight: 36 }} onClick={() => setOpen(false)}>Keep my answer</button>
      )}
      {state.error && <p className="error" role="alert">{state.error}</p>}
    </div>
  );
}

type Nudge = { method: string; href: string | null; label: string; body: string; subject?: string };

/** Requesting side: remind, resend, accept a new time, cancel. */
export function SentActions({ id, status, typedIn, listingId, agentFirst, remind, resend, reminded }: {
  id: string; status: Status; typedIn: boolean; listingId: string | null; agentFirst: string; remind: Nudge; resend: Nudge; reminded: string | null;
}) {
  const [panel, setPanel] = useState<"remind" | "resend" | null>(null);
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const draft = panel === "remind" ? remind : panel === "resend" ? resend : null;

  async function send() {
    if (!draft) return;
    setBusy(true);
    if (draft.href) {
      // Opens Messages, Mail or the phone app with the message filled in.
      if (draft.method === "online") window.open(draft.href, "_blank", "noopener"); else window.location.href = draft.href;
    }
    await nudge(id);
    setBusy(false);
    setDone(draft.method === "app" ? `${panel === "remind" ? "Reminder" : "Request"} sent to ${agentFirst} in REschedule.` : `Opened your ${draft.method === "email" ? "email" : draft.method === "call" ? "phone" : "messages"} app.`);
    setPanel(null);
  }

  return (
    <div className="stack">
      {status === "countered" && (
        <div className="grid-2">
          <form action={acceptNewTime}><Hidden id={id} /><button className="btn green block">Accept new time</button></form>
          <form action={cancel}><Hidden id={id} /><button className="btn block" style={{ background: "#fff" }}>Cancel showing</button></form>
        </div>
      )}

      {status === "pending" && !panel && (
        <div className="grid-2">
          <button type="button" className="btn block" style={{ background: "#fff" }} onClick={() => { setPanel("remind"); setDone(""); }}>Remind</button>
          <button type="button" className="btn block" style={{ background: "#fff" }} onClick={() => { setPanel("resend"); setDone(""); }}>Resend request</button>
        </div>
      )}

      {draft && (
        <div className="card" style={{ background: "#fff", gap: 8 }}>
          <span className="small strong">{panel === "remind" ? "Reminder" : "Request"} to {agentFirst}</span>
          {draft.subject && <span className="small strong">{draft.subject}</span>}
          <p className="small" style={{ margin: 0, whiteSpace: "pre-wrap", background: "var(--ground)", padding: 10, borderRadius: 10 }}>{draft.body}</p>
          <div className="grid-2">
            <button type="button" className="btn block" onClick={() => setPanel(null)}>Back</button>
            <button type="button" className="btn primary block" onClick={send} disabled={busy}>{draft.label}</button>
          </div>
        </div>
      )}

      {done && <p className="small strong" role="status" style={{ margin: 0, color: "var(--green)" }}>✓ {done}</p>}
      {reminded && !done && <span className="tiny muted">{reminded}</span>}

      {typedIn && status === "pending" && (
        <div className="stack" style={{ gap: 6 }}>
          <span className="tiny muted">{agentFirst} isn&apos;t on REschedule. When they answer, record it here:</span>
          <div className="grid-2">
            <form action={recordAnswer}><Hidden id={id} status="approved" /><button className="btn block" style={{ background: "#fff" }}>They confirmed</button></form>
            <form action={recordAnswer}><Hidden id={id} status="declined" /><button className="btn block" style={{ background: "#fff" }}>They declined</button></form>
          </div>
        </div>
      )}

      {(status === "pending" || status === "approved") && (
        <form action={cancel}><Hidden id={id} /><button className="btn danger block" style={{ border: 0, background: "transparent", minHeight: 36 }}>Cancel showing</button></form>
      )}

      {status === "declined" && listingId && (
        <Link href={`/showings/new?listing=${listingId}`} className="btn block" style={{ background: "#fff" }}>Request another time</Link>
      )}
    </div>
  );
}
