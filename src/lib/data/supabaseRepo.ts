import "server-only";
/** The real data layer: reads and writes Supabase. Security rules live in the database. */
import { createClient } from "@/lib/supabase/server";
import { hm, subtract, type Window } from "@/lib/core/time";
import { contractMilestones } from "@/lib/core/deadlines";
import type { Role } from "@/lib/core/access";
import type { Repo } from "./repo";
import type { AgentSummary, Client, ContactPreference, Deal, License, Listing, PortfolioItem, Profile, ShowingRequest, TourContext, WeeklyHours } from "./types";
import { dateOf, minutesOfDay, toTimestamp, weekdayOf } from "./dates";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function session() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not signed in");
  return { supabase, uid: data.user.id };
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const publicUrl = (supabase: Awaited<ReturnType<typeof createClient>>, bucket: string, path: string | null) =>
  path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;

function toAgent(p: Row | null, prefs: Row | null): AgentSummary {
  return {
    id: p?.id ?? "",
    name: p?.full_name || "Listing agent",
    phone: p?.phone ?? "",
    email: p?.email ?? "",
    brokerage: p?.brokerages?.name ?? "",
    onApp: true,
    contact: { preferred: prefs?.preferred ?? "app", textAfterCall: !!prefs?.text_after_call, onlineUrl: prefs?.online_scheduler_url ?? undefined },
  };
}

function toListing(r: Row): Listing {
  return {
    id: r.id, address: r.address, city: r.city, state: r.state, lat: r.lat ?? 41.88, lng: r.lng ?? -87.63,
    beds: Number(r.beds ?? 0), baths: Number(r.baths ?? 0), sqft: r.sqft, instantShowings: r.instant_showings,
    showingMinutes: r.showing_minutes, occupancy: r.occupancy, note: r.occupancy === "tenant" ? "Tenant-occupied" : "",
    photoUrl: r.photo_url ?? null, source: r.source === "fsbo" ? "fsbo" : r.source === "app" ? "app" : "mls",
    listingAgent: toAgent(r.agent, r.agent?.contact_preferences ?? null),
  };
}

const AGENT_FIELDS = "id, full_name, phone, email, brokerages(name), contact_preferences(*)";
const LISTING_SELECT = `*, agent:profiles!listings_listing_agent_id_fkey(${AGENT_FIELDS})`;
const REQUEST_SELECT = `*, listing:listings(address, city, photo_url, listing_agent_id, agent:profiles!listings_listing_agent_id_fkey(${AGENT_FIELDS})), requester:profiles!showing_requests_requesting_agent_id_fkey(${AGENT_FIELDS})`;

function toRequest(r: Row, uid: string): ShowingRequest {
  const sent = r.requesting_agent_id === uid;
  const typedIn = !r.listing_id;
  const other: AgentSummary = sent
    ? typedIn
      ? { id: "", name: r.manual_agent_name || "Listing agent", phone: r.manual_agent_phone ?? "", email: r.manual_agent_email ?? "", brokerage: "", onApp: false, contact: { preferred: r.manual_agent_phone ? "text" : "email", textAfterCall: false } }
      : toAgent(r.listing?.agent ?? null, r.listing?.agent?.contact_preferences ?? null)
    : toAgent(r.requester ?? null, r.requester?.contact_preferences ?? null);
  return {
    id: r.id, listingId: r.listing_id, address: r.listing?.address ?? r.manual_address ?? "", photoUrl: r.listing?.photo_url ?? null,
    otherAgent: other, otherAgentName: other.name, buyerLabel: r.buyer_label,
    startsAt: r.starts_at, endsAt: r.ends_at, status: r.status, direction: sent ? "sent" : "incoming",
    proposedStartsAt: r.proposed_starts_at, proposedEndsAt: r.proposed_ends_at, responseNote: r.response_note ?? "",
    remindedAt: r.reminded_at, reminderCount: Number(r.reminder_count ?? 0),
  };
}

export const supabaseRepo: Repo = {
  async getMe() {
    const { supabase, uid } = await session();
    const p = check(await supabase.from("profiles").select("*, brokerages(name)").eq("id", uid).single()) as Row;
    return {
      id: p.id, fullName: p.full_name, email: p.email ?? "", phone: p.phone ?? "", tagline: p.tagline ?? "", bio: p.bio ?? "",
      headshotUrl: publicUrl(supabase, "avatars", p.headshot_path), logoUrl: publicUrl(supabase, "logos", p.logo_path),
      brokerage: p.brokerages?.name ?? "", serviceAreas: p.service_areas ?? [], selfRoles: p.self_roles ?? [],
    } satisfies Profile;
  },
  async updateMe(patch) {
    const { supabase, uid } = await session();
    const row: Row = {};
    if (patch.fullName !== undefined) row.full_name = patch.fullName;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.tagline !== undefined) row.tagline = patch.tagline.slice(0, 80);
    if (patch.bio !== undefined) row.bio = patch.bio;
    if (patch.selfRoles !== undefined) row.self_roles = patch.selfRoles;
    // For uploads, headshotUrl and logoUrl carry the storage path of the new file.
    if (patch.headshotUrl !== undefined) row.headshot_path = patch.headshotUrl;
    if (patch.logoUrl !== undefined) row.logo_path = patch.logoUrl;
    row.updated_at = new Date().toISOString();
    check(await supabase.from("profiles").update(row).eq("id", uid));
  },

  async getContactPreference() {
    const { supabase, uid } = await session();
    const r = check(await supabase.from("contact_preferences").select("*").eq("profile_id", uid).maybeSingle()) as Row | null;
    return { preferred: r?.preferred ?? "app", textAfterCall: !!r?.text_after_call, onlineUrl: r?.online_scheduler_url ?? undefined } satisfies ContactPreference;
  },
  async saveContactPreference(pref) {
    const { supabase, uid } = await session();
    check(await supabase.from("contact_preferences").update({ preferred: pref.preferred, text_after_call: pref.textAfterCall, online_scheduler_url: pref.onlineUrl ?? null }).eq("profile_id", uid));
  },

  async listPortfolio() {
    const { supabase, uid } = await session();
    const rows = check(await supabase.from("portfolio_items").select("*").eq("profile_id", uid).order("created_at", { ascending: false })) as Row[];
    return rows.map((r) => ({ id: r.id, label: r.label ?? "", url: publicUrl(supabase, "portfolio", r.file_path) ?? "" }) satisfies PortfolioItem);
  },
  async addPortfolio({ file, label }) {
    const { supabase, uid } = await session();
    check(await supabase.from("portfolio_items").insert({ profile_id: uid, kind: "photo", label, file_path: file }));
  },
  async removePortfolio(id) {
    const { supabase } = await session();
    const row = check(await supabase.from("portfolio_items").select("file_path").eq("id", id).maybeSingle()) as Row | null;
    check(await supabase.from("portfolio_items").delete().eq("id", id));
    if (row?.file_path) await supabase.storage.from("portfolio").remove([row.file_path]);
  },

  async listLicenses() {
    const { supabase, uid } = await session();
    const rows = check(await supabase.from("licenses").select("*").eq("profile_id", uid).order("created_at")) as Row[];
    return rows.map((r) => ({ id: r.id, profession: r.profession, state: r.state, number: r.number, sponsor: r.sponsor ?? "", expiresOn: r.expires_on, ceHours: Number(r.ce_hours_logged), status: r.status }) satisfies License);
  },
  async addLicense(input) {
    const { supabase, uid } = await session();
    check(await supabase.from("licenses").insert({ profile_id: uid, profession: input.profession, state: input.state, number: input.number, sponsor: input.sponsor, expires_on: input.expiresOn }));
  },
  async removeLicense(id) {
    const { supabase } = await session();
    check(await supabase.from("licenses").delete().eq("id", id));
  },

  async listListings() {
    const { supabase } = await session();
    const rows = check(await supabase.from("listings").select(LISTING_SELECT).eq("status", "active").limit(200)) as Row[];
    return rows.map(toListing);
  },
  async listRequests() {
    const { supabase, uid } = await session();
    const rows = check(await supabase.from("showing_requests").select(REQUEST_SELECT).order("starts_at").limit(500)) as Row[];
    return rows.map((r) => toRequest(r, uid));
  },
  async decideRequest(id, answer) {
    const { supabase } = await session();
    const countered = answer.status === "countered";
    check(await supabase.from("showing_requests").update({
      status: answer.status,
      proposed_starts_at: countered ? answer.proposedStartsAt ?? null : null,
      proposed_ends_at: countered ? answer.proposedEndsAt ?? null : null,
      response_note: answer.note?.slice(0, 280) || null,
    }).eq("id", id));
  },
  async acceptNewTime(id) {
    const { supabase } = await session();
    const r = check(await supabase.from("showing_requests").select("proposed_starts_at, proposed_ends_at").eq("id", id).single()) as Row;
    if (!r.proposed_starts_at) return;
    check(await supabase.from("showing_requests").update({ status: "approved", starts_at: r.proposed_starts_at, ends_at: r.proposed_ends_at }).eq("id", id));
  },
  async cancelRequest(id) {
    const { supabase } = await session();
    check(await supabase.from("showing_requests").update({ status: "cancelled" }).eq("id", id));
  },
  async markReminded(id) {
    const { supabase } = await session();
    const r = check(await supabase.from("showing_requests").select("reminder_count").eq("id", id).single()) as Row;
    check(await supabase.from("showing_requests").update({ reminded_at: new Date().toISOString(), reminder_count: Number(r.reminder_count ?? 0) + 1 }).eq("id", id));
  },
  async recordAnswer(id, status) {
    const { supabase } = await session();
    check(await supabase.from("showing_requests").update({ status }).eq("id", id).is("listing_id", null));
  },
  async createRequest(input) {
    const { supabase, uid } = await session();
    // The listing side approves in the app. (Next step: auto-approve instant-showing homes in the database.)
    const row = check(await supabase.from("showing_requests").insert({
      listing_id: input.listingId ?? null, requesting_agent_id: uid, buyer_label: input.buyerLabel, client_id: input.clientId ?? null,
      starts_at: input.startsAt, ends_at: input.endsAt, method: input.method,
      manual_address: input.manual?.address ?? null, manual_agent_name: input.manual?.agentName || null,
      manual_agent_phone: input.manual?.agentPhone || null, manual_agent_email: input.manual?.agentEmail || null,
    }).select(REQUEST_SELECT).single()) as Row;
    return toRequest(row, uid);
  },
  async listClients() {
    const { supabase, uid } = await session();
    const rows = check(await supabase.from("clients").select("*").eq("agent_id", uid).order("name")) as Row[];
    return rows.map((r) => ({ id: r.id, name: r.name, phone: r.phone ?? "", email: r.email ?? "", preApproved: r.pre_approved }) satisfies Client);
  },
  async addClient(input) {
    const { supabase, uid } = await session();
    const r = check(await supabase.from("clients").insert({ agent_id: uid, name: input.name, phone: input.phone || null, email: input.email || null, pre_approved: input.preApproved }).select("*").single()) as Row;
    return { id: r.id, name: r.name, phone: r.phone ?? "", email: r.email ?? "", preApproved: r.pre_approved };
  },

  async getTourContext(date) {
    const { supabase, uid } = await session();
    const dayStart = toTimestamp(date, 0);
    const dayEnd = toTimestamp(date, 24 * 60);
    const weekday = weekdayOf(date);
    const rules = check(await supabase.from("availability_rules").select("*").eq("profile_id", uid).eq("weekday", weekday)) as Row[];
    const busy = check(await supabase.from("busy_blocks").select("*").eq("profile_id", uid).lt("starts_at", dayEnd).gt("ends_at", dayStart)) as Row[];
    const toWin = (r: Row): Window => [Math.max(0, r.starts_at < dayStart ? 0 : minutesOfDay(r.starts_at)), r.ends_at > dayEnd ? 1440 : minutesOfDay(r.ends_at)];
    const mine = subtract(rules.map((r) => [r.start_minute, r.end_minute] as Window), busy.map(toWin));
    const listings = check(await supabase.from("listings").select(LISTING_SELECT).eq("status", "active").limit(50)) as Row[];
    const windows = check(await supabase.from("listing_windows").select("*").in("listing_id", listings.map((l) => l.id)).lt("starts_at", dayEnd).gt("ends_at", dayStart)) as Row[];
    const homes = listings
      .map((l) => ({ listing: toListing(l), free: windows.filter((w) => w.listing_id === l.id && dateOf(w.starts_at) === date).map(toWin) }))
      .filter((h) => h.free.length > 0);
    return {
      date,
      clientLabel: "Your buyers",
      participants: [{ name: "You", free: rules.length ? mine : [[hm(9), hm(17)]], source: "Your hours and calendar" }],
      start: { label: "Your office", lat: 41.8819, lng: -87.6278 },
      homes,
      maxShowingsPerDay: 8,
      bufferMinutes: 5,
    } satisfies TourContext;
  },

  async listDeals() {
    const { supabase } = await session();
    const rows = check(await supabase.from("deals").select("*, deal_members(*), milestones(*), deal_tasks(*), loan_updates(*, author:profiles(full_name))").order("closing_date")) as Row[];
    return rows.map(toDeal);
  },
  async getDeal(id) {
    const { supabase } = await session();
    const row = check(await supabase.from("deals").select("*, deal_members(*), milestones(*), deal_tasks(*), loan_updates(*, author:profiles(full_name))").eq("id", id).maybeSingle()) as Row | null;
    return row ? toDeal(row) : null;
  },
  async toggleTask(dealId, taskId) {
    const { supabase } = await session();
    const t = check(await supabase.from("deal_tasks").select("done").eq("id", taskId).eq("deal_id", dealId).single()) as Row;
    check(await supabase.from("deal_tasks").update({ done: !t.done }).eq("id", taskId));
  },
  async toggleMilestone(dealId, milestoneId) {
    const { supabase } = await session();
    if (milestoneId.startsWith("calc-")) {
      // First check-off on a deal with no saved dates: save the computed dates, with this one done.
      const d = check(await supabase.from("deals").select("acceptance_date, closing_date, loan_type").eq("id", dealId).single()) as Row;
      const pick = Number(milestoneId.slice(5));
      const rows = contractMilestones({ acceptance: d.acceptance_date, closing: d.closing_date, mortgageContingencyDays: d.loan_type === "cash" ? undefined : 21 })
        .map((m, i) => ({ deal_id: dealId, kind: m.kind, label: m.label, due_date: m.due, position: i, done_at: i === pick ? new Date().toISOString() : null }));
      check(await supabase.from("milestones").insert(rows));
      return;
    }
    const m = check(await supabase.from("milestones").select("done_at").eq("id", milestoneId).eq("deal_id", dealId).single()) as Row;
    check(await supabase.from("milestones").update({ done_at: m.done_at ? null : new Date().toISOString() }).eq("id", milestoneId));
  },
  async postLoanUpdate(dealId, status, note) {
    const { supabase, uid } = await session();
    check(await supabase.from("loan_updates").insert({ deal_id: dealId, author_id: uid, status, note: note.slice(0, 280) || null }));
  },

  async getWeeklyHours() {
    const { supabase, uid } = await session();
    const rows = check(await supabase.from("availability_rules").select("*").eq("profile_id", uid)) as Row[];
    return [0, 1, 2, 3, 4, 5, 6].map((d) => {
      const r = rows.find((x) => x.weekday === d);
      return r ? { weekday: d, start: r.start_minute, end: r.end_minute, on: true } : { weekday: d, start: hm(9), end: hm(17), on: false };
    });
  },
  async saveWeeklyHours(hours) {
    const { supabase, uid } = await session();
    check(await supabase.from("availability_rules").delete().eq("profile_id", uid));
    const rows = hours.filter((h) => h.on && h.end > h.start).map((h) => ({ profile_id: uid, weekday: h.weekday, start_minute: h.start, end_minute: h.end }));
    if (rows.length) check(await supabase.from("availability_rules").insert(rows));
  },
};

function toDeal(r: Row): Deal {
  const members = (r.deal_members ?? []) as Row[];
  const client = members.find((m) => m.role === "buyer" || m.role === "seller");
  const milestones = (r.milestones ?? []).length
    ? (r.milestones as Row[]).sort((a, b) => a.due_date.localeCompare(b.due_date)).map((m) => ({ id: m.id, kind: m.kind, label: m.label, due: m.due_date, done: !!m.done_at }))
    : r.acceptance_date && r.closing_date
      ? contractMilestones({ acceptance: r.acceptance_date, closing: r.closing_date, mortgageContingencyDays: r.loan_type === "cash" ? undefined : 21 }).map((m, i) => ({ id: `calc-${i}`, kind: m.kind, label: m.label, due: m.due, done: false }))
      : [];
  return {
    id: r.id,
    address: r.property_address,
    city: "",
    side: r.side,
    stage: r.stage.replace(/_/g, " "),
    acceptanceDate: r.acceptance_date ?? "",
    closingDate: r.closing_date ?? "",
    loanType: r.loan_type ?? "",
    clientName: client?.display_name ?? "",
    members: members.map((m) => ({ role: m.role as Role, name: m.display_name, phone: m.phone ?? undefined, email: m.email ?? undefined })),
    milestones,
    tasks: ((r.deal_tasks ?? []) as Row[]).map((t) => ({ id: t.id, title: t.title, assignee: t.assignee_label ?? "", due: t.due_date, done: t.done })),
    loanUpdates: ((r.loan_updates ?? []) as Row[])
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((u) => ({ id: u.id, status: u.status, note: u.note ?? "", author: u.author?.full_name ?? "Lender", at: u.created_at })),
  };
}
