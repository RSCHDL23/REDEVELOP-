import "server-only";
/** The real data layer: reads and writes Supabase. Security rules live in the database. */
import { createClient } from "@/lib/supabase/server";
import { hm, subtract, type Window } from "@/lib/core/time";
import { contractMilestones } from "@/lib/core/deadlines";
import type { Role } from "@/lib/core/access";
import type { PublicProfile, Repo } from "./repo";
import type { AgentSummary, Client, ClientStage, ContactPreference, Deal, License, Listing, PortfolioItem, Profile, ShowingRequest, TourContext, WeeklyHours } from "./types";
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
    contact: { preferred: prefs?.methods?.[0] ?? prefs?.preferred ?? "app", methods: prefs?.methods?.length ? prefs.methods : [prefs?.preferred ?? "app"], textAfterCall: !!prefs?.text_after_call, onlineUrl: prefs?.online_scheduler_url ?? undefined },
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
const REQUEST_SELECT = `*, feedback:showing_feedback(*), listing:listings(address, city, state, beds, baths, sqft, lat, lng, photo_url, listing_agent_id, agent:profiles!listings_listing_agent_id_fkey(${AGENT_FIELDS})), requester:profiles!showing_requests_requesting_agent_id_fkey(${AGENT_FIELDS})`;

function toRequest(r: Row, uid: string): ShowingRequest {
  const sent = r.requesting_agent_id === uid;
  const typedIn = !r.listing_id;
  const other: AgentSummary = sent
    ? typedIn
      ? { id: "", name: r.manual_agent_name || "Listing agent", phone: r.manual_agent_phone ?? "", email: r.manual_agent_email ?? "", brokerage: "", onApp: false, contact: { preferred: r.manual_agent_phone ? "text" : "email", methods: r.manual_agent_phone ? ["text", "email"] : ["email"], textAfterCall: false } }
      : toAgent(r.listing?.agent ?? null, r.listing?.agent?.contact_preferences ?? null)
    : toAgent(r.requester ?? null, r.requester?.contact_preferences ?? null);
  return {
    id: r.id, listingId: r.listing_id, address: r.listing?.address ?? r.manual_address ?? "", photoUrl: r.listing?.photo_url ?? null,
    otherAgent: other, otherAgentName: other.name, buyerLabel: r.buyer_label,
    startsAt: r.starts_at, endsAt: r.ends_at, status: r.status, direction: sent ? "sent" : "incoming",
    proposedStartsAt: r.proposed_starts_at, proposedEndsAt: r.proposed_ends_at, responseNote: r.response_note ?? "",
    remindedAt: r.reminded_at, reminderCount: Number(r.reminder_count ?? 0),
    comments: r.comments ?? "", arrivedAt: r.arrived_at ?? null, lateEta: r.late_eta ?? null, clientId: r.client_id ?? null,
    feedback: toFeedback(Array.isArray(r.feedback) ? r.feedback[0] : r.feedback),
    home: {
      address: r.listing?.address ?? r.manual_address ?? "", city: r.listing ? `${r.listing.city}, ${r.listing.state}` : "",
      photoUrl: r.listing?.photo_url ?? null, beds: r.listing?.beds ?? null, baths: r.listing?.baths ?? null, sqft: r.listing?.sqft ?? null,
      lat: r.listing?.lat ?? null, lng: r.listing?.lng ?? null,
    },
  };
}

function toFeedback(f: Row | null | undefined) {
  if (!f) return null;
  return { rating: Number(f.overall ?? 0), interest: f.interest ?? "maybe", nextStep: f.next_step ?? "none", comments: f.comments ?? "", questions: f.questions ?? "" };
}

function toClient(r: Row): Client {
  return {
    id: r.id, name: r.name, phone: r.phone ?? "", email: r.email ?? "", preApproved: r.pre_approved,
    stage: r.stage ?? "present", source: r.source ?? "manual", intent: r.intent ?? "", notes: r.notes ?? "", createdAt: r.created_at,
    closedOn: r.closed_on ?? null, remember: r.remember ?? true, reviewToken: r.review_token, reviewRequestedAt: r.review_requested_at ?? null,
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
      slug: p.slug ?? "", websites: Array.isArray(p.websites) ? p.websites : [], mapApp: p.map_app ?? "google",
      mlsAgentId: p.mls_agent_id ?? "", idInMessages: p.id_in_messages ?? "license",
      home: p.home_address ? { address: p.home_address, lat: p.home_lat, lng: p.home_lng } : null,
      office: p.office_address ? { address: p.office_address, lat: p.office_lat, lng: p.office_lng } : null,
      reviewLinks: Array.isArray(p.review_links) ? p.review_links : [], rememberAuto: p.remember_auto ?? true, rememberChannel: p.remember_channel ?? "text",
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
    if (patch.websites !== undefined) row.websites = patch.websites.slice(0, 8);
    if (patch.mapApp !== undefined) row.map_app = patch.mapApp;
    if (patch.mlsAgentId !== undefined) row.mls_agent_id = patch.mlsAgentId || null;
    if (patch.idInMessages !== undefined) row.id_in_messages = patch.idInMessages;
    if (patch.home !== undefined) Object.assign(row, { home_address: patch.home?.address ?? null, home_lat: patch.home?.lat ?? null, home_lng: patch.home?.lng ?? null });
    if (patch.office !== undefined) Object.assign(row, { office_address: patch.office?.address ?? null, office_lat: patch.office?.lat ?? null, office_lng: patch.office?.lng ?? null });
    if (patch.reviewLinks !== undefined) row.review_links = patch.reviewLinks.slice(0, 8);
    if (patch.rememberAuto !== undefined) row.remember_auto = patch.rememberAuto;
    if (patch.rememberChannel !== undefined) row.remember_channel = patch.rememberChannel;
    // For uploads, headshotUrl and logoUrl carry the storage path of the new file.
    if (patch.headshotUrl !== undefined) row.headshot_path = patch.headshotUrl;
    if (patch.logoUrl !== undefined) row.logo_path = patch.logoUrl;
    row.updated_at = new Date().toISOString();
    check(await supabase.from("profiles").update(row).eq("id", uid));
  },

  async getContactPreference() {
    const { supabase, uid } = await session();
    const r = check(await supabase.from("contact_preferences").select("*").eq("profile_id", uid).maybeSingle()) as Row | null;
    const methods = r?.methods?.length ? r.methods : [r?.preferred ?? "app"];
    return { preferred: methods[0], methods, textAfterCall: !!r?.text_after_call, onlineUrl: r?.online_scheduler_url ?? undefined } satisfies ContactPreference;
  },
  async saveContactPreference(pref) {
    const { supabase, uid } = await session();
    check(await supabase.from("contact_preferences").update({ preferred: pref.methods[0] ?? pref.preferred, methods: pref.methods, text_after_call: pref.textAfterCall, online_scheduler_url: pref.onlineUrl ?? null }).eq("profile_id", uid));
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
      comments: input.comments?.slice(0, 500) || null,
    }).select(REQUEST_SELECT).single()) as Row;
    if (input.clientId) await supabase.from("clients").update({ stage: "present" }).eq("id", input.clientId).eq("stage", "future");
    return toRequest(row, uid);
  },
  async markArrived(id) {
    const { supabase } = await session();
    check(await supabase.from("showing_requests").update({ arrived_at: new Date().toISOString() }).eq("id", id));
  },
  async submitFeedback(id, f) {
    const { supabase, uid } = await session();
    check(await supabase.from("showing_feedback").upsert({
      request_id: id, buyer_agent_id: uid, overall: f.rating, interest: f.interest, next_step: f.nextStep,
      comments: f.comments.slice(0, 1000) || null, questions: f.questions.slice(0, 500) || null, status: "sent",
    }, { onConflict: "request_id" }));
  },
  async listClients() {
    const { supabase, uid } = await session();
    const rows = check(await supabase.from("clients").select("*").eq("agent_id", uid).order("name")) as Row[];
    return rows.map(toClient);
  },
  async addClient(input) {
    const { supabase, uid } = await session();
    const r = check(await supabase.from("clients").insert({
      agent_id: uid, name: input.name, phone: input.phone || null, email: input.email || null, pre_approved: input.preApproved,
      stage: input.stage ?? "present", notes: input.notes || null, intent: input.intent || null,
    }).select("*").single()) as Row;
    return toClient(r);
  },
  async setClientStage(id, stage: ClientStage) {
    const { supabase } = await session();
    check(await supabase.from("clients").update({ stage }).eq("id", id));
  },
  async getPublicProfile(slug) {
    // Works without signing in: the database function returns only safe fields.
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("public_profile", { p_slug: slug });
    if (error || !data) return null;
    const p = data as Row;
    return {
      slug: p.slug, fullName: p.full_name, tagline: p.tagline ?? "", bio: p.bio ?? "", phone: p.phone ?? "", email: p.email ?? "",
      headshotUrl: publicUrl(supabase, "avatars", p.headshot_path), logoUrl: publicUrl(supabase, "logos", p.logo_path),
      brokerage: p.brokerage ?? "", websites: p.websites ?? [], licenses: p.licenses ?? [],
      reviews: await (async () => {
        const { data: rv } = await supabase.rpc("public_client_reviews", { p_slug: slug });
        return ((rv as Row[] | null) ?? []).map((x) => ({ name: x.name, stars: x.stars, body: x.body ?? "", at: x.at }));
      })(),
    } satisfies PublicProfile;
  },
  async editRequest(id, input) {
    const { supabase } = await session();
    const cur = check(await supabase.from("showing_requests").select("starts_at, ends_at").eq("id", id).single()) as Row;
    const timeChanged = new Date(cur.starts_at).getTime() !== new Date(input.startsAt).getTime() || new Date(cur.ends_at).getTime() !== new Date(input.endsAt).getTime();
    // A new time goes back to Pending; the database clears any suggested time.
    check(await supabase.from("showing_requests").update({
      starts_at: input.startsAt, ends_at: input.endsAt, comments: input.comments.slice(0, 500) || null,
      ...(timeChanged ? { status: "pending" } : {}),
    }).eq("id", id));
  },
  async setLateEta(id, eta) {
    const { supabase } = await session();
    check(await supabase.from("showing_requests").update({ late_eta: eta }).eq("id", id));
  },
  async updateClient(id, patch) {
    const { supabase } = await session();
    const row: Row = {};
    if (patch.closedOn !== undefined) row.closed_on = patch.closedOn;
    if (patch.remember !== undefined) row.remember = patch.remember;
    if (patch.notes !== undefined) row.notes = patch.notes || null;
    if (patch.phone !== undefined) row.phone = patch.phone || null;
    if (patch.email !== undefined) row.email = patch.email || null;
    check(await supabase.from("clients").update(row).eq("id", id));
  },
  async markReviewRequested(clientId) {
    const { supabase } = await session();
    check(await supabase.from("clients").update({ review_requested_at: new Date().toISOString() }).eq("id", clientId));
  },
  async listMyReviews() {
    const { supabase, uid } = await session();
    const rows = check(await supabase.from("client_reviews").select("*").eq("agent_id", uid).order("created_at", { ascending: false })) as Row[];
    return rows.map((r) => ({ name: r.display_name, stars: r.stars, body: r.body ?? "", at: r.created_at }));
  },
  async getReviewTarget(token) {
    if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
    const supabase = await createClient();
    const { data } = await supabase.rpc("review_target", { p_token: token });
    if (!data) return null;
    const t = data as Row;
    return { agentName: t.agent_name, slug: t.slug, clientFirst: t.client_first, already: !!t.already, reviewLinks: Array.isArray(t.review_links) ? t.review_links : [] };
  },
  async submitReview(token, input) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("submit_review", { p_token: token, p_name: input.name, p_stars: input.stars, p_body: input.body });
    if (error) throw new Error(error.message);
  },
  async connectToPro(slug, input) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("connect_to_pro", { p_slug: slug, p_name: input.name, p_phone: input.phone, p_email: input.email, p_intent: input.intent, p_consent: true });
    if (error) throw new Error(error.message);
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
    const { supabase, uid } = await session();
    const rows = check(await supabase.from("deals").select("*, deal_members(*), milestones(*), deal_tasks(*), loan_updates(*, author:profiles(full_name))").order("closing_date")) as Row[];
    return rows.map((r) => toDeal(r, uid));
  },
  async getDeal(id) {
    const { supabase, uid } = await session();
    const row = check(await supabase.from("deals").select("*, deal_members(*), milestones(*), deal_tasks(*), loan_updates(*, author:profiles(full_name))").eq("id", id).maybeSingle()) as Row | null;
    return row ? toDeal(row, uid) : null;
  },
  async createDeal(input) {
    const { supabase, uid } = await session();
    const me = check(await supabase.from("profiles").select("full_name, phone, email").eq("id", uid).single()) as Row;
    const client = input.clientId ? (check(await supabase.from("clients").select("*").eq("id", input.clientId).maybeSingle()) as Row | null) : null;
    const deal = check(await supabase.from("deals").insert({
      property_address: input.address, city: input.city, side: input.side, acceptance_date: input.acceptanceDate, closing_date: input.closingDate,
      loan_type: input.loanType, created_by: uid, client_id: input.clientId ?? null, has_hoa: input.hasHoa,
    }).select("id").single()) as Row;
    const agentRole = input.side === "seller" ? "listing_agent" : "buyers_agent";
    check(await supabase.from("deal_members").insert([
      { deal_id: deal.id, profile_id: uid, role: agentRole, display_name: me.full_name, phone: me.phone, email: me.email },
      { deal_id: deal.id, profile_id: null, role: input.side === "seller" ? "seller" : "buyer", display_name: input.clientName, phone: client?.phone ?? null, email: client?.email ?? null },
    ]));
    check(await supabase.from("milestones").insert(input.milestones.map((m, i) => ({ deal_id: deal.id, kind: m.kind, label: m.label, due_date: m.due, position: i }))));
    if (input.clientId) await supabase.from("clients").update({ stage: "present" }).eq("id", input.clientId).eq("stage", "future");
    return deal.id as string;
  },
  async setMilestoneDate(dealId, milestoneId, due) {
    const { supabase } = await session();
    let kind: string;
    if (milestoneId.startsWith("calc-")) {
      // Save the computed dates first, with this one changed.
      const d = check(await supabase.from("deals").select("acceptance_date, closing_date, loan_type").eq("id", dealId).single()) as Row;
      const pick = Number(milestoneId.slice(5));
      const list = contractMilestones({ acceptance: d.acceptance_date, closing: d.closing_date, mortgageContingencyDays: d.loan_type === "cash" ? undefined : 21 });
      kind = list[pick]?.kind ?? "";
      check(await supabase.from("milestones").insert(list.map((m, i) => ({ deal_id: dealId, kind: m.kind, label: m.label, due_date: i === pick ? due : m.due, position: i }))));
    } else {
      const m = check(await supabase.from("milestones").update({ due_date: due }).eq("id", milestoneId).eq("deal_id", dealId).select("kind").single()) as Row;
      kind = m.kind;
    }
    if (kind === "closing") check(await supabase.from("deals").update({ closing_date: due }).eq("id", dealId));
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
    const m = check(await supabase.from("milestones").select("done_at, kind").eq("id", milestoneId).eq("deal_id", dealId).single()) as Row;
    check(await supabase.from("milestones").update({ done_at: m.done_at ? null : new Date().toISOString() }).eq("id", milestoneId));
    if (m.kind === "closing") {
      // Closing day: the client moves to Past (or back, if un-checked).
      const d = check(await supabase.from("deals").select("client_id").eq("id", dealId).single()) as Row;
      const due = check(await supabase.from("milestones").select("due_date").eq("id", milestoneId).single()) as Row;
      if (d.client_id) await supabase.from("clients").update({ stage: m.done_at ? "present" : "past", closed_on: m.done_at ? null : due.due_date }).eq("id", d.client_id);
    }
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

function toDeal(r: Row, uid: string): Deal {
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
    city: r.city ?? "",
    side: r.side,
    stage: r.stage.replace(/_/g, " "),
    acceptanceDate: r.acceptance_date ?? "",
    closingDate: r.closing_date ?? "",
    loanType: r.loan_type ?? "",
    clientName: client?.display_name ?? "",
    clientId: r.client_id ?? null,
    hasHoa: !!r.has_hoa,
    members: members.map((m) => ({ role: m.role as Role, name: m.display_name, phone: m.phone ?? undefined, email: m.email ?? undefined, isYou: m.profile_id === uid })),
    milestones,
    tasks: ((r.deal_tasks ?? []) as Row[]).map((t) => ({ id: t.id, title: t.title, assignee: t.assignee_label ?? "", due: t.due_date, done: t.done })),
    loanUpdates: ((r.loan_updates ?? []) as Row[])
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((u) => ({ id: u.id, status: u.status, note: u.note ?? "", author: u.author?.full_name ?? "Lender", at: u.created_at })),
  };
}
