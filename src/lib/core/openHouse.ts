/**
 * REveal: when a new listing gets a burst of showing requests, suggest the
 * open house time that fits the most requesting agents while the seller is free.
 */
import { overlapMinutes, type Window } from "./time";

export interface OpenHouseRequest {
  agentId: string;
  /** Free windows by day key, e.g. { "2026-10-03": [[600, 720]] }. */
  free: Record<string, readonly Window[]>;
}

export interface OpenHouseOptions {
  days: string[];
  seller: Record<string, readonly Window[]>;
  lengthMinutes: number;
  /** A requester "fits" if they can be there at least this long. */
  minVisitMinutes?: number;
  /** Candidate start times step. */
  stepMinutes?: number;
  dayStart?: number;
  dayEnd?: number;
}

export interface OpenHouseSlot {
  day: string;
  start: number;
  end: number;
  fits: string[];
  misses: string[];
}

/** Minimum requests before the app suggests an open house. */
export const OPEN_HOUSE_TRIGGER = 5;

export function suggestOpenHouse(requests: readonly OpenHouseRequest[], opts: OpenHouseOptions, top = 3): OpenHouseSlot[] {
  const step = opts.stepMinutes ?? 30;
  const minVisit = opts.minVisitMinutes ?? 45;
  const dayStart = opts.dayStart ?? 9 * 60;
  const dayEnd = opts.dayEnd ?? 17 * 60;
  const slots: OpenHouseSlot[] = [];
  for (const day of opts.days) {
    const sellerFree = opts.seller[day] ?? [];
    for (let s = dayStart; s + opts.lengthMinutes <= dayEnd; s += step) {
      const e = s + opts.lengthMinutes;
      if (!sellerFree.some(([ws, we]) => ws <= s && we >= e)) continue;
      const fits: string[] = [];
      const misses: string[] = [];
      for (const r of requests) (overlapMinutes(r.free[day] ?? [], s, e) >= minVisit ? fits : misses).push(r.agentId);
      slots.push({ day, start: s, end: e, fits, misses });
    }
  }
  return slots
    .sort((a, b) => b.fits.length - a.fits.length || opts.days.indexOf(a.day) - opts.days.indexOf(b.day) || a.start - b.start)
    .slice(0, top);
}
