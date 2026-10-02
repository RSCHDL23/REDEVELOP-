"use client";

import { useState } from "react";
import { deviceLink, type Draft } from "@/lib/core/messages";

const NAME: Record<string, string> = { app: "In app", text: "Text", email: "Email", call: "Call", online: "Their scheduler" };

/**
 * Every way to reach someone: pick text, email, call or their online scheduler,
 * edit the message, copy it, then send from your own phone or email.
 * Nothing goes out until you tap Send.
 */
export function MultiSend({ drafts, preferred = [], onSent, sendLabel }: { drafts: Draft[]; preferred?: string[]; onSent?: (method: string) => void; sendLabel?: string }) {
  const first = drafts.find((d) => preferred.includes(d.method)) ?? drafts[0];
  const [method, setMethod] = useState(first?.method);
  const [edits, setEdits] = useState<Record<string, { body: string; subject?: string }>>({});
  const [copied, setCopied] = useState(false);
  if (!drafts.length) return <span className="small muted">No phone or email on file for them.</span>;
  const base = drafts.find((d) => d.method === method) ?? drafts[0];
  const d: Draft = { ...base, ...(edits[base.method] ?? {}) };
  const link = deviceLink(d);
  const editable = d.method !== "online" && d.method !== "app";
  const set = (patch: { body?: string; subject?: string }) => setEdits((e) => ({ ...e, [d.method]: { body: patch.body ?? d.body, subject: patch.subject ?? d.subject } }));

  async function copy() {
    try { await navigator.clipboard.writeText(d.subject ? `${d.subject}\n\n${d.body}` : d.body); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* blocked */ }
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      {drafts.length > 1 && (
        <div className="chips" role="group" aria-label="How to send">
          {drafts.map((x) => (
            <button key={x.method} type="button" className="chip" aria-pressed={x.method === d.method} onClick={() => { setMethod(x.method); setCopied(false); }}>
              {NAME[x.method] ?? x.method}{preferred.includes(x.method) ? " ★" : ""}
            </button>
          ))}
        </div>
      )}
      <span className="tiny muted">To: {d.to}</span>
      {d.subject !== undefined && editable && <input className="input small" aria-label="Subject" value={d.subject} onChange={(e) => set({ subject: e.target.value })} />}
      {editable
        ? <textarea className="input small" aria-label="Message" rows={6} value={d.body} onChange={(e) => set({ body: e.target.value })} />
        : <p className="small" style={{ margin: 0, background: "var(--ground)", padding: 10, borderRadius: 10 }}>{d.body}</p>}
      <div className="grid-2">
        {link
          ? <a className="btn primary block" href={link} target={d.method === "online" ? "_blank" : undefined} rel="noreferrer" onClick={() => onSent?.(d.method)}>{sendLabel && d.method !== "call" && d.method !== "online" ? sendLabel : d.actionLabel}</a>
          : <button type="button" className="btn primary block" onClick={() => onSent?.(d.method)}>{d.actionLabel}</button>}
        <button type="button" className="btn block" onClick={copy}>{copied ? "Copied ✓" : "Copy message"}</button>
      </div>
      {d.method === "call" && <span className="tiny muted">Use this as your call script. After the call, switch to Text to send a recap.</span>}
    </div>
  );
}
