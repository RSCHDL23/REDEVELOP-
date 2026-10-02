import Link from "next/link";
import type { Metadata } from "next";
import { listNotices } from "@/lib/data/notifications";
import { Empty } from "@/components/ui";
import { MarkSeen } from "./MarkSeen";

export const metadata: Metadata = { title: "Notifications" };

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} hr ago`;
  const days = Math.round(mins / 1440);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export default async function NotificationsPage() {
  const { items, unread, seenAt } = await listNotices();
  return (
    <main className="page">
      <header className="stack" style={{ gap: 4 }}>
        <h1 className="page-title">Notifications</h1>
        <p className="page-sub">{unread ? `${unread} new` : "You're all caught up."}</p>
      </header>
      <MarkSeen unread={unread} />
      {items.length === 0 && <Empty>Nothing yet. New showing requests, answers, messages and deadlines show up here.</Empty>}
      <ul className="list" aria-label="Notifications">
        {items.map((n) => {
          const isNew = !seenAt || n.at > seenAt;
          return (
            <li key={n.id} style={{ background: isNew ? "var(--blue-soft)" : undefined }}>
              <Link href={n.href} className="row" style={{ color: "var(--ink)", alignItems: "flex-start", gap: 12 }}>
                <span aria-hidden="true" style={{ fontSize: 18, width: 24, textAlign: "center" }}>{n.icon}</span>
                <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                  <span className="small strong">{n.title}</span>
                  {n.sub && <span className="tiny muted" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{n.sub}</span>}
                </span>
                <span className="stack" style={{ gap: 2, alignItems: "flex-end" }}>
                  <span className="tiny muted" style={{ whiteSpace: "nowrap" }}>{ago(n.at)}</span>
                  {isNew && <span className="pill solid">New</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
