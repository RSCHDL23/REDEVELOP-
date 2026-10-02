"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COLORS = ["#12a9ee", "#0b0d0e", "#f2d24b", "#1e6b3a", "#e85d75", "#ffffff"];

/** Closing-day confetti, then send the client their after-closing checklist. */
export function Celebration({ address, dealId, messages }: {
  address: string;
  dealId: string;
  messages: { side: "buyer" | "seller"; clientName: string; body: string; phone?: string; email?: string }[];
}) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);
  const m = messages[i];
  const close = () => router.replace(`/deals/${dealId}?tab=dates`, { scroll: false });
  const sms = m?.phone ? `sms:${m.phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(m.body)}` : null;
  const mail = m?.email ? `mailto:${m.email}?subject=${encodeURIComponent(`Congratulations! Your after-closing checklist for ${address}`)}&body=${encodeURIComponent(m.body)}` : null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="celebrate-title" style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(11,13,14,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 80 }, (_, k) => (
          <i key={k} style={{ left: `${(k * 37) % 100}%`, background: COLORS[k % COLORS.length], animationDelay: `${(k % 20) * 0.08}s`, animationDuration: `${2.4 + (k % 7) * 0.25}s`, transform: `rotate(${k * 29}deg)` }} />
        ))}
      </div>
      <div className="card" style={{ maxWidth: 440, width: "100%", maxHeight: "90dvh", overflowY: "auto", position: "relative", gap: 12, textAlign: "center", alignItems: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
        <span style={{ fontSize: 52, lineHeight: 1 }} aria-hidden="true">🎉🏡🔑</span>
        <h2 id="celebrate-title" className="page-title" style={{ fontSize: 26 }}>It&apos;s closed! Congratulations!</h2>
        <p className="small" style={{ margin: 0 }}><span className="strong">{address}</span> is officially done. Another family, another set of keys. Way to go!</p>

        {m && (
          <div className="stack" style={{ width: "100%", textAlign: "left", gap: 8 }}>
            {messages.length > 1 && (
              <div className="chips" role="group" aria-label="Which client">
                {messages.map((x, k) => (
                  <button key={x.side} type="button" className="chip" aria-pressed={k === i} onClick={() => { setI(k); setCopied(false); }}>{x.side === "buyer" ? "Buyer" : "Seller"}</button>
                ))}
              </div>
            )}
            <span className="strong">Send {m.clientName || "your client"} their after-closing checklist</span>
            <p className="small" style={{ margin: 0, whiteSpace: "pre-wrap", background: "var(--ground)", padding: 10, borderRadius: 10, maxHeight: 220, overflowY: "auto" }}>{m.body}</p>
            <div className="grid-2">
              {sms ? <a className="btn primary block" href={sms}>Text it</a> : <span />}
              {mail ? <a className="btn primary block" href={mail}>Email it</a> : <span />}
            </div>
            <button type="button" className="btn block" onClick={async () => { try { await navigator.clipboard.writeText(m.body); setCopied(true); } catch { /* clipboard blocked */ } }}>
              {copied ? "Copied ✓" : "Copy message"}
            </button>
            {!m.phone && !m.email && <span className="tiny muted">Add your client&apos;s phone or email under People to send it from here.</span>}
          </div>
        )}
        <button type="button" className="btn block" style={{ border: 0, background: "transparent" }} onClick={close}>Done</button>
      </div>
    </div>
  );
}
