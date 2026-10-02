"use client";

import { useState } from "react";
import type { Draft } from "@/lib/core/messages";
import { MultiSend } from "./MultiSend";

/** A button that opens a ready-to-edit message (text, email or call). Nothing sends until you tap Send. */
export function SendPanel({ label, title, drafts, startOpen = false, tone }: { label: string; title: string; drafts: Draft[]; startOpen?: boolean; tone?: "green" }) {
  const [open, setOpen] = useState(startOpen);
  if (!open) return <button type="button" className="btn" onClick={() => setOpen(true)}>{label}</button>;
  return (
    <div className="card" style={{ width: "100%", gap: 8, background: tone === "green" ? "#eef7f2" : "var(--blue-soft)", borderColor: tone === "green" ? "#b9dcc8" : "var(--wait-line)" }}>
      <div className="between">
        <span className="strong small">{title}</span>
        <button type="button" className="chip" onClick={() => setOpen(false)} aria-label="Close">Close</button>
      </div>
      <MultiSend drafts={drafts} />
    </div>
  );
}
