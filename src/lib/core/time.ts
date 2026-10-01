/**
 * Time helpers. Scheduling math works in "minutes after midnight" on a single
 * local day, which keeps the optimizer simple and avoids time zone mistakes.
 */

/** A free window [start, end) in minutes after midnight. */
export type Window = readonly [start: number, end: number];

export const hm = (hours: number, minutes = 0): number => hours * 60 + minutes;

/** Overlap of two lists of windows, sorted by start time. */
export function intersect(a: readonly Window[], b: readonly Window[]): Window[] {
  const out: Window[] = [];
  for (const x of a) {
    for (const y of b) {
      const s = Math.max(x[0], y[0]);
      const e = Math.min(x[1], y[1]);
      if (e > s) out.push([s, e]);
    }
  }
  return out.sort((p, q) => p[0] - q[0]);
}

/** Overlap of every participant's free windows. Empty list in = empty list out. */
export function intersectAll(lists: readonly (readonly Window[])[]): Window[] {
  if (lists.length === 0) return [];
  return lists.slice(1).reduce<Window[]>((acc, w) => intersect(acc, w), [...lists[0]]);
}

/** Remove busy blocks from a list of free windows. */
export function subtract(free: readonly Window[], busy: readonly Window[]): Window[] {
  let result: Window[] = [...free];
  for (const [bs, be] of busy) {
    const next: Window[] = [];
    for (const [fs, fe] of result) {
      if (be <= fs || bs >= fe) {
        next.push([fs, fe]);
        continue;
      }
      if (bs > fs) next.push([fs, bs]);
      if (be < fe) next.push([be, fe]);
    }
    result = next;
  }
  return result.sort((p, q) => p[0] - q[0]);
}

/** Earliest start at or after `earliest`, rounded up to `step` minutes, that fits `length`. */
export function firstFit(windows: readonly Window[], earliest: number, length: number, step = 5): number | null {
  for (const [ws, we] of windows) {
    const s = Math.ceil(Math.max(ws, earliest) / step) * step;
    if (s + length <= we) return s;
  }
  return null;
}

/** Longest overlap between any window and [s, e). */
export function overlapMinutes(windows: readonly Window[], s: number, e: number): number {
  return windows.reduce((m, [ws, we]) => Math.max(m, Math.min(we, e) - Math.max(ws, s)), 0);
}

/** 9:05 AM style label. */
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
