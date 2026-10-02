"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TourContext } from "@/lib/data/types";
import { planTour, type TourPlan } from "@/lib/core/optimizer";
import { driveTable } from "@/lib/core/drive";
import { formatClock, intersectAll, type Window } from "@/lib/core/time";
import { deviceLink, draftsFor, type Draft, type Sender } from "@/lib/core/messages";
import { prettyDate } from "@/lib/data/dates";
import { sendTour, type SendTourState } from "./actions";
import { HomeSnapshot } from "@/components/HomeSnapshot";

const LENGTHS = [15, 30, 45];
const METHOD_NAME: Record<string, string> = { app: "In app", text: "Text", email: "Email", call: "Call", online: "Online" };

function windowsLabel(w: readonly Window[]) {
  return w.length ? w.map(([s, e]) => `${formatClock(s)}–${formatClock(e)}`).join(", ") : "Not free";
}

export function TourBuilder({ ctx, sender }: { ctx: TourContext; sender: Sender }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(() => new Set(ctx.homes.map((h) => h.listing.id)));
  const [length, setLength] = useState(30);
  const [plan, setPlan] = useState<TourPlan | null>(null);
  const [comments, setComments] = useState("");
  const [state, action, sending] = useActionState<SendTourState, FormData>(sendTour, {});

  const party = useMemo(() => intersectAll(ctx.participants.map((p) => p.free)), [ctx]);
  const byId = useMemo(() => new Map(ctx.homes.map((h) => [h.listing.id, h])), [ctx]);

  function toggle(id: string) {
    setPlan(null);
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function build() {
    const homes = ctx.homes.filter((h) => picked.has(h.listing.id));
    const points: Record<string, { lat: number; lng: number }> = { start: ctx.start };
    for (const h of homes) points[h.listing.id] = h.listing;
    setPlan(planTour({
      homes: homes.map((h) => ({ id: h.listing.id, free: h.free })),
      party,
      drive: driveTable(points),
      start: "start",
      departAfter: party[0]?.[0] ?? 9 * 60,
      showingMinutes: length,
      bufferMinutes: ctx.bufferMinutes,
      maxStops: ctx.maxShowingsPerDay,
    }));
  }

  const dayLabel = prettyDate(ctx.date, { weekday: "short", month: "numeric", day: "numeric" });

  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className="card">
        <div className="between">
          <span className="strong">{ctx.clientLabel}</span>
          <input
            type="date"
            aria-label="Tour date"
            className="input"
            style={{ width: "auto", minHeight: 40 }}
            defaultValue={ctx.date}
            onChange={(e) => e.target.value && router.push(`/tour?date=${e.target.value}`)}
          />
        </div>
        <ul className="stack" style={{ listStyle: "none", margin: 0, padding: 0, gap: 6 }}>
          {ctx.participants.map((p) => (
            <li key={p.name} className="between small">
              <span><span className="strong">{p.name}</span> <span className="muted">· {p.source}</span></span>
              <span className="tabular muted" style={{ textAlign: "right" }}>{windowsLabel(p.free)}</span>
            </li>
          ))}
        </ul>
        <p className="small strong" style={{ margin: 0 }}>Everyone free: <span className="tabular">{windowsLabel(party)}</span></p>
      </section>

      <section className="stack">
        <h2 className="section-label">Homes ({picked.size})</h2>
        <ul className="list">
          {ctx.homes.map(({ listing: l, free }) => (
            <li key={l.id}>
              <label className="row" style={{ cursor: "pointer", alignItems: "flex-start" }}>
                <input type="checkbox" checked={picked.has(l.id)} onChange={() => toggle(l.id)} style={{ width: 22, height: 22, marginTop: 2 }} />
                <span className="stack" style={{ gap: 1, flex: 1 }}>
                  <HomeSnapshot home={{ address: l.address, city: `${l.city}, ${l.state}`, photoUrl: l.photoUrl, beds: l.beds, baths: l.baths, sqft: l.sqft }} />
                  <span className="small muted">{l.beds} bd · {l.baths} ba · {l.listingAgent.name}</span>
                  <span className="tiny muted tabular">Can show {windowsLabel(free)}</span>
                </span>
                {l.instantShowings && <span className="pill blue">Instant</span>}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="stack">
        <h2 className="section-label">Time at each home</h2>
        <div className="chips">
          {LENGTHS.map((m) => (
            <button key={m} type="button" className="chip" aria-pressed={length === m} onClick={() => { setLength(m); setPlan(null); }}>{m} min</button>
          ))}
        </div>
      </section>

      <div className="field">
        <label htmlFor="tour-comments">Note for listing agents (optional)</label>
        <textarea id="tour-comments" className="input" maxLength={500} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Added to every request, e.g. Buyers are pre-approved with a 20% down payment." />
      </div>

      <button type="button" className="btn primary lg block" onClick={build} disabled={picked.size === 0}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
        Build my tour
      </button>

      {plan && (
        <section className="stack" aria-live="polite">
          <div className="card dark">
            <span className="strong" style={{ fontSize: 18, color: "#fff" }}>
              {plan.stops.length} of {picked.size} homes · {dayLabel}
            </span>
            <span className="small muted tabular">
              {plan.leaveAt !== null ? `Leave ${ctx.start.label.toLowerCase()} at ${formatClock(plan.leaveAt)} · done by ${formatClock(plan.end)} · ${plan.driveTotal} min driving` : "No times work for everyone on this date. Try another day."}
            </span>
          </div>

          {plan.skipped.length > 0 && (
            <p className="notice amber">
              Didn&apos;t fit: {plan.skipped.map((id) => byId.get(id)?.listing.address).join(", ")}. Try another day or a shorter visit.
            </p>
          )}

          <ol className="stack" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {plan.stops.map((s, i) => {
              const l = byId.get(s.homeId)!.listing;
              const a = l.listingAgent;
              const drafts = draftsFor(
                sender,
                { listingAgentFirstName: a.name.split(" ")[0], address: l.address, dayLabel, timeLabel: `${formatClock(s.start)}–${formatClock(s.end)}`, buyerNames: ctx.clientLabel, preApproved: true, comments: comments.trim() || undefined },
                { phone: a.phone, email: a.email, onApp: a.onApp, onlineUrl: a.contact.onlineUrl },
              );
              const preferred = a.onApp ? ["app"] : a.contact.methods;
              return (
                <li key={s.homeId}>
                  <StopCard index={i + 1} address={l.address} time={`${formatClock(s.start)}–${formatClock(s.end)}`} drive={s.driveMinutes} wait={s.waitMinutes} agent={a.name} drafts={drafts} preferred={preferred} instant={l.instantShowings} />
                </li>
              );
            })}
          </ol>

          {plan.stops.length > 0 && !state.sent && (
            <form action={action}>
              <input
                type="hidden"
                name="tour"
                value={JSON.stringify({
                  date: ctx.date,
                  buyerLabel: ctx.clientLabel,
                  comments: comments.trim(),
                  stops: plan.stops.map((s) => {
                    const a = byId.get(s.homeId)!.listing.listingAgent;
                    return { listingId: s.homeId, start: s.start, end: s.end, method: a.onApp ? "app" : a.contact.preferred };
                  }),
                })}
              />
              <button className="btn dark lg block" disabled={sending}>{sending ? "Saving…" : `Save all ${plan.stops.length} requests`}</button>
              <p className="tiny muted" style={{ textAlign: "center" }}>In-app requests go out right away. Use each card to send texts and emails from your phone.</p>
            </form>
          )}
          {state.sent && <p className="notice">Saved {state.sent} showing requests. Track them under Showings → I requested.</p>}
          {state.error && <p className="error" role="alert">{state.error}</p>}
        </section>
      )}
    </div>
  );
}

function StopCard({ index, address, time, drive, wait, agent, drafts, preferred, instant }: {
  index: number; address: string; time: string; drive: number; wait: number; agent: string; drafts: Draft[]; preferred: string[]; instant: boolean;
}) {
  const [method, setMethod] = useState(drafts.find((d) => preferred.includes(d.method))?.method ?? drafts[0]?.method);
  const draft = drafts.find((d) => d.method === method);
  const link = draft ? deviceLink(draft) : null;
  return (
    <article className="card">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <span className="avatar" style={{ width: 32, height: 32, fontSize: 14 }}>{index}</span>
        <div className="stack" style={{ gap: 1, flex: 1 }}>
          <span className="strong">{address}</span>
          <span className="small tabular strong">{time}</span>
          <span className="tiny muted">{drive} min drive{wait > 0 ? ` · ${wait} min early` : ""} · {agent}</span>
        </div>
        {instant && <span className="pill blue">Instant</span>}
      </div>
      {drafts.length > 0 && (
        <>
          <div className="chips" role="group" aria-label="How to send">
            {drafts.map((d) => (
              <button key={d.method} type="button" className="chip" aria-pressed={d.method === method} onClick={() => setMethod(d.method)}>
                {METHOD_NAME[d.method]}{preferred.includes(d.method) ? " ★" : ""}
              </button>
            ))}
          </div>
          {draft && (
            <>
              {draft.subject && <p className="small strong" style={{ margin: 0 }}>{draft.subject}</p>}
              <p className="small" style={{ margin: 0, whiteSpace: "pre-wrap", background: "var(--ground)", padding: 10, borderRadius: 10 }}>{draft.body}</p>
              {link && <a className="btn block" href={link} target={draft.method === "online" ? "_blank" : undefined} rel="noreferrer">{draft.actionLabel}</a>}
            </>
          )}
        </>
      )}
    </article>
  );
}
