import "server-only";
import { repo } from "./index";
import { dateOf, minutesOfDay, prettyDate, toTimestamp, todayISO } from "./dates";
import { daysUntil } from "@/lib/core/deadlines";
import { upcomingAnniversaries } from "@/lib/core/remember";
import { formatClock } from "@/lib/core/time";

export interface Notice {
  id: string;
  at: string;
  icon: string;
  title: string;
  sub: string;
  href: string;
}

const when = (iso: string) => `${prettyDate(dateOf(iso), { weekday: "short", month: "short", day: "numeric" })} ${formatClock(minutesOfDay(iso))}`;

/**
 * The bell: everything new, built from what's already in REschedule
 * (requests, answers, arrivals, feedback, homes from clients, messages,
 * deal deadlines, anniversaries and reviews).
 */
export async function listNotices(): Promise<{ items: Notice[]; unread: number; seenAt: string | null; unreadMessages: number }> {
  const r = repo();
  const [me, requests, shares, threads, deals, clients, reviews] = await Promise.all([
    r.getMe(), r.listRequests(), r.listHomeShares(), r.listThreads(), r.listDeals(), r.listClients(), r.listMyReviews(),
  ]);
  const now = new Date().toISOString();
  const today = todayISO();
  const startOfToday = toTimestamp(today, 0);
  // Something set for later (a showing that hasn't happened yet) counts as today's news, not "just now".
  const cap = (iso: string) => (iso > now ? startOfToday : iso);
  const items: Notice[] = [];

  for (const x of requests) {
    if (x.direction === "incoming") {
      if (x.status === "pending") items.push({ id: `req-${x.id}`, at: x.createdAt, icon: "🏠", title: `${x.otherAgentName} asked to show ${x.address}`, sub: when(x.startsAt), href: "/showings?show=pending" });
      if (x.arrivedAt) items.push({ id: `arr-${x.id}`, at: x.arrivedAt, icon: "📍", title: `${x.otherAgentName} arrived at ${x.address}`, sub: x.buyerLabel, href: "/showings" });
      if (x.lateEta && x.status === "approved") items.push({ id: `late-${x.id}`, at: cap(x.startsAt), icon: "⏱", title: `${x.otherAgentName} is running late to ${x.address}`, sub: `New ETA ${formatClock(minutesOfDay(x.lateEta))}`, href: "/showings" });
      if (x.feedback) items.push({ id: `fb-${x.id}`, at: cap(x.endsAt), icon: "★", title: `Feedback on ${x.address}`, sub: `${"★".repeat(x.feedback.rating)} from ${x.otherAgentName}`, href: "/showings" });
    } else if (x.decidedAt && (x.status === "approved" || x.status === "declined" || x.status === "countered")) {
      const verb = x.status === "approved" ? "confirmed" : x.status === "declined" ? "denied" : "suggested a new time for";
      items.push({ id: `ans-${x.id}-${x.status}`, at: x.decidedAt, icon: x.status === "approved" ? "✓" : x.status === "declined" ? "✕" : "↻", title: `${x.otherAgentName} ${verb} ${x.address}`, sub: `${x.buyerLabel} · ${when(x.startsAt)}${x.responseNote ? ` · "${x.responseNote}"` : ""}`, href: `/showings?tab=sent&show=${x.status}` });
    }
  }
  for (const h of shares.filter((s) => !s.seen)) items.push({ id: `share-${h.id}`, at: h.createdAt, icon: "💌", title: `${h.clientName} sent you a home`, sub: h.address || h.url, href: "/showings?tab=shared" });
  for (const t of threads.filter((t) => t.unread > 0)) items.push({ id: `msg-${t.withId}-${t.lastAt}`, at: t.lastAt, icon: "💬", title: `${t.unread} new message${t.unread > 1 ? "s" : ""} from ${t.withName}`, sub: t.last, href: `/messages/${t.withId}` });
  for (const d of deals) {
    for (const m of d.milestones.filter((m) => !m.done)) {
      const days = daysUntil(today, m.due);
      if (days >= 0 && days <= 2) items.push({ id: `due-${m.id}-${today}`, at: startOfToday, icon: "📅", title: `${days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : "Due in 2 days"}: ${m.label}`, sub: d.address, href: `/deals/${d.id}?tab=dates` });
      else if (days < 0 && days >= -3) items.push({ id: `late-${m.id}-${today}`, at: startOfToday, icon: "⚠", title: `Not checked off: ${m.label} (due ${prettyDate(m.due, { month: "short", day: "numeric" })})`, sub: d.address, href: `/deals/${d.id}?tab=dates` });
    }
  }
  for (const a of upcomingAnniversaries(clients, today, 7)) items.push({ id: `ann-${a.client.id}-${a.date}`, at: startOfToday, icon: "🎉", title: `${a.client.name}'s ${a.years}-year home anniversary ${a.daysAway === 0 ? "is today" : `is in ${a.daysAway} day${a.daysAway > 1 ? "s" : ""}`}`, sub: "Send a note from REmember", href: "/remember" });
  for (const v of reviews.slice(0, 5)) items.push({ id: `rev-${v.at}`, at: v.at, icon: "⭐", title: `${v.name} left you a ${v.stars}-star review`, sub: v.body.slice(0, 80), href: "/profile#reviews" });

  items.sort((a, b) => b.at.localeCompare(a.at));
  const seenAt = me.notificationsSeenAt;
  const unread = items.filter((i) => !seenAt || i.at > seenAt).length;
  return { items: items.slice(0, 60), unread, seenAt, unreadMessages: threads.reduce((n, t) => n + t.unread, 0) };
}
