"use client";

import type { ReactNode } from "react";

/** A simple full-screen sheet for prompts (celebrations, posts, alerts). */
export function Modal({ labelledBy, children, onClose }: { labelledBy: string; children: ReactNode; onClose?: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onKeyDown={(e) => { if (e.key === "Escape") onClose?.(); }}
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(11,13,14,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div className="card" style={{ maxWidth: 440, width: "100%", maxHeight: "92dvh", overflowY: "auto", position: "relative", gap: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
        {children}
      </div>
    </div>
  );
}
