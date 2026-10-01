import type { Profession } from "@/lib/core/access";
import type { ContactMethod } from "@/lib/core/messages";
import type { ContactPreference, Deal, License, Listing, PortfolioItem, Profile, ShowingRequest, TourContext, WeeklyHours } from "./types";

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
  decideRequest(id: string, status: "approved" | "declined" | "countered" | "pending"): Promise<void>;
  cancelRequest(id: string): Promise<void>;
  createRequest(input: { listingId: string; startsAt: string; endsAt: string; buyerLabel: string; method: ContactMethod }): Promise<void>;

  getTourContext(date: string): Promise<TourContext>;

  listDeals(): Promise<Deal[]>;
  getDeal(id: string): Promise<Deal | null>;
  toggleTask(dealId: string, taskId: string): Promise<void>;
  toggleMilestone(dealId: string, milestoneId: string): Promise<void>;
  postLoanUpdate(dealId: string, status: string, note: string): Promise<void>;

  getWeeklyHours(): Promise<WeeklyHours[]>;
  saveWeeklyHours(hours: WeeklyHours[]): Promise<void>;
}
