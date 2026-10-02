"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Place, TourContext } from "@/lib/data/types";
import { planTour, type TourPlan } from "@/lib/core/optimizer";
import { driveTable } from "@/lib/core/drive";
import { formatClock, intersect, intersectAll, type Window } from "@/lib/core/time";
import { deviceLink, draftsFor, type Draft, type Sender } from "@/lib/core/messages";
import { prettyDate } from "@/lib/data/dates";
import { findAddress, sendTour, suggestTimes, type SendTourState, type Suggestion } from "./actions";
import { AttachDocs } from "@/components/AttachDocs";
import type { Attachment } from "@/lib/data/types";
import { HomeSnapshot } from "@/components/HomeSnapshot";

const LENGTHS = [15, 30, 45];
const METHOD_NAME: Record<string, string> = { app: "In app", text: "Text", email: "Email", call: "Call", online: "Online" };

function windowsLabel(w: readonly Window[]) {
  return w.length ? w.map(([s, e]) => `${formatClock(s)}–${formatClock(e)}`).join(", ") : "Not free";
}

type StartMode = "office" | "home" | "first" | "current" | "address";
type Coords = { lat: number; lng: number };
const hasCoords = (p: Place | null): p is Place & Coords => !!p && p.lat != null && p.lng != null;

export function TourBuilder({ ctx, sender, places, origin }: { ctx: TourContext; sender: Sender; places: { home: Place | null; office: Place | null }; origin: string }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(() => new Set(ctx.homes.map((h) => h.listing.id)));
  const [length, setLength] = useState(30);
  const [plan, setPlan] = useState<TourPlan | null>(null);
  const [comments, setComments] = useState("");
  const [docs, setDocs] = useState<Attachment[]>([]);
  const [edits, setEdits] = useState<Record<string, { start: number; end: number }>>({});
  const finalSlot = (st: { homeId: string; start: number; end: number }) => edits[st.homeId] ?? { start: st.start, end: st.end };
  const [mode, setMode] = useState<StartMode>(hasCoords(places.office) ? "office" : hasCoords(places.home) ? "home" : "first");
  const [current, setCurrent] = useState<Coords | null>(null);
  const [typed, setTyped] = useState("");
  const [typedAt, setTypedAt] = useState<(Coords & { address: string }) | null>(null);
  const [startMsg, setStartMsg] = useState("");

  const startPoint: { label: string; coords: Coords | null } =
    mode === "office" ? { label: "your office", coords: hasCoords(places.office) ? places.office : null }
    : mode === "home" ? { label: "home", coords: hasCoords(places.home) ? places.home : null }
    : mode === "current" ? { label: "where you are", coords: current }
    : mode === "address" ? { label: typedAt?.address ?? "that address", coords: typedAt }
    : { label: "your first showing", coords: null };

  function pickMode(m: StartMode) {
    setMode(m); setPlan(null); setStartMsg("");
    if (m === "current" && !current) {
      if (!navigator.geolocation) { setStartMsg("Location isn't available on this device."); return; }
      setStartMsg("Finding you…");
      navigator.geolocation.getCurrentPosition(
        (p) => { setCurrent({ lat: p.coords.latitude, lng: p.coords.longitude }); setStartMsg(""); },
        () => setStartMsg("Allow location access to start from where you are."),
        { enableHighAccuracy: false, timeout: 10000 },
      );
    }
  }

  async function lookUp() {
    setStartMsg("Looking up…");
    const res = await findAddress(typed);
    if ("error" in res) { setStartMsg(res.error); setTypedAt(null); } else { setTypedAt(res); setStartMsg(`Starting from ${res.address}`); setPlan(null); }
  }
  const [state, action, sending] = useActionState<SendTourState, FormData>(sendTour, {});

  // Everyone's free times for this tour. Starts from calendars; the agent can change any of them by hand.
  const fromCalendar = useMemo(() => ctx.participants.map((p) => ({ name: p.name, source: p.source, free: p.free.map(([a, b]) => [a, b] as Window) })), [ctx]);
  const [people, setPeople] = useState(fromCalendar);
  const [editingPerson, setEditingPerson] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const party = useMemo(() => intersectAll(people.map((p) => p.free)), [people]);
  function setFree(i: number, free: Window[]) {
    setPlan(null);
    setPeople((list) => list.map((p, j) => (j === i ? { ...p, free, source: "Edited by you" } : p)));
  }
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
    if (mode !== "first" && !startPoint.coords) { setStartMsg("Pick a starting point first."); return; }
    const points: Record<string, { lat: number; lng: number }> = { start: startPoint.coords ?? homes[0]?.listing ?? ctx.start };
    for (const h of homes) points[h.listing.id] = h.listing;
    const drive = driveTable(points);
    // "Start at first showing": no drive to the first stop.
    if (mode === "first") for (const h of homes) drive.start[h.listing.id] = 0;
    setEdits({});
    setPlan(planTour({
      homes: homes.map((h) => ({ id: h.listing.id, free: h.free })),
      party,
      drive,
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
        <ul className="stack" style={{ listStyle: "none", margin: 0, padding: 0, gap: 6 }} aria-label="Who's going and when they're free">
          {people.map((p, i) => (
            <li key={`${p.name}-${i}`} className="stack" style={{ gap: 6 }}>
              <div className="between small" style={{ gap: 8 }}>
                <span><span className="strong">{p.name}</span> <span className="muted">· {p.source}</span></span>
                <span className="row" style={{ gap: 6 }}>
                  <span className="tabular muted" style={{ textAlign: "right" }}>{windowsLabel(p.free)}</span>
                  <button type="button" className="chip" aria-expanded={editingPerson === i} aria-label={editingPerson === i ? `Done editing ${p.name}'s free times` : `Edit ${p.name}'s free times`} onClick={() => setEditingPerson(editingPerson === i ? null : i)}>{editingPerson === i ? "Done" : "Edit"}</button>
                </span>
              </div>
              {editingPerson === i && (
                <FreeEditor
                  name={p.name} free={p.free} onChange={(w) => setFree(i, w)}
                  onReset={i < fromCalendar.length ? () => { setPlan(null); setPeople((list) => list.map((x, j) => (j === i ? fromCalendar[i] : x))); } : undefined}
                  onRemove={i > 0 ? () => { setPlan(null); setEditingPerson(null); setPeople((list) => list.filter((_, j) => j !== i)); } : undefined}
                />
              )}
            </li>
          ))}
        </ul>
        <div className="row" style={{ gap: 6 }}>
          <input className="input" aria-label="Add someone to the tour" placeholder="Add someone (e.g. a co-buyer)" value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} style={{ flex: 1, minHeight: 40 }} />
          <button type="button" className="btn" style={{ minHeight: 40 }} disabled={!newName.trim()} onClick={() => { setPeople((l) => [...l, { name: newName.trim(), source: "Entered by hand", free: [[10 * 60, 17 * 60]] }]); setEditingPerson(people.length); setNewName(""); setPlan(null); }}>Add</button>
        </div>
        <p className="small strong" style={{ margin: 0 }}>Everyone free: <span className="tabular">{windowsLabel(party)}</span></p>
        <span className="tiny muted">Changes here are for this tour only. Set your usual hours in <a href="/availability">Availability</a>.</span>
      </section>

      <section className="stack">
        <h2 className="section-label">Homes ({picked.size})</h2>
        <ul className="list">
          {ctx.homes.map(({ listing: l, free }) => (
            <li key={l.id}>
              <label className="row" style={{ cursor: "pointer", alignItems: "flex-start" }}>
                <input type="checkbox" checked={picked.has(l.id)} onChange={() => toggle(l.id)} style={{ width: 22, height: 22, marginTop: 2 }} />
                <span className="stack" style={{ gap: 1, flex: 1 }}>
                  <HomeSnapshot home={{ address: l.address, city: `${l.city}, ${l.state}`, photoUrl: l.photoUrl, beds: l.beds, baths: l.baths, sqft: l.sqft, price: l.price }} />
                  <span className="small muted">{l.price ? `${l.price.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} · ` : ""}{l.beds} bd · {l.baths} ba · {l.listingAgent.name}</span>
                  <span className="tiny muted tabular">Can show {windowsLabel(free)}</span>
                </span>
                {l.instantShowings && <span className="pill blue">Instant</span>}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="stack">
        <h2 className="section-label">Start from</h2>
        <div className="chips" role="group" aria-label="Starting point">
          {([
            ["office", "Office", hasCoords(places.office)],
            ["home", "Home", hasCoords(places.home)],
            ["first", "First showing", true],
            ["current", "Where I am", true],
            ["address", "Other address", true],
          ] as [StartMode, string, boolean][]).map(([id, label, ok]) => (
            <button key={id} type="button" className="chip" aria-pressed={mode === id} onClick={() => pickMode(id)} disabled={!ok} title={ok ? undefined : "Add this address in Profile"}>{label}</button>
          ))}
        </div>
        {mode === "address" && (
          <div className="row">
            <input className="input" aria-label="Starting address" placeholder="Street, city, state" value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={200} style={{ flex: 1 }} />
            <button type="button" className="btn dark" onClick={lookUp} disabled={typed.trim().length < 5}>Set</button>
          </div>
        )}
        {(!hasCoords(places.office) || !hasCoords(places.home)) && <span className="tiny muted">Add your home and office addresses in Profile to start from them.</span>}
        {startMsg && <span className="small" role="status">{startMsg}</span>}
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
        <AttachDocs value={docs} onChange={setDocs} name="tourDocs" />
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
              {plan.leaveAt !== null
                ? mode === "first"
                  ? `Meet at the first home at ${formatClock(plan.stops[0].start)} · done by ${formatClock(plan.end)} · ${plan.driveTotal} min driving`
                  : `Leave ${startPoint.label} at ${formatClock(plan.leaveAt)} · done by ${formatClock(plan.end)} · ${plan.driveTotal} min driving`
                : "No times work for everyone on this date. Try another day."}
            </span>
          </div>

          {plan.skipped.length > 0 && (
            <div className="card status-card status-countered">
              <span className="strong">Didn&apos;t fit in this tour</span>
              {plan.skipped.map((id) => (
                <NextBest key={id} party={party} listingId={id} address={byId.get(id)?.listing.address ?? ""} date={ctx.date} minutes={length} taken={plan.stops.map((x) => [finalSlot(x).start, finalSlot(x).end] as [number, number])} />
              ))}
            </div>
          )}

          <ol className="stack" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {plan.stops.map((st, i) => {
              const home = byId.get(st.homeId)!;
              const l = home.listing;
              const a = l.listingAgent;
              const slot = finalSlot(st);
              const drafts = draftsFor(
                sender,
                { listingAgentFirstName: a.name.split(" ")[0], address: l.address, dayLabel, timeLabel: `${formatClock(slot.start)}–${formatClock(slot.end)}`, buyerNames: ctx.clientLabel, preApproved: true, comments: comments.trim() || undefined, attachments: docs.length ? docs.map((d) => ({ name: d.name, url: `${origin}${d.url}` })) : undefined },
                { phone: a.phone, email: a.email, onApp: a.onApp, onlineUrl: a.contact.onlineUrl },
              );
              const preferred = a.onApp ? ["app"] : a.contact.methods;
              const fits = intersect(party, home.free).some(([s0, e0]) => slot.start >= s0 && slot.end <= e0);
              return (
                <li key={st.homeId}>
                  <StopCard
                    index={i + 1} address={l.address} slot={slot} drive={st.driveMinutes} wait={st.waitMinutes} agent={a.name}
                    drafts={drafts} preferred={preferred} instant={l.instantShowings} fits={fits}
                    onTime={(start, minutes) => setEdits((e) => ({ ...e, [st.homeId]: { start, end: start + minutes } }))}
                  />
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
                  attachmentIds: docs.map((d) => d.id),
                  stops: plan.stops.map((st) => {
                    const a = byId.get(st.homeId)!.listing.listingAgent;
                    const slot = finalSlot(st);
                    return { listingId: st.homeId, start: slot.start, end: slot.end, method: a.onApp ? "app" : a.contact.preferred };
                  }),
                })}
              />
              <button className="btn dark lg block" disabled={sending}>{sending ? "Sending…" : `Send all ${plan.stops.length} requests`}</button>
              <p className="tiny muted" style={{ textAlign: "center" }}>In-app requests go out right away. Use each card to send texts and emails from your phone. Tap Edit on any stop to change its time or message first.</p>
            </form>
          )}
          {state.sent && <p className="notice">Sent {state.sent} showing requests. Track them under Showings → I requested.</p>}
          {state.error && <p className="error" role="alert">{state.error}</p>}
        </section>
      )}
    </div>
  );
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
function ClockPicker({ value, onChange, label }: { value: number; onChange: (m: number) => void; label: string }) {
  const h24 = Math.floor(value / 60), m = value % 60, pm = h24 >= 12, h12 = h24 % 12 || 12;
  const set = (h: number, mm: number, isPm: boolean) => onChange(((h % 12) + (isPm ? 12 : 0)) * 60 + mm);
  return (
    <div className="row" style={{ gap: 4 }} role="group" aria-label={label}>
      <select className="input" aria-label="Hour" value={h12} onChange={(e) => set(Number(e.target.value), m, pm)} style={{ padding: "0 6px" }}>{HOURS.map((h) => <option key={h} value={h}>{h}</option>)}</select>
      <select className="input" aria-label="Minutes" value={m - (m % 5)} onChange={(e) => set(h12, Number(e.target.value), pm)} style={{ padding: "0 6px" }}>{Array.from({ length: 12 }, (_, i) => i * 5).map((x) => <option key={x} value={x}>{String(x).padStart(2, "0")}</option>)}</select>
      <select className="input" aria-label="AM or PM" value={pm ? "PM" : "AM"} onChange={(e) => set(h12, m, e.target.value === "PM")} style={{ padding: "0 6px" }}><option>AM</option><option>PM</option></select>
    </div>
  );
}

/** Edit someone's free times for the tour day, in 5-minute steps. */
function FreeEditor({ name, free, onChange, onReset, onRemove }: { name: string; free: Window[]; onChange: (w: Window[]) => void; onReset?: () => void; onRemove?: () => void }) {
  const sorted = [...free].sort((a, b) => a[0] - b[0]);
  const update = (i: number, w: Window) => onChange(sorted.map((x, j) => (j === i ? w : x)));
  const last = sorted[sorted.length - 1];
  return (
    <div className="stack" style={{ gap: 8, background: "var(--ground)", padding: 10, borderRadius: 12 }}>
      {sorted.length === 0 && <span className="small muted">{name} isn&apos;t free this day.</span>}
      {sorted.map(([a, b], i) => (
        <div key={i} className="stack" style={{ gap: 4 }}>
          <div className="stack" style={{ gap: 6 }}>
            <div className="field"><span className="tiny strong">From</span><ClockPicker label={`${name} free from`} value={a} onChange={(m) => update(i, [m, Math.max(b, m + 15)])} /></div>
            <div className="field"><span className="tiny strong">To</span><ClockPicker label={`${name} free until`} value={b} onChange={(m) => update(i, [Math.min(a, m - 15), m])} /></div>
          </div>
          <button type="button" className="chip" style={{ alignSelf: "flex-start" }} onClick={() => onChange(sorted.filter((_, j) => j !== i))}>Remove this time</button>
        </div>
      ))}
      <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
        <button type="button" className="btn" style={{ minHeight: 36 }} onClick={() => { const s0 = last ? Math.min(last[1] + 60, 22 * 60) : 10 * 60; onChange([...sorted, [s0, Math.min(s0 + 120, 23 * 60 + 55)]]); }}>+ Add a time</button>
        {sorted.length > 0 && <button type="button" className="btn" style={{ minHeight: 36 }} onClick={() => onChange([])}>Not free this day</button>}
        {onReset && <button type="button" className="btn" style={{ minHeight: 36 }} onClick={onReset}>Use their calendar</button>}
        {onRemove && <button type="button" className="btn" style={{ minHeight: 36 }} onClick={onRemove}>Remove {name.split(" ")[0]}</button>}
      </div>
    </div>
  );
}

function NextBest({ listingId, address, date, minutes, taken, party }: { listingId: string; address: string; date: string; minutes: number; taken: [number, number][]; party: Window[] }) {
  const [list, setList] = useState<Suggestion[] | null>(null);
  const [busy, setBusy] = useState(false);
  async function find() { setBusy(true); setList(await suggestTimes(listingId, date, minutes, taken, party.map(([a, b]) => [a, b] as [number, number]))); setBusy(false); }
  const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="between">
        <span className="small strong">{address}</span>
        {!list && <button type="button" className="btn" style={{ minHeight: 36, background: "#fff" }} onClick={find} disabled={busy}>{busy ? "Looking…" : "Next best time"}</button>}
      </div>
      {list && list.length === 0 && <span className="small">No time works for everyone in the next 7 days. Try a shorter visit or ask the listing agent for more windows.</span>}
      {list && list.map((x) => (
        <div key={`${x.date}-${x.start}`} className="between small" style={{ background: "rgba(255,255,255,0.7)", padding: "8px 10px", borderRadius: 10 }}>
          <span className="tabular"><span className="strong">{x.date === date ? "Same day" : prettyDate(x.date)}</span> · {formatClock(x.start)}–{formatClock(x.end)}</span>
          <a className="btn" style={{ minHeight: 34 }} href={`/showings/new?listing=${listingId}&date=${x.date}&time=${hhmm(x.start)}&minutes=${minutes}`}>Request</a>
        </div>
      ))}
    </div>
  );
}

function StopCard({ index, address, slot, drive, wait, agent, drafts, preferred, instant, fits, onTime }: {
  index: number; address: string; slot: { start: number; end: number }; drive: number; wait: number; agent: string; drafts: Draft[]; preferred: string[]; instant: boolean;
  fits: boolean; onTime: (start: number, minutes: number) => void;
}) {
  const [method, setMethod] = useState(drafts.find((d) => preferred.includes(d.method))?.method ?? drafts[0]?.method);
  const [editing, setEditing] = useState(false);
  const [custom, setCustom] = useState<Record<string, { body: string; subject?: string }>>({});
  const auto = drafts.find((d) => d.method === method);
  const draft = auto ? { ...auto, ...(custom[auto.method] ?? {}) } : undefined;
  const link = draft ? deviceLink(draft) : null;
  const minutes = slot.end - slot.start;
  return (
    <article className="card">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <span className="avatar" style={{ width: 32, height: 32, fontSize: 14 }}>{index}</span>
        <div className="stack" style={{ gap: 1, flex: 1 }}>
          <span className="strong">{address}</span>
          <span className="small tabular strong">{formatClock(slot.start)}–{formatClock(slot.end)}</span>
          <span className="tiny muted">{drive} min drive{wait > 0 ? ` · ${wait} min early` : ""} · {agent}</span>
        </div>
        {instant && <span className="pill blue">Instant</span>}
        <button type="button" className="btn" style={{ minHeight: 34 }} onClick={() => setEditing((v) => !v)} aria-expanded={editing}>{editing ? "Done" : "Edit"}</button>
      </div>
      {!fits && <span className="small strong" style={{ color: "var(--amber)" }}>⚠ This time is outside the home&apos;s showing window or someone&apos;s calendar.</span>}
      {editing && (
        <div className="stack" style={{ gap: 8, background: "var(--ground)", padding: 10, borderRadius: 12 }}>
          <div className="grid-2">
            <div className="field"><span className="small strong">Start</span><ClockPicker label="Start time" value={slot.start} onChange={(m) => onTime(m, minutes)} /></div>
            <div className="field">
              <label className="small strong" htmlFor={`len-${index}`}>Length</label>
              <select id={`len-${index}`} className="input" value={minutes} onChange={(e) => onTime(slot.start, Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => (i + 1) * 15).map((x) => <option key={x} value={x}>{x < 60 ? `${x} min` : `${Math.floor(x / 60)} hr${x >= 120 ? "s" : ""}${x % 60 ? ` ${x % 60} min` : ""}`}</option>)}
              </select>
            </div>
          </div>
          {draft && draft.method !== "app" && draft.method !== "online" && (
            <>
              {draft.subject !== undefined && (
                <div className="field"><label className="small strong" htmlFor={`sub-${index}`}>Subject</label><input id={`sub-${index}`} className="input" value={draft.subject} onChange={(e) => setCustom((c) => ({ ...c, [draft.method]: { body: draft.body, subject: e.target.value } }))} /></div>
              )}
              <div className="field">
                <label className="small strong" htmlFor={`body-${index}`}>Message</label>
                <textarea id={`body-${index}`} className="input" rows={6} value={draft.body} onChange={(e) => setCustom((c) => ({ ...c, [draft.method]: { body: e.target.value, subject: draft.subject } }))} />
              </div>
              {custom[draft.method] && <button type="button" className="btn" style={{ minHeight: 34 }} onClick={() => setCustom((c) => { const n = { ...c }; delete n[draft.method]; return n; })}>Reset to the template</button>}
            </>
          )}
        </div>
      )}
      {drafts.length > 0 && (
        <>
          <div className="chips" role="group" aria-label="How to send">
            {drafts.map((d) => (
              <button key={d.method} type="button" className="chip" aria-pressed={d.method === method} onClick={() => setMethod(d.method)}>
                {METHOD_NAME[d.method]}{preferred.includes(d.method) ? " ★" : ""}
              </button>
            ))}
          </div>
          {draft && !editing && (
            <>
              {draft.subject && <p className="small strong" style={{ margin: 0 }}>{draft.subject}</p>}
              <p className="small" style={{ margin: 0, whiteSpace: "pre-wrap", background: "var(--ground)", padding: 10, borderRadius: 10 }}>{draft.body}</p>
            </>
          )}
          {draft && (
            <div className="grid-2">
              {link ? <a className="btn primary block" href={link} target={draft.method === "online" ? "_blank" : undefined} rel="noreferrer">{draft.actionLabel}</a> : <span className="small muted" style={{ alignSelf: "center" }}>Goes out when you tap Send all</span>}
              {draft.method !== "app" && <button type="button" className="btn block" onClick={() => navigator.clipboard?.writeText(draft.subject ? `${draft.subject}\n\n${draft.body}` : draft.body).catch(() => {})}>Copy message</button>}
            </div>
          )}
        </>
      )}
    </article>
  );
}
