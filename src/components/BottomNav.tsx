"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/today", label: "Today", icon: <><rect x="3" y="4.5" width="18" height="16.5" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></> },
  { href: "/showings", label: "Showings", icon: <><path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" /><path d="M3 21h18" /><circle cx="14.5" cy="12" r="1" /></> },
  { href: "/tour", label: "Tour", icon: <path d="M13 2 4 14h7l-1 8 9-12h-7z" /> },
  { href: "/clients", label: "Clients", icon: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></> },
  { href: "/deals", label: "Deals", icon: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /> },
  { href: "/resources", label: "REsource", icon: <><path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M8 7h7M8 11h5" /></> },
  { href: "/profile", label: "Profile", icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></> },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((t) => {
        const active = path === t.href || path.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
