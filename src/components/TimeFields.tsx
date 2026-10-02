"use client";

import { useState } from "react";

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/** Time picker in 5-minute steps. Submits `name` as "HH:MM" (24-hour). */
export function TimeSelect({ name, defaultMinutes = 13 * 60, label = "Start time", idPrefix = "t" }: { name: string; defaultMinutes?: number; label?: string; idPrefix?: string }) {
  const rounded = Math.round(defaultMinutes / 5) * 5;
  const [h24, setH24] = useState(Math.floor(rounded / 60) % 24);
  const [m, setM] = useState(rounded % 60);
  const pm = h24 >= 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const set12 = (h: number, isPm: boolean) => setH24((h % 12) + (isPm ? 12 : 0));
  const value = `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return (
    <div className="field">
      <label htmlFor={`${idPrefix}-hour`}>{label}</label>
      <div className="row" style={{ gap: 6 }}>
        <select id={`${idPrefix}-hour`} className="input" aria-label="Hour" value={h12} onChange={(e) => set12(Number(e.target.value), pm)} style={{ flex: 1, padding: "0 8px" }}>
          {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="strong" aria-hidden="true">:</span>
        <select className="input" aria-label="Minutes" value={m} onChange={(e) => setM(Number(e.target.value))} style={{ flex: 1, padding: "0 8px" }}>
          {MINUTES.map((x) => <option key={x} value={x}>{String(x).padStart(2, "0")}</option>)}
        </select>
        <select className="input" aria-label="AM or PM" value={pm ? "PM" : "AM"} onChange={(e) => set12(h12, e.target.value === "PM")} style={{ flex: 1, padding: "0 8px" }}>
          <option>AM</option>
          <option>PM</option>
        </select>
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

/** 15 minutes to 3 hours, in 15-minute steps (inspections can run long). */
export const LENGTH_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1) * 15);

export function lengthLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return `${h} hr${h > 1 ? "s" : ""}${m ? ` ${m} min` : ""}`;
}

export function LengthSelect({ name = "minutes", defaultValue = 30, id = "minutes" }: { name?: string; defaultValue?: number; id?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>Length</label>
      <select id={id} name={name} className="input" defaultValue={String(defaultValue)}>
        {LENGTH_OPTIONS.map((x) => <option key={x} value={x}>{lengthLabel(x)}</option>)}
      </select>
    </div>
  );
}
