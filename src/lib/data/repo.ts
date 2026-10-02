import type { Profession } from "@/lib/core/access";
import type { ContactMethod } from "@/lib/core/messages";
import type { Client, ContactPreference, Deal, License, Listing, PortfolioItem, Profile, RequestStatus, ShowingRequest, TourContext, WeeklyHours } from "./types";

export interface NewRequest {
  /** A home in the system, or a typed-in home with its listing agent. */
  listingId?: string;
  manual?: { address: string; agentName: string; agentPhone: string; agentEmail: string };
  clientId?: string;
  buyerLabel: string;
  startsAt: string;
  endsAt: string;
  method: ContactMethod;
}

/** Everything the screens need. Implemented by the demo store and by Supabase. */
export interface Repo {
  getMe(): Promise<Profile>;
  updateMe(patch: Partial<Pick<Profile, "fullName" | "phone" | "tagline" | "bio" | "brokerage" | "headshotUrl" | "logoUrl" | "selfRoles">>): Promise<void>;

  getContactPreference(): Promise<ContactPreference>;
  saveContactPreference(pref: ContactPreference): Promise<void>;

  /** `file` is a storage path (Supabase) or a data URL (demo). */
  listPortfolio(): Promise<PortfolioItem[]>;
  addPortfolio(input: { file: string; label: string }): Promise<void>;
  removePortfolio(id: string): Promise<void>;

  listLicenses(): Promise<License[]>;
  addLicense(input: { profession: Profession; state: string; number: string; sponsor: string; expiresOn: string | null }): Promise<void>;
  removeLicense(id: string): Promise<void>;

  listListings(): Promise<Listing[]>;
  listRequests(): Promise<ShowingRequest[]>;
  /** Listing side answers, or changes its answer. A suggested time is required for "countered". */
  decideRequest(id: string, answer: { status: "approved" | "declined" | "countered" | "pending"; proposedStartsAt?: string; proposedEndsAt?: string; note?: string }): Promise<void>;
  /** Requester accepts the time the listing side suggested. */
  acceptNewTime(id: string): Promise<void>;
  cancelRequest(id: string): Promise<void>;
  /** Requester nudged the listing agent (reminder or resend). */
  markReminded(id: string): Promise<void>;
  /** Requester records the listing agent's answer for a typed-in home. */
  recordAnswer(id: string, status: RequestStatus): Promise<void>;
  createRequest(input: NewRequest): Promise<ShowingRequest>;

  listClients(): Promise<Client[]>;
  addClient(input: Omit<Client, "id">): Promise<Client>;

  getTourContext(date: string): Promise<TourContext>;

  listDeals(): Promise<Deal[]>;
  getDeal(id: string): Promise<Deal | null>;
  toggleTask(dealId: string, taskId: string): Promise<void>;
  toggleMilestone(dealId: string, milestoneId: string): Promise<void>;
  postLoanUpdate(dealId: string, status: string, note: string): Promise<void>;

  getWeeklyHours(): Promise<WeeklyHours[]>;
  saveWeeklyHours(hours: WeeklyHours[]): Promise<void>;
}
