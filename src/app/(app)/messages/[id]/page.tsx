import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import { dateOf, minutesOfDay, prettyDate } from "@/lib/data/dates";
import { formatClock } from "@/lib/core/time";
import { BackLink } from "@/components/ui";
import { Composer } from "./Composer";

export const metadata: Metadata = { title: "Messages" };

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await repo().getThread(id);
  if (!t) notFound();
  let lastDay = "";
  return (
    <main className="page">
      <BackLink href="/messages" label="Messages" />
      <header className="stack" style={{ gap: 2 }}>
        <h1 className="page-title" style={{ fontSize: 22 }}>{t.with.name}</h1>
        {t.with.context && <span className="small muted">{t.with.context}</span>}
      </header>
      <ol className="stack" style={{ listStyle: "none", margin: 0, padding: 0, gap: 6 }} aria-label={`Conversation with ${t.with.name}`}>
        {t.messages.length === 0 && <li className="small muted" style={{ textAlign: "center" }}>Say hello. Messages stay in REschedule, so everyone on the deal or showing has the history.</li>}
        {t.messages.map((m) => {
          const day = dateOf(m.at);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <li key={m.id} className="stack" style={{ gap: 4 }}>
              {showDay && <span className="tiny muted strong" style={{ textAlign: "center" }}>{prettyDate(day, { weekday: "short", month: "short", day: "numeric" })}</span>}
              <div className={`bubble ${m.fromMe ? "mine" : ""}`}>
                <span className="sr-only">{m.fromMe ? "You" : t.with.name}: </span>
                <span style={{ whiteSpace: "pre-wrap" }}>{m.body}</span>
                <span className="tiny" style={{ opacity: 0.7, display: "block", textAlign: "right" }}>{formatClock(minutesOfDay(m.at))}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <Composer to={id} name={t.with.name} />
    </main>
  );
}
