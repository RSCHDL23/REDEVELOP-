/**
 * Roles, licenses and what each can do. One person can hold many roles
 * (agent in two states plus loan officer); they get the best access of all
 * their roles combined.
 */

export const FEATURES = [
  "request_showings",
  "approve_showings",
  "share_availability",
  "showing_feedback",
  "deal_dates",
  "deal_tasks",
  "documents",
  "messages",
  "contacts",
  "relock",
  "loan_updates",
  "reshow",
  "offers",
  "leads",
] as const;
export type Feature = (typeof FEATURES)[number];

/** "full" can do it, "view" can see it, undefined means hidden. */
export type Level = "full" | "view";

export const ROLES = [
  "buyers_agent", "listing_agent", "managing_broker", "transaction_coordinator",
  "buyer", "seller", "landlord", "tenant", "renter",
  "lender", "attorney", "inspector", "appraiser", "contractor", "title", "insurance", "surveyor", "property_manager", "photographer",
] as const;
export type Role = (typeof ROLES)[number];

const F = "full" as const;
const V = "view" as const;

export const ROLE_ACCESS: Record<Role, Partial<Record<Feature, Level>>> = {
  buyers_agent: { request_showings: F, share_availability: F, showing_feedback: V, deal_dates: F, deal_tasks: F, documents: F, messages: F, contacts: F, relock: F, reshow: F, offers: F, leads: F },
  listing_agent: { request_showings: V, approve_showings: F, share_availability: F, showing_feedback: F, deal_dates: F, deal_tasks: F, documents: F, messages: F, contacts: F, relock: F, reshow: F, offers: F, leads: F },
  managing_broker: { request_showings: V, approve_showings: V, share_availability: V, showing_feedback: V, deal_dates: V, deal_tasks: V, documents: V, messages: V, contacts: V, offers: V },
  transaction_coordinator: { request_showings: F, approve_showings: V, share_availability: V, showing_feedback: V, deal_dates: F, deal_tasks: F, documents: F, messages: F, contacts: F },
  buyer: { request_showings: F, share_availability: F, showing_feedback: F, deal_dates: V, deal_tasks: V, documents: V, messages: F, contacts: V, loan_updates: V },
  seller: { approve_showings: F, share_availability: F, showing_feedback: V, deal_dates: V, deal_tasks: V, documents: V, messages: F, contacts: V },
  landlord: { approve_showings: F, share_availability: F, showing_feedback: V, deal_dates: V, deal_tasks: V, documents: V, messages: F, contacts: V },
  tenant: { approve_showings: V, share_availability: F, messages: F },
  renter: { request_showings: F, share_availability: F, showing_feedback: F, documents: V, messages: F },
  lender: { share_availability: F, deal_dates: V, deal_tasks: F, documents: F, messages: F, contacts: V, loan_updates: F, leads: F },
  attorney: { share_availability: F, deal_dates: F, deal_tasks: F, documents: F, messages: F, contacts: V },
  inspector: { share_availability: F, deal_dates: V, deal_tasks: V, documents: F, messages: F, relock: V },
  appraiser: { share_availability: F, deal_dates: V, deal_tasks: V, documents: F, messages: F, relock: V },
  contractor: { share_availability: F, deal_tasks: V, documents: F, messages: F, relock: V },
  title: { share_availability: F, deal_dates: V, deal_tasks: F, documents: F, messages: F, contacts: V, loan_updates: V },
  insurance: { share_availability: F, deal_dates: V, documents: F, messages: F },
  surveyor: { share_availability: F, deal_dates: V, deal_tasks: V, documents: F, messages: F, relock: V },
  property_manager: { request_showings: V, approve_showings: F, share_availability: F, showing_feedback: F, deal_dates: V, deal_tasks: V, documents: V, messages: F, contacts: V, relock: F },
  photographer: { share_availability: F, deal_tasks: V, documents: F, messages: F, relock: V },
};

export type Profession =
  | "real_estate_broker" | "managing_broker" | "mortgage_loan_originator" | "appraiser" | "home_inspector"
  | "attorney" | "contractor" | "insurance_producer" | "property_manager";

/** Which roles each verified license unlocks. */
export const LICENSE_ROLES: Record<Profession, Role[]> = {
  real_estate_broker: ["buyers_agent", "listing_agent"],
  managing_broker: ["managing_broker", "buyers_agent", "listing_agent"],
  mortgage_loan_originator: ["lender"],
  appraiser: ["appraiser"],
  home_inspector: ["inspector"],
  attorney: ["attorney"],
  contractor: ["contractor"],
  insurance_producer: ["insurance"],
  property_manager: ["property_manager"],
};

export const PROFESSION_LABELS: Record<Profession, string> = {
  real_estate_broker: "Real estate broker",
  managing_broker: "Managing broker",
  mortgage_loan_originator: "Mortgage loan originator",
  appraiser: "Appraiser",
  home_inspector: "Home inspector",
  attorney: "Attorney",
  contractor: "Licensed contractor",
  insurance_producer: "Insurance producer",
  property_manager: "Property manager",
};

export interface LicenseLike {
  profession: Profession;
  status: "checking" | "verified" | "expired" | "rejected";
}

/** Roles from verified licenses plus roles that need no license (buyer, seller...). */
export function rolesFor(licenses: readonly LicenseLike[], unlicensedRoles: readonly Role[] = []): Role[] {
  const set = new Set<Role>(unlicensedRoles.filter((r) => !Object.values(LICENSE_ROLES).flat().includes(r)));
  for (const l of licenses) if (l.status === "verified") for (const r of LICENSE_ROLES[l.profession]) set.add(r);
  return [...set];
}

export function effectiveAccess(roles: readonly Role[]): Partial<Record<Feature, Level>> {
  const out: Partial<Record<Feature, Level>> = {};
  for (const r of roles) {
    for (const [f, lvl] of Object.entries(ROLE_ACCESS[r]) as [Feature, Level][]) {
      if (lvl === "full" || out[f] === undefined) out[f] = lvl;
    }
  }
  return out;
}

export function can(roles: readonly Role[], feature: Feature, need: Level = "full"): boolean {
  const lvl = effectiveAccess(roles)[feature];
  return need === "view" ? lvl !== undefined : lvl === "full";
}

/** True when one person is both an agent and the loan officer on a deal: a disclosure is needed. */
export function needsDualRoleDisclosure(rolesOnDeal: readonly Role[]): boolean {
  const agent = rolesOnDeal.some((r) => r === "buyers_agent" || r === "listing_agent");
  return agent && rolesOnDeal.includes("lender");
}
