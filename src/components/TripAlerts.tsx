"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { estimateDriveMinutes } from "@/lib/core/drive";
import { formatClock } from "@/lib/core/time";
import { runningLate } from "@/app/(app)/showings/actions";

export type Trip = {
  id: string; address: string; startsAt: string; lat: number | null; lng: number | null; arrived: boolean;
  listingFirst: string; listingOnApp: boolean; listingPhone: string; listingText: string;
  partyName: string; partyPhone: string; partyText: string;
};

const KEY = "re_trip_alerts";
const LEAVE_BUFFER = 5; // minutes to park and walk in
const clockOf = (d: Date) => formatClock(Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", hourCycle: "h23" }).format(d)) * 60 + d.getMinutes());
const sms = (phone: string, body: string) => `sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(body)}`;

function notify(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(title, { body, icon: "/icon-192.png", tag: title });
  } catch { /* some browsers only allow notifications from an installed app */ }
}

/**
 * Leave-on-time and running-late alerts for today's confirmed showings.
 * Works while REschedule is open (phone or computer); background alerts come with the mobile app.
 */
export function TripAlerts({ trips, compact = false }: { trips: Trip[]; compact?: boolean }) {
  const [on, setOn] = useState(false);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  // Set after the page loads, so the server and phone agree on the first render.
  const [now, setNow] = useState<number | null>(null);
  const [sent, setSent] = useState<Record<string, string>>({});
  const [manualLate, setManualLate] = useState<number | null>(null);
  const notified = useRef(new Set<string>());
  const watch = useRef<number | null>(null);

  const start = useCallback(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    if (navigator.geolocation && watch.current === null) {
      watch.current = navigator.geolocation.watchPosition((p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { maximumAge: 60000, timeout: 20000 });
    }
  }, []);

  useEffect(() => {
    // Alerts are on unless the agent turned them off.
    let off = false;
    try { off = localStorage.getItem(KEY) === "0"; } catch { /* storage blocked */ }
    if (!off || compact) { setOn(true); start(); }
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => { clearInterval(t); if (watch.current !== null) navigator.geolocation?.clearWatch(watch.current); };
  }, [compact, start]);

  function toggle() {
    const next = !on;
    setOn(next);
    try { localStorage.setItem(KEY, next ? "1" : "0"); } catch { /* storage blocked */ }
    if (next) start();
  }

  const next = now === null ? undefined : trips
    .filter((t) => !t.arrived && Date.parse(t.startsAt) > now - 45 * 60000)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

  const nowMs = now ?? 0;
  const drive = next && pos && next.lat != null && next.lng != null ? estimateDriveMinutes(pos, { lat: next.lat, lng: next.lng }) : null;
  const startMs = next ? Date.parse(next.startsAt) : 0;
  const leaveBy = next ? new Date(startMs - ((drive ?? 0) + LEAVE_BUFFER) * 60000) : null;
  const eta = next ? (drive !== null ? new Date(nowMs + (drive + LEAVE_BUFFER) * 60000) : manualLate ? new Date(nowMs + manualLate * 60000) : null) : null;
  const late = !!next && ((eta !== null && eta.getTime() > startMs + 60000) || nowMs > startMs + 5 * 60000);
  const leaveSoon = !!next && !late && leaveBy !== null && drive !== null && nowMs >= leaveBy.getTime() - 5 * 60000;

  // Phone/computer notifications, once each.
  useEffect(() => {
    if (!on || !next) return;
    if (leaveSoon && !notified.current.has(`leave-${next.id}`)) {
      notified.current.add(`leave-${next.id}`);
      notify("Time to leave", `Leave now to make ${clockOf(new Date(startMs))} at ${next.address}${drive ? ` (${drive} min drive)` : ""}.`);
    }
    if (late && !notified.current.has(`late-${next.id}`)) {
      notified.current.add(`late-${next.id}`);
      notify("Running late?", `Tap to send your ETA for ${next.address} to everyone.`);
    }
  }, [on, next, leaveSoon, late, drive, startMs]);

  if (now === null) return null;
  if (!next) {
    if (compact) return null;
    return (
      <div className="card row" style={{ flexDirection: "row", gap: 10 }}>
        <span className="stack" style={{ gap: 0, flex: 1 }}><span className="strong small">Leave-on-time alerts</span><span className="tiny muted">No more confirmed showings today.</span></span>
        <button type="button" className="chip" aria-pressed={on} onClick={toggle}>{on ? "On" : "Off"}</button>
      </div>
    );
  }

  const etaLabel = eta ? clockOf(eta) : "a few minutes";
  async function sendEta() {
    if (!next) return;
    const at = eta ?? new Date(nowMs + 10 * 60000);
    await runningLate(next.id, at.toISOString());
    setSent((s) => ({ ...s, [next.id]: clockOf(at) }));
  }

  return (
    <section className={`card ${late ? "status-card status-countered" : leaveSoon ? "status-card status-pending" : ""}`} aria-live="polite">
      <div className="between">
        <span className="strong">{late ? "⏰ Running late?" : leaveSoon ? "🚗 Time to leave" : "Next showing"}</span>
        {!compact && <button type="button" className="chip" aria-pressed={on} onClick={toggle} aria-label="Leave-on-time alerts">{on ? "Alerts on" : "Alerts off"}</button>}
      </div>
      <span className="small">
        <span className="strong">{next.address}</span> at {clockOf(new Date(startMs))}
        {drive !== null ? ` · ${drive} min away` : ""}
      </span>
      {!late && leaveBy && drive !== null && <span className="small">Leave by <span className="strong tabular">{clockOf(leaveBy)}</span> to arrive on time.</span>}
      {!late && drive === null && on && <span className="tiny muted">Allow location access to get a leave-by time from where you are.</span>}

      {late && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="small">You haven&apos;t started this showing yet. {eta ? <>Your ETA is about <span className="strong tabular">{etaLabel}</span>.</> : "How far away are you?"}</span>
          {drive === null && (
            <div className="chips" role="group" aria-label="Minutes away">
              {[5, 10, 15, 20, 30].map((m) => <button key={m} type="button" className="chip" aria-pressed={manualLate === m} onClick={() => setManualLate(m)}>{m} min</button>)}
            </div>
          )}
          {sent[next.id] ? (
            <span className="small strong" style={{ color: "var(--green)" }}>✓ ETA {sent[next.id]} sent{next.listingOnApp ? ` to ${next.listingFirst} in REschedule` : ""}.</span>
          ) : (
            <button type="button" className="btn primary block" onClick={sendEta}>Send ETA {etaLabel}{next.listingOnApp ? ` to ${next.listingFirst} in app` : ""}</button>
          )}
          <div className="grid-2">
            {next.listingPhone && <a className="btn block" style={{ background: "#fff" }} href={sms(next.listingPhone, next.listingText.replace("{ETA}", etaLabel))} onClick={() => { if (!sent[next.id]) void sendEta(); }}>Text {next.listingFirst}</a>}
            {next.partyPhone && <a className="btn block" style={{ background: "#fff" }} href={sms(next.partyPhone, next.partyText.replace("{ETA}", etaLabel))}>Text {next.partyName.split(" ")[0]}</a>}
          </div>
        </div>
      )}
      {!compact && <Link href={`/showings/${next.id}/visit`} className="btn dark block">Start showing</Link>}
    </section>
  );
}
