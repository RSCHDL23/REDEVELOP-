"use client";

import { useState } from "react";

/** Your personal link and QR code: clients scan it to connect with you. */
export function LinkShare({ url, qrSvg, name }: { url: string; qrSvg: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const qrDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`;
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: `${name} · REschedule`, text: `Connect with ${name}`, url }); } catch { /* cancelled */ }
    } else {
      await copy();
    }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ }
  }
  return (
    <div className="card" style={{ alignItems: "center", gap: 10 }}>
      <img src={qrDataUrl} alt={`QR code for ${url}`} width={196} height={196} style={{ background: "#fff", padding: 8, borderRadius: 12, border: "1px solid var(--line)" }} />
      <span className="small strong tabular" style={{ wordBreak: "break-all", textAlign: "center" }}>{url}</span>
      <div className="grid-3" style={{ width: "100%" }}>
        <button type="button" className="btn primary block" onClick={share}>Share</button>
        <button type="button" className="btn block" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
        <a className="btn block" href={qrDataUrl} download={`${name.replace(/\s+/g, "-").toLowerCase()}-qr.svg`}>Save QR</a>
      </div>
      <span className="tiny muted" style={{ textAlign: "center" }}>Put it on your business card, open house sign-in sheet or email signature. When clients fill it out, they land in Clients → Future.</span>
      <a className="small" href={url} target="_blank" rel="noreferrer">Preview my public page ↗</a>
    </div>
  );
}
