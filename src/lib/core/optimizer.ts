/**
 * REroute: the one-tap tour scheduler.
 *
 * Given everyone's free time (agent, buyers, and each home's listing agent,
 * seller and tenants) and drive times between homes, it finds the order and
 * start times that:
 *   1. fit the most homes,
 *   2. then finish earliest,
 *   3. then drive the least.
 *
 * Up to 9 homes it checks every possible order (exact). Above that it uses a
 * fast nearest-feasible-home heuristic so it still answers instantly.
 */
import { firstFit, intersect, type Window } from "./time";

export interface TourHome {
  id: string;
  /** When this home can be shown: listing agent, seller and tenants already combined. */
  free: readonly Window[];
  /** Minutes at this home. Defaults to the tour's showing length. */
  minutes?: number;
}

export interface TourInput {
  homes: readonly TourHome[];
  /** Time when the agent and all buyers are free (already combined). */
  party: readonly Window[];
  /** drive[a][b] in minutes. Must include `start` and every home id. */
  drive: Readonly<Record<string, Readonly<Record<string, number>>>>;
  /** Where the tour starts, e.g. "office". */
  start: string;
  /** Earliest the agent can leave the start point (minutes after midnight). */
  departAfter: number;
  /** Default minutes at each home. */
  showingMinutes: number;
  /** Extra minutes between homes for parking and walking in. */
  bufferMinutes: number;
  /** Optional cap on stops (from the agent's "showings per day" rule). */
  maxStops?: number;
}

export interface TourStop {
  homeId: string;
  start: number;
  end: number;
  driveMinutes: number;
  /** Minutes waiting after arriving, before the showing can start. */
  waitMinutes: number;
}

export interface TourPlan {
  stops: TourStop[];
  skipped: string[];
  end: number;
  driveTotal: number;
  /** When to leave the start point to make the first showing. */
  leaveAt: number | null;
}

const EXACT_LIMIT = 9;

function better(a: TourPlan, b: TourPlan | null): boolean {
  if (!b) return true;
  if (a.stops.length !== b.stops.length) return a.stops.length > b.stops.length;
  if (a.end !== b.end) return a.end < b.end;
  return a.driveTotal < b.driveTotal;
}

function finalize(input: TourInput, stops: TourStop[], driveTotal: number): TourPlan {
  const used = new Set(stops.map((s) => s.homeId));
  const first = stops[0];
  return {
    stops,
    skipped: input.homes.filter((h) => !used.has(h.id)).map((h) => h.id),
    end: stops.length ? stops[stops.length - 1].end : input.departAfter,
    driveTotal,
    leaveAt: first ? first.start - first.waitMinutes - first.driveMinutes : null,
  };
}

function tryVisit(input: TourInput, at: string, time: number, isFirst: boolean, home: TourHome, windowsFor: Map<string, Window[]>) {
  const d = input.drive[at]?.[home.id];
  if (d === undefined) throw new Error(`Missing drive time from ${at} to ${home.id}`);
  const length = home.minutes ?? input.showingMinutes;
  const arrive = time + d + (isFirst ? 0 : input.bufferMinutes);
  const start = firstFit(windowsFor.get(home.id) ?? [], arrive, length);
  if (start === null) return null;
  return { stop: { homeId: home.id, start, end: start + length, driveMinutes: d, waitMinutes: start - arrive } satisfies TourStop };
}

export function planTour(input: TourInput): TourPlan {
  const maxStops = input.maxStops ?? Infinity;
  const windowsFor = new Map(input.homes.map((h) => [h.id, intersect(input.party, h.free)]));
  // Homes that can never fit are skipped up front.
  const candidates = input.homes.filter((h) => (windowsFor.get(h.id) ?? []).some(([s, e]) => e - s >= (h.minutes ?? input.showingMinutes)));

  if (candidates.length <= EXACT_LIMIT) {
    let best: TourPlan | null = null;
    const walk = (at: string, time: number, used: Set<string>, stops: TourStop[], driveTotal: number) => {
      const plan = finalize(input, stops, driveTotal);
      if (better(plan, best)) best = plan;
      if (stops.length >= maxStops) return;
      // Bound: even visiting every remaining home cannot beat the best count.
      if (best && stops.length + (candidates.length - used.size) < best.stops.length) return;
      for (const home of candidates) {
        if (used.has(home.id)) continue;
        const r = tryVisit(input, at, time, stops.length === 0, home, windowsFor);
        if (!r) continue;
        used.add(home.id);
        walk(home.id, r.stop.end, used, [...stops, r.stop], driveTotal + r.stop.driveMinutes);
        used.delete(home.id);
      }
    };
    walk(input.start, input.departAfter, new Set(), [], 0);
    return best ?? finalize(input, [], 0);
  }

  // Heuristic for big tours: repeatedly go to the home we can start soonest.
  const stops: TourStop[] = [];
  const used = new Set<string>();
  let at = input.start;
  let time = input.departAfter;
  let driveTotal = 0;
  while (stops.length < maxStops) {
    let pick: TourStop | null = null;
    for (const home of candidates) {
      if (used.has(home.id)) continue;
      const r = tryVisit(input, at, time, stops.length === 0, home, windowsFor);
      if (r && (!pick || r.stop.start < pick.start || (r.stop.start === pick.start && r.stop.driveMinutes < pick.driveMinutes))) pick = r.stop;
    }
    if (!pick) break;
    stops.push(pick);
    used.add(pick.homeId);
    driveTotal += pick.driveMinutes;
    at = pick.homeId;
    time = pick.end;
  }
  return finalize(input, stops, driveTotal);
}
