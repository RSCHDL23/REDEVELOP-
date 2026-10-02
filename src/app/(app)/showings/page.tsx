import Link from "next/link";
import type { Metadata } from "next";
import { repo } from "@/lib/data";
import type { RequestStatus, ShowingRequest } from "@/lib/data/types";
import { dateOf, minutesOfDay, prettyDate, todayISO } from "@/lib/data/dates";
import { HomeSnapshot } from "@/components/HomeSnapshot";
import { appOrigin } from "@/lib/server/origin";
import { nudgeFor } from "@/lib/data/requestMessages";
import { formatClock } from "@/lib/core/time";
import { Empty } from "@/components/ui";
import { IncomingResponse, SentActions } from "./Responses";

export const metadata: Metadata = { title: "Showings" };

const STATUS: Record<RequestStatus, { label: string; icon: string }> = {
  pending: { label: "Pending", icon: "…" },
  approved: { label: "Confirmed", icon: "✓" },
  countered: { label: "New time proposed", icon: "↻" },
  declined: { label: "Denied", icon: "✕" },
  cancelled: { label: "Cancelled", icon: "–" },
};
const FILTERS: { id: "all" | RequestStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Confirmed" },
  { id: "countered", label: "New time proposed" },
  { id: "declined", label: "Denied" },
];

const when = (start: string, end: string) =>
  `${prettyDate(dateOf(start))} · ${formatClock(minutesOfDay(start))}–${formatClock(minutesOfDay(end))}`;

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} hr ago`;
  return `${Math.round(mins / 1440)} days ago`;
}

function Photo({ r }: { r: ShowingRequest }) {
  return r.photoUrl
    ? <img src={r.photoUrl} alt={`Photo of ${r.address}`} className="thumb" />
    : (
      <span className="thumb empty" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
      </span>
    );
}

export default async function ShowingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; show?: string }> }) {
  const { tab = "incoming", show = "all" } = await searchParams;
  const view = tab === "sent" ? "sent" : "incoming";
  const r = repo();
  const [all, me, licenses] = await Promise.all([r.listRequests(), r.getMe(), r.listLicenses()]);
  const today = todayISO();
  const origin = await appOrigin();
  const mine = all.filter((x) => x.direction === view).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const filter = FILTERS.some((f) => f.id === show) ? show : "all";
  const shown = filter === "all" ? mine.filter((x) => x.status !== "cancelled") : mine.filter((x) => x.status === filter);
  const count = (id: string) => (id === "all" ? mine.filter((x) => x.status !== "cancelled").length : mine.filter((x) => x.status === id).length);
  const href = (t: string, s = "all") => `/showings?tab=${t}${s !== "all" ? `&show=${s}` : ""}`;

  return (
    <main className="page">
      <header className="between">
        <h1 className="page-title">Showings</h1>
        <Link href="/showings/new" className="btn primary">+ Request</Link>
      </header>

      <nav className="grid-2" aria-label="Which showings">
        {(["incoming", "sent"] as const).map((t) => (
          <Link key={t} href={href(t)} className={`btn block ${view === t ? "dark" : ""}`} aria-current={view === t ? "page" : undefined}>
            {t === "incoming" ? "On my listings" : "I requested"}
            {count("pending") > 0 && view === t && <span className="pill solid">{count("pending")}</span>}
          </Link>
        ))}
      </nav>

      <nav className="chips" aria-label="Filter by answer">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={href(view, f.id)}
            className={`chip row ${filter === f.id ? "on" : ""}`}
            aria-current={filter === f.id ? "page" : undefined}
            style={{ color: filter === f.id ? "#fff" : "var(--ink)", gap: 6 }}
          >
            {f.id !== "all" && <span className={`dot ${f.id}`} aria-hidden="true" />}
            {f.label} <span className="tabular" style={{ opacity: 0.7 }}>{count(f.id)}</span>
          </Link>
        ))}
      </nav>

      {shown.length === 0 && (
        <Empty>
          {filter !== "all" ? "Nothing here right now." : view === "incoming" ? "No one has asked to show your listings yet." : "You haven't requested any showings yet."}
        </Empty>
      )}

      {shown.map((x) => {
        const s = STATUS[x.status];
        const agentFirst = x.otherAgent.name.split(" ")[0] || "the listing agent";
        const resend = view === "sent" ? nudgeFor("resend", x, me, licenses, origin) : null;
        const canStart = view === "sent" && x.status === "approved" && dateOf(x.startsAt) <= today;
        const slot = (a: string, b: string) => ({ date: dateOf(a), start: minutesOfDay(a), minutes: Math.max(15, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)) });
        return (
          <article key={x.id} className={`card status-card status-${x.status}`} aria-label={`${x.address}, ${s.label}`}>
            <div className="row" style={{ alignItems: "flex-start" }}>
              <Photo r={x} />
              <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <HomeSnapshot home={x.home} />
                <span className="small tabular strong">{when(x.startsAt, x.endsAt)}</span>
                <span className="small muted">
                  {view === "incoming" ? `${x.otherAgent.name} · ${x.buyerLabel}` : `${x.buyerLabel} · ${x.otherAgent.name}`}
                </span>
              </div>
            </div>
            {/* Color plus words, so the status is clear for everyone, including color-blind users. */}
            <div className="row" style={{ gap: 8 }}>
              <span className="status-icon" aria-hidden="true">{s.icon}</span>
              <span className="strong">{s.label}</span>
              {x.lateEta && x.status === "approved" && <span className="pill amber">Running late · ETA {formatClock(minutesOfDay(x.lateEta))}</span>}
            </div>

            {x.status === "countered" && x.proposedStartsAt && x.proposedEndsAt && (
              <p className="small" style={{ margin: 0 }}>
                <span className="strong">{view === "incoming" ? "You suggested" : `${agentFirst} suggested`}:</span>{" "}
                <span className="tabular strong">{when(x.proposedStartsAt, x.proposedEndsAt)}</span>
              </p>
            )}
            {x.responseNote && <p className="small" style={{ margin: 0 }}>&ldquo;{x.responseNote}&rdquo;</p>}
            {x.attachments.length > 0 && (
              <div className="chips">
                {x.attachments.map((a) => <a key={a.id} className="chip row" style={{ color: "var(--ink)" }} href={a.url} target="_blank" rel="noreferrer">📎 {a.name}</a>)}
              </div>
            )}
            {(x.arrivedAt || x.feedback) && (
              <div className="chips">
                {x.arrivedAt && <span className="pill solid">📍 Arrived {formatClock(minutesOfDay(x.arrivedAt))}</span>}
                {x.feedback && <span className="pill solid">{"★".repeat(x.feedback.rating)} · {x.feedback.interest === "very" ? "Very interested" : x.feedback.interest === "maybe" ? "Maybe" : "Not for them"}</span>}
              </div>
            )}
            {view === "incoming" && x.feedback && (x.feedback.comments || x.feedback.questions) && (
              <div className="small" style={{ background: "rgba(255,255,255,0.7)", padding: 10, borderRadius: 10 }}>
                {x.feedback.comments && <p style={{ margin: 0 }}>&ldquo;{x.feedback.comments}&rdquo;</p>}
                {x.feedback.questions && <p style={{ margin: "6px 0 0" }}><span className="strong">Question:</span> {x.feedback.questions}</p>}
              </div>
            )}
            {canStart && (
              <Link href={`/showings/${x.id}/visit`} className="btn dark block">{x.arrivedAt ? (x.feedback ? "View showing" : "Leave feedback") : "Start showing"}</Link>
            )}

            {view === "incoming" && (
              <IncomingResponse
                id={x.id}
                status={x.status}
                request={slot(x.startsAt, x.endsAt)}
                proposal={x.status === "countered" && x.proposedStartsAt && x.proposedEndsAt ? slot(x.proposedStartsAt, x.proposedEndsAt) : null}
                note={x.responseNote}
              />
            )}
            {view === "incoming" && (x.otherAgent.phone || x.otherAgent.email) && (
              <div className="row small" style={{ flexWrap: "wrap", gap: 6 }}>
                <span className="muted">Contact {agentFirst}:</span>
                {x.otherAgent.phone && <a className="chip row" style={{ color: "var(--ink)" }} href={`sms:${x.otherAgent.phone.replace(/[^\d+]/g, "")}`}>Text</a>}
                {x.otherAgent.phone && <a className="chip row" style={{ color: "var(--ink)" }} href={`tel:${x.otherAgent.phone.replace(/[^\d+]/g, "")}`}>Call</a>}
                {x.otherAgent.email && <a className="chip row" style={{ color: "var(--ink)" }} href={`mailto:${x.otherAgent.email}`}>Email</a>}
              </div>
            )}
            {view === "sent" && (
              <SentActions
                id={x.id}
                status={x.status}
                typedIn={x.listingId === null}
                listingId={x.listingId}
                agent={{ name: x.otherAgent.name, phone: x.otherAgent.phone, email: x.otherAgent.email }}
                slot={slot(x.startsAt, x.endsAt)}
                comments={x.comments}
                resend={{ method: resend!.draft.method, href: resend!.href, label: resend!.draft.actionLabel, body: resend!.draft.body, subject: resend!.draft.subject }}
                reminded={x.remindedAt ? `Sent again ${x.reminderCount > 1 ? `${x.reminderCount} times, last ` : ""}${ago(x.remindedAt)}` : null}
              />
            )}
          </article>
        );
      })}
    </main>
  );
}
