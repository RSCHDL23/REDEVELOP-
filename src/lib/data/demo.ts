import "server-only";
/**
 * Demo mode: sample data kept in memory so the app works before Supabase is
 * set up. Changes last until the server restarts.
 */
import { contractMilestones, addDays } from "@/lib/core/deadlines";
import { hm, subtract, type Window } from "@/lib/core/time";
import type { Repo } from "./repo";
import type { AgentSummary, ContactPreference, Deal, License, Listing, PortfolioItem, Profile, ShowingRequest, WeeklyHours } from "./types";
import { nextSaturday, todayISO, toTimestamp, weekdayOf } from "./dates";

const agent = (id: string, name: string, phone: string, preferred: AgentSummary["contact"]["preferred"], extra: Partial<AgentSummary> = {}): AgentSummary => ({
  id, name, phone, email: `${name.split(" ")[0].toLowerCase()}@example.com`, brokerage: "[Brokerage]", onApp: preferred === "app",
  contact: { preferred, textAfterCall: preferred === "call" }, ...extra,
});

const ME_ID = "demo-donna";

interface Store {
  me: Profile;
  contact: ContactPreference;
  portfolio: PortfolioItem[];
  licenses: License[];
  listings: Listing[];
  requests: ShowingRequest[];
  deals: Deal[];
  hours: WeeklyHours[];
  homeWindows: Record<string, Window[]>;
}

function seed(): Store {
  const today = todayISO();
  const sat = nextSaturday(today);
  const me: AgentSummary = agent(ME_ID, "Donna White", "(708) 555-0123", "app", { brokerage: "D. White Realty" });
  const listings: Listing[] = [
    { id: "sem", address: "3315 N Seminary Ave", city: "Chicago", state: "IL", lat: 41.9415, lng: -87.6566, beds: 3, baths: 2, sqft: 1800, instantShowings: false, showingMinutes: 30, occupancy: "owner", note: "Seller out 10 to 1", listingAgent: agent("cruz", "Alana Cruz", "(312) 555-0141", "text", { onApp: true }) },
    { id: "gra", address: "1340 W Granville Ave #3", city: "Chicago", state: "IL", lat: 41.9945, lng: -87.6625, beds: 3, baths: 2, sqft: 1400, instantShowings: true, showingMinutes: 30, occupancy: "owner", note: "Condo hours 10 to 12 and 3 to 5", listingAgent: agent("haddad", "Omar Haddad", "(773) 555-0102", "online", { contact: { preferred: "online", textAfterCall: false, onlineUrl: "https://example.com/schedule/omar" } }) },
    { id: "her", address: "4417 N Hermitage Ave", city: "Chicago", state: "IL", lat: 41.9615, lng: -87.6735, beds: 3, baths: 2, sqft: 1650, instantShowings: false, showingMinutes: 30, occupancy: "owner", note: "Seller home until 1", listingAgent: agent("novak", "Chris Novak", "(773) 555-0188", "call") },
    { id: "gid", address: "2519 W Giddings St", city: "Chicago", state: "IL", lat: 41.9685, lng: -87.6905, beds: 3, baths: 2, sqft: 1500, instantShowings: true, showingMinutes: 30, occupancy: "vacant", note: "Vacant, lockbox", listingAgent: agent("patel", "Nina Patel", "(312) 555-0177", "app") },
    { id: "elm", address: "1029 Elmwood Ave", city: "Evanston", state: "IL", lat: 42.0405, lng: -87.6825, beds: 3, baths: 2, sqft: 1700, instantShowings: false, showingMinutes: 30, occupancy: "tenant", note: "Tenant blocks 12 to 2", listingAgent: agent("tran", "Kevin Tran", "(847) 555-0119", "email") },
    { id: "maple", address: "418 Maple Ave", city: "Oak Park", state: "IL", lat: 41.8805, lng: -87.7975, beds: 3, baths: 2, sqft: 1600, instantShowings: false, showingMinutes: 30, occupancy: "owner", note: "Your listing", listingAgent: me },
    { id: "leland", address: "2840 W Leland Ave", city: "Chicago", state: "IL", lat: 41.9665, lng: -87.6985, beds: 6, baths: 3, sqft: 3200, instantShowings: false, showingMinutes: 45, occupancy: "tenant", note: "Your listing · 3-flat", listingAgent: me },
  ];
  const homeWindows: Record<string, Window[]> = {
    sem: [[hm(10), hm(13)]],
    gra: [[hm(10), hm(12)], [hm(15), hm(17)]],
    her: [[hm(13), hm(15)]],
    gid: [[hm(9), hm(17)]],
    elm: [[hm(11), hm(12)], [hm(14), hm(16)]],
  };
  const req = (id: string, listingId: string, other: string, buyer: string, date: string, start: number, len: number, direction: ShowingRequest["direction"], status: ShowingRequest["status"] = "pending"): ShowingRequest => ({
    id, listingId, address: listings.find((l) => l.id === listingId)!.address, otherAgentName: other, buyerLabel: buyer,
    startsAt: toTimestamp(date, start), endsAt: toTimestamp(date, start + len), status, direction,
  });
  const requests = [
    req("r1", "maple", "Marcus Bell", "Pre-approved buyers", today, hm(15), 30, "incoming"),
    req("r2", "maple", "Jordan Lee", "Pre-approved buyers", addDays(today, 1), hm(10), 30, "incoming"),
    req("r3", "leland", "Priya Shah", "Second showing", sat, hm(13), 45, "incoming"),
    req("s1", "sem", "Alana Cruz", "Maria & Luis Alvarez", today, hm(9, 30), 30, "sent", "approved"),
    req("s2", "elm", "Kevin Tran", "Maria & Luis Alvarez", sat, hm(11), 30, "sent"),
  ];
  const mkDeal = (id: string, address: string, city: string, side: Deal["side"], stage: string, acceptance: string, closing: string, loanType: string, clientName: string, extra: Partial<Deal> = {}): Deal => {
    const ms = contractMilestones({ acceptance, closing, mortgageContingencyDays: loanType === "Cash" ? undefined : 21 });
    return {
      id, address, city, side, stage, acceptanceDate: acceptance, closingDate: closing, loanType, clientName,
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
    me: { id: ME_ID, fullName: "Donna White", email: "donna@example.com", phone: "(708) 555-0123", tagline: "", bio: "Chicagoland and NW Indiana agent and loan officer", headshotUrl: null, logoUrl: null, brokerage: "D. White Realty", serviceAreas: ["Chicago", "Oak Park", "Evanston", "NW Indiana"], selfRoles: [] },
    contact: { preferred: "app", textAfterCall: true },
    portfolio: [],
    licenses: [
      { id: "lic-il", profession: "real_estate_broker", state: "IL", number: "[LICENSE]", sponsor: "D. White Realty", expiresOn: null, ceHours: 6, status: "verified" },
      { id: "lic-in", profession: "real_estate_broker", state: "IN", number: "[LICENSE]", sponsor: "D. White Realty", expiresOn: null, ceHours: 4, status: "verified" },
      { id: "lic-mlo", profession: "mortgage_loan_originator", state: "IL", number: "[NMLS ID]", sponsor: "[Mortgage company]", expiresOn: null, ceHours: 8, status: "verified" },
    ],
    listings, requests, deals, hours, homeWindows,
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
  async decideRequest(id, status) { const r = store().requests.find((x) => x.id === id); if (r && r.direction === "incoming") r.status = status; },
  async cancelRequest(id) { const r = store().requests.find((x) => x.id === id); if (r && r.direction === "sent") r.status = "cancelled"; },
  async createRequest(input) {
    const s = store();
    const l = s.listings.find((x) => x.id === input.listingId);
    if (!l) throw new Error("Listing not found");
    s.requests.push({ id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, listingId: l.id, address: l.address, otherAgentName: l.listingAgent.name, buyerLabel: input.buyerLabel, startsAt: input.startsAt, endsAt: input.endsAt, status: l.instantShowings ? "approved" : "pending", direction: "sent" });
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
  async toggleTask(dealId, taskId) { const t = store().deals.find((d) => d.id === dealId)?.tasks.find((x) => x.id === taskId); if (t) t.done = !t.done; },
  async toggleMilestone(dealId, milestoneId) { const m = store().deals.find((d) => d.id === dealId)?.milestones.find((x) => x.id === milestoneId); if (m) m.done = !m.done; },
  async postLoanUpdate(dealId, status, note) {
    const d = store().deals.find((x) => x.id === dealId);
    d?.loanUpdates.unshift({ id: `lu-${Date.now()}`, status, note, author: "Donna White · lender", at: new Date().toISOString() });
  },
  async getWeeklyHours() { return store().hours; },
  async saveWeeklyHours(hours) { store().hours = hours; },
};
