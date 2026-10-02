"use client";

import { useActionState, useMemo, useState } from "react";
import { parseListingUrl, SITE_NAMES } from "@/lib/core/listingLinks";
import { sendHome, type ShareState } from "./actions";

export function ShareForm({ initialUrl, agentFirst }: { initialUrl: string; agentFirst: string }) {
  const [state, action, pending] = useActionState<ShareState, FormData>(sendHome, {});
  const [url, setUrl] = useState(initialUrl);
  const link = useMemo(() => parseListingUrl(url), [url]);
  const [address, setAddress] = useState(link?.address ?? "");
  const [lastUrl, setLastUrl] = useState(initialUrl);
  if (url !== lastUrl) { setLastUrl(url); setAddress(parseListingUrl(url)?.address ?? ""); }

  if (state.ok) {
    return (
      <div className="card status-card status-approved" role="status">
        <span className="strong" style={{ fontSize: 18 }}>Sent to {agentFirst}! 🏡</span>
        <span className="small">{agentFirst} will see it in REschedule and can set up a showing.</span>
        <button type="button" className="btn block" style={{ background: "#fff" }} onClick={() => location.assign("/homes/share")}>Send another home</button>
      </div>
    );
  }
  return (
    <form action={action} className="card" style={{ gap: 12 }}>
      <div className="field">
        <label htmlFor="url">Home link</label>
        <input id="url" name="url" className="input" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value.trim())} placeholder="Paste a Zillow, Redfin or Realtor.com link" />
        {url && (link ? <span className="tiny strong" style={{ color: "var(--green)" }}>✓ {SITE_NAMES[link.site]} home</span> : <span className="tiny" style={{ color: "var(--red)" }}>Use a home link from Zillow, Redfin or Realtor.com</span>)}
      </div>
      <div className="field"><label htmlFor="address">Address</label><input id="address" name="address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} placeholder="Filled in from the link" /></div>
      <div className="field"><label htmlFor="note">Note for {agentFirst}</label><textarea id="note" name="note" className="input" maxLength={500} placeholder="e.g. Love the yard! Free Saturday after 1." /></div>
      <label className="row small" style={{ cursor: "pointer" }}><input type="checkbox" name="wantsTour" defaultChecked style={{ width: 20, height: 20 }} /> I&apos;d like to see it in person</label>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn primary lg block" disabled={pending || !link}>{pending ? "Sending…" : `Send to ${agentFirst}`}</button>
    </form>
  );
}
