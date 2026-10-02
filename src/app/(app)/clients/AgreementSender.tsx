"use client";

import { useState } from "react";
import Link from "next/link";
import { markAgreementSent } from "./actions";

/** Prompt to send a new client their agreement through the agent's e-signature software. */
export function AgreementSender({ clientId, name, phone, email, agreement, provider, providerUrl, headsUp, buyer, startOpen = false, sentAt }: {
  clientId: string; name: string; phone: string; email: string; agreement: string; provider: string | null; providerUrl: string;
  headsUp: string; buyer: boolean; startOpen?: boolean; sentAt: string | null;
}) {
  const [open, setOpen] = useState(startOpen);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(!!sentAt);
  const first = name.split(" ")[0];
  if (sent && !open) return <span className="pill blue" style={{ alignSelf: "center" }}>✓ Agreement sent</span>;
  if (!open) return <button type="button" className="btn" onClick={() => setOpen(true)}>Send agreement</button>;
  const info = [name, email, phone].filter(Boolean).join("\n");
  return (
    <div className="card" style={{ width: "100%", gap: 8, background: "#f4f0fb", borderColor: "#d6c8ef" }}>
      <span className="strong small">Send {first} their {agreement}?</span>
      {buyer && <span className="tiny muted">Agents in an MLS need a signed written agreement with a buyer before touring homes (NAR practice change, Aug. 2024).</span>}
      {provider ? (
        <>
          <div className="grid-2">
            {providerUrl ? <a className="btn primary block" href={providerUrl} target="_blank" rel="noreferrer">Open {provider}</a> : <Link className="btn primary block" href="/profile#esign">Add {provider} link</Link>}
            <button type="button" className="btn block" onClick={async () => { try { await navigator.clipboard.writeText(info); setCopied(true); } catch { /* blocked */ } }}>{copied ? "Copied ✓" : "Copy client info"}</button>
          </div>
          {phone && <a className="btn block" href={`sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(headsUp)}`}>Text {first} a heads-up</a>}
          <div className="grid-2">
            <button type="button" className="btn dark block" onClick={async () => { await markAgreementSent(clientId); setSent(true); setOpen(false); }}>I sent it ✓</button>
            <button type="button" className="btn block" onClick={() => setOpen(false)}>Not now</button>
          </div>
        </>
      ) : (
        <>
          <span className="small">Choose your e-signature software once (DocuSign, dotloop, SkySlope, Authentisign…) and this button opens it for you.</span>
          <Link className="btn primary block" href="/profile#esign">Set up e-signature</Link>
        </>
      )}
    </div>
  );
}
