"use client";

import { useActionState, useState } from "react";
import type { WeeklyHours } from "@/lib/data/types";
import { saveHours, type HoursState } from "./actions";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function HoursForm({ hours }: { hours: WeeklyHours[] }) {
  const [state, action, pending] = useActionState<HoursState, FormData>(saveHours, {});
  const [on, setOn] = useState(() => hours.map((h) => h.on));
  return (
    <form action={action} className="stack">
      <ul className="list">
        {hours.map((h, i) => (
          <li key={h.weekday} className="stack" style={{ gap: 8 }}>
            <label className="row" style={{ cursor: "pointer" }}>
              <input type="checkbox" name={`on-${h.weekday}`} checked={on[i]} onChange={(e) => setOn((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))} style={{ width: 22, height: 22 }} />
              <span className="strong" style={{ flex: 1 }}>{DAYS[h.weekday]}</span>
              {!on[i] && <span className="small muted">Off</span>}
            </label>
            <div className="grid-2" hidden={!on[i]}>
              <input type="time" name={`start-${h.weekday}`} className="input" defaultValue={toTime(h.start)} step={900} aria-label={`${DAYS[h.weekday]} start`} />
              <input type="time" name={`end-${h.weekday}`} className="input" defaultValue={toTime(h.end)} step={900} aria-label={`${DAYS[h.weekday]} end`} />
            </div>
          </li>
        ))}
      </ul>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      {state.ok && <p className="notice" role="status">{state.ok}</p>}
      <button className="btn primary lg block" disabled={pending}>{pending ? "Saving…" : "Save hours"}</button>
    </form>
  );
}
