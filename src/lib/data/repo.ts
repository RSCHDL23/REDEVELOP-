import type { Profession } from "@/lib/core/access";
import type { ContactMethod } from "@/lib/core/messages";
import type { Client, ClientStage, ContactPreference, Deal, License, Listing, PortfolioItem, Profile, RequestStatus, ShowingFeedback, ShowingRequest, TourContext, WeeklyHours } from "./types";

export interface NewRequest {
  /** A home in the system, or a typed-in home with its listing agent. */
  listingId?: string;
  manual?: { address: string; agentName: string; agentPhone: string; agentEmail: string };
  clientId?: string;
  buyerLabel: string;
  startsAt: string;
  endsAt: string;
  method: ContactMethod;
  comments?: string;
}

export interface NewDeal {
  address: string;
  city: string;
  side: "buyer" | "seller" | "both";
  clientId?: string;
  clientName: string;
  acceptanceDate: string;
  closingDate: string;
  loanType: string;
  hasHoa: boolean;
  /** Final dates for each milestone, after any edits. */
  milestones: { kind: string; label: string; due: string }[];
}

/** The public card shown on a professional's personal link. */
export interface PublicProfile {
  slug: string;
  fullName: string;
  tagline: string;
  bio: string;
  phone: string;
  email: string;
  headshotUrl: string | null;
  logoUrl: string | null;
  brokerage: string;
  websites: { label: string; url: string }[];
  licenses: { profession: Profession; state: string; number: string }[];
}

/** Everything the screens need. Implemented by the demo store and by Supabase. */
export interface Repo {
  getMe(): Promise<Profile>;
  updateMe(patch: Partial<Pick<Profile, "fullName" | "phone" | "tagline" | "bio" | "brokerage" | "headshotUrl" | "logoUrl" | "selfRoles" | "websites" | "mapApp">>): Promise<void>;

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

  /** Requester is at the home. */
  markArrived(id: string): Promise<void>;
  submitFeedback(id: string, feedback: ShowingFeedback): Promise<void>;

  listClients(): Promise<Client[]>;
  addClient(input: Pick<Client, "name" | "phone" | "email" | "preApproved"> & Partial<Pick<Client, "stage" | "notes" | "intent">>): Promise<Client>;
  setClientStage(id: string, stage: ClientStage): Promise<void>;

  /** Personal link: works without signing in. */
  getPublicProfile(slug: string): Promise<PublicProfile | null>;
  connectToPro(slug: string, input: { name: string; phone: string; email: string; intent: string }): Promise<void>;

  getTourContext(date: string): Promise<TourContext>;

  listDeals(): Promise<Deal[]>;
  getDeal(id: string): Promise<Deal | null>;
  createDeal(input: NewDeal): Promise<string>;
  setMilestoneDate(dealId: string, milestoneId: string, due: string): Promise<void>;
  toggleTask(dealId: string, taskId: string): Promise<void>;
  toggleMilestone(dealId: string, milestoneId: string): Promise<void>;
  postLoanUpdate(dealId: string, status: string, note: string): Promise<void>;

  getWeeklyHours(): Promise<WeeklyHours[]>;
  saveWeeklyHours(hours: WeeklyHours[]): Promise<void>;
}
