"use client";

import { useRef } from "react";
import type { HomeSnapshot as Snapshot } from "@/lib/data/types";

/** Tap an address to see the home: photo, beds, baths and square feet. */
export function HomeSnapshot({ home, className = "strong" }: { home: Snapshot; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const facts = [
    home.beds != null ? `${home.beds} bd` : null,
    home.baths != null ? `${home.baths} ba` : null,
    home.sqft ? `${home.sqft.toLocaleString()} sq ft` : null,
  ].filter(Boolean);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => dialog.current?.showModal()}
        style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", color: "inherit", textDecoration: "underline", textDecorationColor: "var(--line-2)", textUnderlineOffset: 3 }}
        aria-haspopup="dialog"
      >
        {home.address}
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}
        style={{ border: 0, borderRadius: 18, padding: 0, width: "min(400px, calc(100vw - 32px))", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
        aria-label={`About ${home.address}`}
      >
        {home.photoUrl
          ? <img src={home.photoUrl} alt={`Photo of ${home.address}`} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block" }} />
          : <div style={{ aspectRatio: "4 / 3", background: "var(--ground)", display: "flex", alignItems: "center", justifyContent: "center" }} className="muted small">No photo yet</div>}
        <div className="stack" style={{ padding: 16, gap: 6 }}>
          <span className="strong" style={{ fontSize: 18 }}>{home.address}</span>
          {home.city && <span className="small muted">{home.city}</span>}
          {facts.length > 0
            ? <div className="grid-3" style={{ marginTop: 4 }}>
                {[["Beds", home.beds], ["Baths", home.baths], ["Sq ft", home.sqft ? home.sqft.toLocaleString() : "–"]].map(([k, v]) => (
                  <div key={String(k)} className="card" style={{ padding: 10, gap: 0, alignItems: "center" }}>
                    <span className="strong tabular" style={{ fontSize: 18 }}>{v ?? "–"}</span>
                    <span className="tiny muted">{k}</span>
                  </div>
                ))}
              </div>
            : <span className="small muted">Home details aren&apos;t available for typed-in addresses.</span>}
          <button type="button" className="btn block" style={{ marginTop: 8 }} onClick={() => dialog.current?.close()}>Close</button>
        </div>
      </dialog>
    </>
  );
}
