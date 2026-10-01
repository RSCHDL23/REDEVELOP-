import Link from "next/link";
import type { ReactNode } from "react";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="row small" style={{ minHeight: 44, alignSelf: "flex-start", color: "var(--ink)" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      {label}
    </Link>
  );
}

export function Initials({ name, url, size = 44 }: { name: string; url?: string | null; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size / 3 }}>
      {url ? <img src={url} alt="" /> : initials || "?"}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="card muted small" style={{ textAlign: "center" }}>{children}</p>;
}
