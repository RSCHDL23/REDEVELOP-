"use client";

import { useRef, useState } from "react";
import type { Attachment } from "@/lib/data/types";

/** Attach documents (pre-approval letter, proof of funds…) to showing requests. */
export function AttachDocs({ value, onChange, name = "attachmentIds" }: { value: Attachment[]; onChange: (v: Attachment[]) => void; name?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setBusy(true);
    const added: Attachment[] = [];
    for (const f of Array.from(files).slice(0, 5 - value.length)) {
      const body = new FormData();
      body.append("file", f);
      try {
        const res = await fetch("/api/attachments", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) { setError(json.error ?? "Upload failed."); continue; }
        added.push(json);
      } catch {
        setError("Upload failed. Check your connection.");
      }
    }
    onChange([...value, ...added]);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      <input ref={input} type="file" hidden multiple accept="application/pdf,image/jpeg,image/png,image/heic" onChange={(e) => upload(e.target.files)} aria-label="Attach documents" />
      {value.map((a) => (
        <div key={a.id} className="between small" style={{ background: "var(--ground)", borderRadius: 10, padding: "8px 10px" }}>
          <a href={a.url} target="_blank" rel="noreferrer" className="strong" style={{ color: "var(--ink)" }}>📎 {a.name}</a>
          <button type="button" className="btn danger" style={{ minHeight: 30, border: 0, background: "transparent" }} onClick={() => onChange(value.filter((x) => x.id !== a.id))} aria-label={`Remove ${a.name}`}>✕</button>
        </div>
      ))}
      {value.length < 5 && (
        <button type="button" className="btn block" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Uploading…" : "📎 Attach documents (pre-approval, proof of funds)"}
        </button>
      )}
      <input type="hidden" name={name} value={JSON.stringify(value.map((a) => a.id))} />
      {error && <span className="error" role="alert">{error}</span>}
      <span className="tiny muted">PDF or photo, up to 10 MB each. Listing agents get a private link that expires in 14 days. Pre-approval letters can include personal details, so attach only what the listing agent needs.</span>
    </div>
  );
}
