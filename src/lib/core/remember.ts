/**
 * REmember: home anniversaries for past clients.
 * Each year on the closing date, the agent sends a message and/or a post.
 */
import { daysUntil, type ISODate } from "./deadlines";

export interface Anniversary<T> {
  client: T;
  date: ISODate;
  years: number;
  daysAway: number;
}

/** This year's (or next year's) anniversary date for a closing date. Feb 29 becomes Feb 28 in other years. */
export function nextAnniversary(closedOn: ISODate, today: ISODate): { date: ISODate; years: number } {
  const [cy, cm, cd] = closedOn.split("-").map(Number);
  const ty = Number(today.slice(0, 4));
  const make = (y: number) => {
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const day = cm === 2 && cd === 29 && !leap ? 28 : cd;
    return `${y}-${String(cm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  let y = Math.max(ty, cy + 1);
  if (make(y) < today) y += 1;
  return { date: make(y), years: y - cy };
}

export function upcomingAnniversaries<T extends { closedOn: ISODate | null; remember: boolean }>(clients: T[], today: ISODate, withinDays = 60): Anniversary<T>[] {
  return clients
    .filter((c) => c.closedOn && c.remember)
    .map((c) => {
      const { date, years } = nextAnniversary(c.closedOn!, today);
      return { client: c, date, years, daysAway: daysUntil(today, date) };
    })
    .filter((a) => a.daysAway >= 0 && a.daysAway <= withinDays)
    .sort((a, b) => a.daysAway - b.daysAway);
}

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`;

export function anniversaryMessage(o: { clientFirst: string; years: number; agentName: string; agentPhone: string }): string {
  return `Happy ${ordinal(o.years)} home anniversary, ${o.clientFirst}! 🏡🎉 It feels like yesterday we got the keys. I hope your home is full of great memories. If you ever need a contractor, a home value update or have friends thinking of moving, I'm always here. ${o.agentName} ${o.agentPhone}`;
}
