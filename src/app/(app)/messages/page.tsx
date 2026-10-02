import Link from "next/link";
import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { dateOf, minutesOfDay, prettyDate, todayISO } from "@/lib/data/dates";
import { formatClock } from "@/lib/core/time";
import { Empty, Initials } from "@/components/ui";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const r = repo();
  const [threads, contacts] = await Promise.all([r.listThreads(), r.listMessageContacts()]);
  const today = todayISO();
  const fresh = contacts.filter((c) => !threads.some((t) => t.withId === c.id));
  return (
    <main className="page">
      <header className="stack" style={{ gap: 4 }}>
        <h1 className="page-title">Messages</h1>
        <p className="page-sub">Chat with your clients, agents on your showings and people on your deals, all in REschedule.</p>
      </header>

      {contacts.length > 0 && (
        <form action="/messages/new" className="row" style={{ gap: 8 }}>
          <label htmlFor="to" className="sr-only">New message to</label>
          <select id="to" name="to" className="input" defaultValue="" required style={{ flex: 1 }}>
            <option value="" disabled>New message to…</option>
            {[...threads.map((t) => ({ id: t.withId, name: t.withName, context: t.context })), ...fresh].map((c) => <option key={c.id} value={c.id}>{c.name}{c.context ? ` · ${c.context}` : ""}</option>)}
          </select>
          <button className="btn primary">Start</button>
        </form>
      )}

      {threads.length === 0 && <Empty>No messages yet. People you work with who are on REschedule show up in the list above.</Empty>}
      <ul className="list" aria-label="Conversations">
        {threads.map((t) => (
          <li key={t.withId} style={{ background: t.unread ? "var(--blue-soft)" : undefined }}>
            <Link href={`/messages/${t.withId}`} className="row" style={{ color: "var(--ink)", gap: 12 }}>
              <Initials name={t.withName} size={40} />
              <span className="stack" style={{ gap: 1, flex: 1, minWidth: 0 }}>
                <span className="between">
                  <span className="strong small">{t.withName}</span>
                  <span className="tiny muted tabular">{dateOf(t.lastAt) === today ? formatClock(minutesOfDay(t.lastAt)) : prettyDate(dateOf(t.lastAt), { month: "short", day: "numeric" })}</span>
                </span>
                {t.context && <span className="tiny muted">{t.context}</span>}
                <span className={`small ${t.unread ? "strong" : "muted"}`} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.last}</span>
              </span>
              {t.unread > 0 && <span className="pill solid" aria-label={`${t.unread} unread`}>{t.unread}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
