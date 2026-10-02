import "server-only";
/**
 * Demo mode: sample data kept in memory so the app works before Supabase is
 * set up. Changes last until the server restarts.
 */
import { contractMilestones, addDays } from "@/lib/core/deadlines";
import { hm, subtract, type Window } from "@/lib/core/time";
import type { Repo } from "./repo";
import type { AgentSummary, Client, ContactPreference, Deal, License, Listing, PortfolioItem, Profile, ShowingRequest, WeeklyHours } from "./types";
import type { PublicProfile } from "./repo";
import { nextSaturday, todayISO, toTimestamp, weekdayOf } from "./dates";

const agent = (id: string, name: string, phone: string, preferred: AgentSummary["contact"]["preferred"], extra: Partial<AgentSummary> = {}): AgentSummary => ({
  id, name, phone, email: `${name.split(" ")[0].toLowerCase()}@example.com`, brokerage: "[Brokerage]", onApp: preferred === "app",
  contact: { preferred, methods: [preferred], textAfterCall: preferred === "call" }, ...extra,
});

const snapshot = (l: Listing) => ({ address: l.address, city: `${l.city}, ${l.state}`, photoUrl: l.photoUrl, beds: l.beds, baths: l.baths, sqft: l.sqft });

const ME_ID = "demo-donna";
const DEAL_CLIENTS: Record<string, string> = { "Ana Price": "c-price", "The Sandovals": "c-sandoval", "The Greens": "c-greens", "Tasha Greene": "c-greene", "Grace & Tom Ward": "c-ward" };

interface Store {
  me: Profile;
  contact: ContactPreference;
  portfolio: PortfolioItem[];
  licenses: License[];
  listings: Listing[];
  requests: ShowingRequest[];
  clients: Client[];
  deals: Deal[];
  hours: WeeklyHours[];
  homeWindows: Record<string, Window[]>;
}

function seed(): Store {
  const today = todayISO();
  const sat = nextSaturday(today);
  const me: AgentSummary = agent(ME_ID, "Donna White", "(708) 555-0123", "app", { brokerage: "D. White Realty" });
  const listings: Listing[] = [
    { id: "sem", photoUrl: "/demo/homes/sem.svg", source: "mls", address: "3315 N Seminary Ave", city: "Chicago", state: "IL", lat: 41.9415, lng: -87.6566, beds: 3, baths: 2, sqft: 1800, instantShowings: false, showingMinutes: 30, occupancy: "owner", note: "Seller out 10 to 1", listingAgent: agent("cruz", "Alana Cruz", "(312) 555-0141", "text", { onApp: true }) },
    { id: "gra", photoUrl: "/demo/homes/gra.svg", source: "mls", address: "1340 W Granville Ave #3", city: "Chicago", state: "IL", lat: 41.9945, lng: -87.6625, beds: 3, baths: 2, sqft: 1400, instantShowings: true, showingMinutes: 30, occupancy: "owner", note: "Condo hours 10 to 12 and 3 to 5", listingAgent: agent("haddad", "Omar Haddad", "(773) 555-0102", "online", { contact: { preferred: "online", methods: ["online", "text"], textAfterCall: false, onlineUrl: "https://example.com/schedule/omar" } }) },
    { id: "her", photoUrl: "/demo/homes/her.svg", source: "mls", address: "4417 N Hermitage Ave", city: "Chicago", state: "IL", lat: 41.9615, lng: -87.6735, beds: 3, baths: 2, sqft: 1650, instantShowings: false, showingMinutes: 30, occupancy: "owner", note: "Seller home until 1", listingAgent: agent("novak", "Chris Novak", "(773) 555-0188", "call") },
    { id: "gid", photoUrl: "/demo/homes/gid.svg", source: "mls", address: "2519 W Giddings St", city: "Chicago", state: "IL", lat: 41.9685, lng: -87.6905, beds: 3, baths: 2, sqft: 1500, instantShowings: true, showingMinutes: 30, occupancy: "vacant", note: "Vacant, lockbox", listingAgent: agent("patel", "Nina Patel", "(312) 555-0177", "app") },
    { id: "elm", photoUrl: "/demo/homes/elm.svg", source: "mls", address: "1029 Elmwood Ave", city: "Evanston", state: "IL", lat: 42.0405, lng: -87.6825, beds: 3, baths: 2, sqft: 1700, instantShowings: false, showingMinutes: 30, occupancy: "tenant", note: "Tenant blocks 12 to 2", listingAgent: agent("tran", "Kevin Tran", "(847) 555-0119", "email", { contact: { preferred: "email", methods: ["email", "text"], textAfterCall: false } }) },
    { id: "maple", photoUrl: "/demo/homes/maple.svg", source: "mls", address: "418 Maple Ave", city: "Oak Park", state: "IL", lat: 41.8805, lng: -87.7975, beds: 3, baths: 2, sqft: 1600, instantShowings: false, showingMinutes: 30, occupancy: "owner", note: "Your listing", listingAgent: me },
    { id: "leland", photoUrl: "/demo/homes/leland.svg", source: "mls", address: "2840 W Leland Ave", city: "Chicago", state: "IL", lat: 41.9665, lng: -87.6985, beds: 6, baths: 3, sqft: 3200, instantShowings: false, showingMinutes: 45, occupancy: "tenant", note: "Your listing · 3-flat", listingAgent: me },
  ];
  const homeWindows: Record<string, Window[]> = {
    sem: [[hm(10), hm(13)]],
    gra: [[hm(10), hm(12)], [hm(15), hm(17)]],
    her: [[hm(13), hm(15)]],
    gid: [[hm(9), hm(17)]],
    elm: [[hm(11), hm(12)], [hm(14), hm(16)]],
  };
  const askers: Record<string, AgentSummary> = {
    bell: agent("bell", "Marcus Bell", "(630) 555-0150", "app"),
    lee: agent("lee", "Jordan Lee", "(773) 555-0164", "text"),
    shah: agent("shah", "Priya Shah", "(312) 555-0129", "app"),
  };
  const clientIds: Record<string, string> = { "Maria & Luis Alvarez": "c-alvarez", "Ana Price": "c-price", "The Greens": "c-greens" };
  const req = (id: string, listingId: string, other: AgentSummary | null, buyer: string, date: string, start: number, len: number, direction: ShowingRequest["direction"], status: ShowingRequest["status"] = "pending", extra: Partial<ShowingRequest> = {}): ShowingRequest => {
    const l = listings.find((x) => x.id === listingId)!;
    const who = other ?? l.listingAgent;
    return {
      id, listingId, address: l.address, photoUrl: l.photoUrl, otherAgent: who, otherAgentName: who.name, buyerLabel: buyer,
      startsAt: toTimestamp(date, start), endsAt: toTimestamp(date, start + len), status, direction,
      proposedStartsAt: null, proposedEndsAt: null, responseNote: "", remindedAt: null, reminderCount: 0,
      comments: "", arrivedAt: null, feedback: null, clientId: clientIds[buyer] ?? null, home: snapshot(l), ...extra,
    };
  };
  const requests = [
    req("r1", "maple", askers.bell, "Pre-approved buyers", today, hm(15), 30, "incoming"),
    req("r2", "maple", askers.lee, "Pre-approved buyers", addDays(today, 1), hm(10), 30, "incoming"),
    req("r3", "leland", askers.shah, "Second showing", sat, hm(13), 45, "incoming"),
    req("r4", "leland", askers.bell, "First-time buyers", addDays(today, 2), hm(17), 30, "incoming", "approved"),
    req("s1", "sem", null, "Maria & Luis Alvarez", today, hm(9, 30), 30, "sent", "approved"),
    req("s2", "elm", null, "Maria & Luis Alvarez", sat, hm(11), 30, "sent"),
    req("s5", "gid", null, "Maria & Luis Alvarez", today, hm(10, 15), 30, "sent", "approved"),
    req("s3", "her", null, "Ana Price", sat, hm(14), 30, "sent", "countered", {
      proposedStartsAt: toTimestamp(sat, hm(14, 30)), proposedEndsAt: toTimestamp(sat, hm(15)), responseNote: "Sellers are home until 2:30.",
    }),
    req("s4", "gra", null, "The Greens", addDays(today, 3), hm(16), 30, "sent", "declined"),
  ];
  const clients: Client[] = [
    { id: "c-alvarez", name: "Maria & Luis Alvarez", phone: "(708) 555-0111", email: "alvarez@example.com", preApproved: true, stage: "present", source: "manual", intent: "Buying", notes: "3 bed, under $650k, near the Brown Line", createdAt: toTimestamp(addDays(today, -40), hm(12)) },
    { id: "c-price", name: "Ana Price", phone: "(312) 555-0160", email: "ana@example.com", preApproved: true, stage: "present", source: "manual", intent: "Buying", notes: "", createdAt: toTimestamp(addDays(today, -60), hm(12)) },
    { id: "c-greens", name: "The Greens", phone: "(773) 555-0172", email: "greens@example.com", preApproved: false, stage: "present", source: "manual", intent: "Buying", notes: "", createdAt: toTimestamp(addDays(today, -30), hm(12)) },
    { id: "c-greene", name: "Tasha Greene", phone: "(219) 555-0135", email: "tasha@example.com", preApproved: true, stage: "present", source: "manual", intent: "Buying", notes: "", createdAt: toTimestamp(addDays(today, -50), hm(12)) },
    { id: "c-sandoval", name: "The Sandovals", phone: "(847) 555-0181", email: "sandoval@example.com", preApproved: false, stage: "present", source: "deal", intent: "Selling", notes: "", createdAt: toTimestamp(addDays(today, -90), hm(12)) },
    { id: "c-ward", name: "Grace & Tom Ward", phone: "(312) 555-0144", email: "ward@example.com", preApproved: false, stage: "present", source: "deal", intent: "Selling", notes: "", createdAt: toTimestamp(addDays(today, -45), hm(12)) },
    { id: "c-okafor", name: "Chidi Okafor", phone: "(773) 555-0190", email: "chidi@example.com", preApproved: true, stage: "past", source: "manual", intent: "Buying", notes: "Closed on a 2-flat in Avondale last spring", createdAt: toTimestamp(addDays(today, -300), hm(12)) },
    { id: "c-nguyen", name: "Linh Nguyen", phone: "(312) 555-0107", email: "linh@example.com", preApproved: false, stage: "future", source: "link", intent: "Buying", notes: "", createdAt: toTimestamp(addDays(today, -1), hm(18)) },
    { id: "c-baker", name: "Rosa Baker", phone: "", email: "rosa@example.com", preApproved: false, stage: "future", source: "link", intent: "Selling", notes: "", createdAt: toTimestamp(addDays(today, -3), hm(9)) },
  ];
  const mkDeal = (id: string, address: string, city: string, side: Deal["side"], stage: string, acceptance: string, closing: string, loanType: string, clientName: string, extra: Partial<Deal> = {}): Deal => {
    const ms = contractMilestones({ acceptance, closing, mortgageContingencyDays: loanType === "Cash" ? undefined : 21 });
    return {
      id, address, city, side, stage, acceptanceDate: acceptance, closingDate: closing, loanType, clientName,
      clientId: DEAL_CLIENTS[clientName] ?? null,
      hasHoa: false,
      milestones: ms.map((m, i) => ({ id: `${id}-m${i}`, kind: m.kind, label: m.label, due: m.due, done: m.due < today })),
      members: [{ role: side === "seller" ? "listing_agent" : "buyers_agent", name: "Donna White", isYou: true }],
      tasks: [], loanUpdates: [], ...extra,
    };
  };
  const kenwoodAccepted = addDays(today, -3);
  const deals: Deal[] = [
    mkDeal("kenwood", "6120 S Kenwood Ave", "Chicago, IL", "buyer", "Inspection", kenwoodAccepted, addDays(today, 29), "Conventional", "Ana Price", {
      members: [
        { role: "buyers_agent", name: "Donna White", isYou: true },
        { role: "buyer", name: "Ana Price", phone: "(312) 555-0160" },
        { role: "listing_agent", name: "Sam Ortiz", phone: "(773) 555-0133" },
        { role: "attorney", name: "Rachel Kim (buyer)", email: "rachel@example.com" },
        { role: "attorney", name: "David Moss (seller)", email: "david@example.com" },
        { role: "lender", name: "Kara Wills · [Lender A]", phone: "(312) 555-0199" },
        { role: "title", name: "[Title company]" },
      ],
      tasks: [
        { id: "t1", title: "Send executed contract to both attorneys", assignee: "You", due: kenwoodAccepted, done: true },
        { id: "t2", title: "Get earnest money receipt", assignee: "Listing agent", due: addDays(kenwoodAccepted, 2), done: true },
        { id: "t3", title: "Send pre-approval letter to listing agent", assignee: "Lender", due: kenwoodAccepted, done: true },
        { id: "t4", title: "Schedule home inspection", assignee: "You", due: addDays(kenwoodAccepted, 1), done: true },
        { id: "t5", title: "Attend inspection", assignee: "You", due: today, done: false },
        { id: "t6", title: "Send inspection report to buyer attorney", assignee: "You", due: addDays(today, 1), done: false },
        { id: "t7", title: "Confirm attorney review is closed", assignee: "Buyer attorney", due: addDays(today, 4), done: false },
        { id: "t8", title: "Lender orders appraisal", assignee: "Lender", due: addDays(today, 6), done: false },
      ],
      loanUpdates: [
        { id: "lu1", status: "Appraisal ordered", note: "Appraiser visit expected next week.", author: "Kara Wills · lender", at: toTimestamp(addDays(today, -1), hm(10)) },
        { id: "lu2", status: "Application complete", note: "", author: "Kara Wills · lender", at: toTimestamp(addDays(today, -2), hm(15)) },
      ],
    }),
    mkDeal("ridgeway", "2207 Ridgeway Ave", "Evanston, IL", "seller", "Clear to close", addDays(today, -35), today, "Conventional", "The Sandovals"),
    mkDeal("wolcott", "935 N Wolcott Ave", "Chicago, IL", "buyer", "Attorney review", addDays(today, -4), addDays(today, 36), "FHA", "The Greens"),
    mkDeal("calumet", "7712 Calumet Ave", "Munster, IN", "buyer", "Appraisal", addDays(today, -12), addDays(today, 22), "Conventional", "Tasha Greene"),
    mkDeal("18th", "1510 W 18th St", "Chicago, IL", "seller", "Mortgage contingency", addDays(today, -16), addDays(today, 27), "Conventional", "Grace & Tom Ward"),
  ];
  const hours: WeeklyHours[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, start: d === 0 ? hm(11) : hm(9), end: d === 6 ? hm(17) : d === 0 ? hm(16) : hm(19), on: d !== 0 }));
  return {
    me: { id: ME_ID, fullName: "Donna White", email: "donna@example.com", phone: "(708) 555-0123", tagline: "", bio: "Chicagoland and NW Indiana agent and loan officer", headshotUrl: null, logoUrl: null, brokerage: "D. White Realty", slug: "donna-white", websites: [{ label: "D. White Realty", url: "https://example.com" }], mapApp: "google", serviceAreas: ["Chicago", "Oak Park", "Evanston", "NW Indiana"], selfRoles: [] },
    contact: { preferred: "app", methods: ["app", "text"], textAfterCall: true },
    portfolio: [],
    licenses: [
      { id: "lic-il", profession: "real_estate_broker", state: "IL", number: "475.123456", sponsor: "D. White Realty", expiresOn: null, ceHours: 6, status: "verified" },
      { id: "lic-in", profession: "real_estate_broker", state: "IN", number: "RB12345678", sponsor: "D. White Realty", expiresOn: null, ceHours: 4, status: "verified" },
      { id: "lic-mlo", profession: "mortgage_loan_originator", state: "IL", number: "1234567", sponsor: "[Mortgage company]", expiresOn: null, ceHours: 8, status: "verified" },
    ],
    listings, requests, clients, deals, hours, homeWindows,
  };
}

const g = globalThis as unknown as { __reDemo?: Store };
const store = (): Store => (g.__reDemo ??= seed());

export const demoRepo: Repo = {
  async getMe() { return store().me; },
  async updateMe(patch) { Object.assign(store().me, patch); },
  async getContactPreference() { return store().contact; },
  async saveContactPreference(pref) { store().contact = pref; },
  async listPortfolio() { return store().portfolio; },
  async addPortfolio({ file, label }) { store().portfolio.unshift({ id: `pf-${Date.now()}`, label, url: file }); },
  async removePortfolio(id) { const s = store(); s.portfolio = s.portfolio.filter((p) => p.id !== id); },
  async listLicenses() { return store().licenses; },
  async addLicense(input) {
    store().licenses.push({ id: `lic-${Date.now()}`, ...input, ceHours: 0, status: "checking" });
  },
  async removeLicense(id) { const s = store(); s.licenses = s.licenses.filter((l) => l.id !== id); },
  async listListings() { return store().listings; },
  async listRequests() { return [...store().requests].sort((a, b) => a.startsAt.localeCompare(b.startsAt)); },
  async decideRequest(id, answer) {
    const r = store().requests.find((x) => x.id === id);
    if (!r || r.direction !== "incoming") return;
    r.status = answer.status;
    r.proposedStartsAt = answer.status === "countered" ? answer.proposedStartsAt ?? null : null;
    r.proposedEndsAt = answer.status === "countered" ? answer.proposedEndsAt ?? null : null;
    r.responseNote = answer.note ?? "";
  },
  async acceptNewTime(id) {
    const r = store().requests.find((x) => x.id === id);
    if (!r || r.direction !== "sent" || r.status !== "countered" || !r.proposedStartsAt || !r.proposedEndsAt) return;
    Object.assign(r, { startsAt: r.proposedStartsAt, endsAt: r.proposedEndsAt, status: "approved", proposedStartsAt: null, proposedEndsAt: null });
  },
  async cancelRequest(id) { const r = store().requests.find((x) => x.id === id); if (r && r.direction === "sent") r.status = "cancelled"; },
  async markReminded(id) {
    const r = store().requests.find((x) => x.id === id);
    if (r && r.direction === "sent") { r.remindedAt = new Date().toISOString(); r.reminderCount += 1; }
  },
  async recordAnswer(id, status) {
    const r = store().requests.find((x) => x.id === id);
    if (r && r.direction === "sent" && r.listingId === null) r.status = status;
  },
  async createRequest(input) {
    const s = store();
    const l = input.listingId ? s.listings.find((x) => x.id === input.listingId) : undefined;
    if (input.listingId && !l) throw new Error("Listing not found");
    if (!l && !input.manual) throw new Error("Pick a home");
    const m = input.manual;
    const who: AgentSummary = l ? l.listingAgent : {
      id: "", name: m!.agentName || "Listing agent", phone: m!.agentPhone, email: m!.agentEmail, brokerage: "", onApp: false,
      contact: { preferred: m!.agentPhone ? "text" : "email", methods: m!.agentPhone ? ["text", "email"] : ["email"], textAfterCall: false },
    };
    const created: ShowingRequest = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, listingId: l?.id ?? null, address: l?.address ?? m!.address,
      photoUrl: l?.photoUrl ?? null, otherAgent: who, otherAgentName: who.name, buyerLabel: input.buyerLabel,
      startsAt: input.startsAt, endsAt: input.endsAt, status: l?.instantShowings ? "approved" : "pending", direction: "sent",
      proposedStartsAt: null, proposedEndsAt: null, responseNote: "", remindedAt: null, reminderCount: 0,
      comments: input.comments ?? "", arrivedAt: null, feedback: null, clientId: input.clientId ?? null,
      home: l ? snapshot(l) : { address: m!.address, city: "", photoUrl: null, beds: null, baths: null, sqft: null },
    };
    s.requests.push(created);
    const c = s.clients.find((x) => x.id === input.clientId);
    if (c && c.stage === "future") c.stage = "present";
    return created;
  },
  async markArrived(id) {
    const r = store().requests.find((x) => x.id === id);
    if (r && r.direction === "sent") r.arrivedAt = new Date().toISOString();
  },
  async submitFeedback(id, feedback) {
    const r = store().requests.find((x) => x.id === id);
    if (r && r.direction === "sent") r.feedback = feedback;
  },
  async listClients() { return [...store().clients].sort((a, b) => a.name.localeCompare(b.name)); },
  async addClient(input) {
    const c: Client = { id: `c-${Date.now()}`, stage: "present", source: "manual", intent: "", notes: "", createdAt: new Date().toISOString(), ...input };
    store().clients.push(c);
    return c;
  },
  async setClientStage(id, stage) { const c = store().clients.find((x) => x.id === id); if (c) c.stage = stage; },
  async getPublicProfile(slug) {
    const s = store();
    if (slug.toLowerCase() !== s.me.slug) return null;
    const me = s.me;
    return {
      slug: me.slug, fullName: me.fullName, tagline: me.tagline, bio: me.bio, phone: me.phone, email: me.email,
      headshotUrl: me.headshotUrl, logoUrl: me.logoUrl, brokerage: me.brokerage, websites: me.websites,
      licenses: s.licenses.filter((l) => l.status === "verified").map((l) => ({ profession: l.profession, state: l.state, number: l.number })),
    } satisfies PublicProfile;
  },
  async connectToPro(slug, input) {
    const s = store();
    if (slug.toLowerCase() !== s.me.slug) throw new Error("Profile not found");
    s.clients.push({ id: `c-${Date.now()}`, name: input.name, phone: input.phone, email: input.email, preApproved: false, stage: "future", source: "link", intent: input.intent, notes: "", createdAt: new Date().toISOString() });
  },
  async getTourContext(date) {
    const s = store();
    const rule = s.hours.find((h) => h.weekday === weekdayOf(date));
    const mine: Window[] = rule?.on ? subtract([[rule.start, rule.end]], [[hm(12), hm(12, 45)]]) : [];
    return {
      date,
      clientLabel: "Maria & Luis Alvarez",
      participants: [
        { name: "You", free: mine, source: "Google Calendar" },
        { name: "Maria Alvarez", free: [[hm(10), hm(16)]], source: "Apple Calendar" },
        { name: "Luis Alvarez", free: [[hm(10), hm(13, 30)], [hm(14), hm(17)]], source: "Entered by hand" },
      ],
      start: { label: "Your office", lat: 41.9435, lng: -87.6795 },
      homes: s.listings.filter((l) => s.homeWindows[l.id]).map((l) => ({ listing: l, free: s.homeWindows[l.id] })),
      maxShowingsPerDay: 8,
      bufferMinutes: 5,
    };
  },
  async listDeals() { return store().deals; },
  async getDeal(id) { return store().deals.find((d) => d.id === id) ?? null; },
  async createDeal(input) {
    const s = store();
    const id = `deal-${Date.now()}`;
    s.deals.push({
      id, address: input.address, city: input.city, side: input.side, stage: "Under contract",
      acceptanceDate: input.acceptanceDate, closingDate: input.closingDate, loanType: input.loanType, clientName: input.clientName,
      clientId: input.clientId ?? null, hasHoa: input.hasHoa,
      members: [
        { role: input.side === "seller" ? "listing_agent" : "buyers_agent", name: s.me.fullName, isYou: true },
        { role: input.side === "seller" ? "seller" : "buyer", name: input.clientName, phone: s.clients.find((c) => c.id === input.clientId)?.phone },
      ],
      milestones: input.milestones.map((m, i) => ({ id: `${id}-m${i}`, kind: m.kind, label: m.label, due: m.due, done: false })),
      tasks: [], loanUpdates: [],
    });
    const c = s.clients.find((x) => x.id === input.clientId);
    if (c && c.stage === "future") c.stage = "present";
    return id;
  },
  async setMilestoneDate(dealId, milestoneId, due) {
    const d = store().deals.find((x) => x.id === dealId);
    const m = d?.milestones.find((x) => x.id === milestoneId);
    if (!d || !m) return;
    m.due = due;
    if (m.kind === "closing") d.closingDate = due;
  },
  async toggleTask(dealId, taskId) { const t = store().deals.find((d) => d.id === dealId)?.tasks.find((x) => x.id === taskId); if (t) t.done = !t.done; },
  async toggleMilestone(dealId, milestoneId) {
    const s = store();
    const d = s.deals.find((x) => x.id === dealId);
    const m = d?.milestones.find((x) => x.id === milestoneId);
    if (!d || !m) return;
    m.done = !m.done;
    // Closing day: the client moves to Past.
    const c = s.clients.find((x) => x.id === d.clientId);
    if (m.kind === "closing" && c) c.stage = m.done ? "past" : "present";
  },
  async postLoanUpdate(dealId, status, note) {
    const d = store().deals.find((x) => x.id === dealId);
    d?.loanUpdates.unshift({ id: `lu-${Date.now()}`, status, note, author: "Donna White · lender", at: new Date().toISOString() });
  },
  async getWeeklyHours() { return store().hours; },
  async saveWeeklyHours(hours) { store().hours = hours; },
};
