"use client";

import { useState } from "react";

/** Sends a client the buyer or seller do's and don'ts template by text or email. */
export function TipsSender({ name, phone, email, message, title, startOpen = false }: { name: string; phone: string; email: string; message: string; title: string; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [body, setBody] = useState(message);
  const sms = phone ? `sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(body)}` : null;
  const mail = email ? `mailto:${email}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}` : null;
  if (!open) return <button type="button" className="btn" onClick={() => setOpen(true)}>Do&apos;s &amp; don&apos;ts</button>;
  return (
    <div className="card" style={{ width: "100%", gap: 8, background: "var(--blue-soft)", borderColor: "var(--wait-line)" }}>
      <span className="strong small">Send {name.split(" ")[0]} the {title.toLowerCase()}?</span>
      <textarea className="input small" rows={8} value={body} onChange={(e) => setBody(e.target.value)} aria-label="Message" />
      <div className="grid-3">
        {sms ? <a className="btn primary block" href={sms}>Text</a> : <span />}
        {mail ? <a className="btn primary block" href={mail}>Email</a> : <span />}
        <button type="button" className="btn block" onClick={() => setOpen(false)}>Not now</button>
      </div>
      {!sms && !mail && <span className="tiny muted">Add their phone or email to send it.</span>}
    </div>
  );
}
