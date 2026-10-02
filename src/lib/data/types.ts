import type { ContactMethod } from "@/lib/core/messages";
import type { Profession, Role } from "@/lib/core/access";
import type { Window } from "@/lib/core/time";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  tagline: string;
  bio: string;
  headshotUrl: string | null;
  logoUrl: string | null;
  brokerage: string;
  serviceAreas: string[];
  selfRoles: Role[];
  /** Personal link: /p/{slug} */
  slug: string;
  websites: Website[];
  mapApp: MapApp;
}

export type MapApp = "google" | "apple" | "waze";

export interface Website {
  label: string;
  url: string;
}

export interface License {
  id: string;
  profession: Profession;
  state: string;
  number: string;
  sponsor: string;
  expiresOn: string | null;
  ceHours: number;
  status: "checking" | "verified" | "expired" | "rejected";
}

export interface ContactPreference {
  /** The first choice. Always equal to methods[0]. */
  preferred: ContactMethod;
  /** Every way this professional accepts showing requests, in order of preference. */
  methods: ContactMethod[];
  textAfterCall: boolean;
  onlineUrl?: string;
}

export interface PortfolioItem {
  id: string;
  label: string;
  url: string;
}

export interface AgentSummary {
  id: string;
  name: string;
  phone: string;
  email: string;
  brokerage: string;
  onApp: boolean;
  contact: ContactPreference;
}

export interface Listing {
  id: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  beds: number;
  baths: number;
  sqft: number | null;
  instantShowings: boolean;
  showingMinutes: number;
  occupancy: "owner" | "vacant" | "tenant";
  note: string;
  photoUrl: string | null;
  source: "mls" | "fsbo" | "app";
  listingAgent: AgentSummary;
}

/** A buyer (or other client) saved to an agent's profile. */
export type ClientStage = "future" | "present" | "past";

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  preApproved: boolean;
  /** Future: new lead. Present: actively working together. Past: closed. */
  stage: ClientStage;
  source: "manual" | "link" | "deal";
  intent: string;
  notes: string;
  createdAt: string;
}

/** What pops up when you tap an address. */
export interface HomeSnapshot {
  address: string;
  city: string;
  photoUrl: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
}

export interface ShowingFeedback {
  rating: number;
  interest: "very" | "maybe" | "not";
  nextStep: "none" | "second_showing" | "offer";
  comments: string;
  questions: string;
}

export type RequestStatus = "pending" | "approved" | "declined" | "countered" | "cancelled";

export interface ShowingRequest {
  id: string;
  /** Null when the home was typed in (not in the MLS, FSBO or REschedule). */
  listingId: string | null;
  address: string;
  photoUrl: string | null;
  /** Incoming: the agent asking to show. Sent: the listing agent. */
  otherAgent: AgentSummary;
  otherAgentName: string;
  buyerLabel: string;
  startsAt: string; // ISO
  endsAt: string;
  status: RequestStatus;
  direction: "incoming" | "sent";
  /** The time the listing side suggested instead. */
  proposedStartsAt: string | null;
  proposedEndsAt: string | null;
  responseNote: string;
  remindedAt: string | null;
  reminderCount: number;
  comments: string;
  arrivedAt: string | null;
  feedback: ShowingFeedback | null;
  clientId: string | null;
  home: HomeSnapshot;
}

export interface Person {
  name: string;
  /** Free windows in minutes after midnight, for the tour date. */
  free: Window[];
  source: string;
}

export interface TourContext {
  date: string; // YYYY-MM-DD
  clientLabel: string;
  participants: Person[];
  start: { label: string; lat: number; lng: number };
  homes: { listing: Listing; free: Window[] }[];
  maxShowingsPerDay: number;
  bufferMinutes: number;
}

export interface DealMember {
  role: Role;
  name: string;
  phone?: string;
  email?: string;
  isYou?: boolean;
}

export interface Milestone {
  id: string;
  kind: string;
  label: string;
  due: string;
  done: boolean;
}

export interface DealTask {
  id: string;
  title: string;
  assignee: string;
  due: string | null;
  done: boolean;
}

export interface LoanUpdate {
  id: string;
  status: string;
  note: string;
  author: string;
  at: string;
}

export interface Deal {
  id: string;
  address: string;
  city: string;
  side: "buyer" | "seller" | "both";
  stage: string;
  acceptanceDate: string;
  closingDate: string;
  loanType: string;
  clientName: string;
  clientId: string | null;
  hasHoa: boolean;
  members: DealMember[];
  milestones: Milestone[];
  tasks: DealTask[];
  loanUpdates: LoanUpdate[];
}

export interface WeeklyHours {
  weekday: number; // 0 = Sunday
  start: number;
  end: number;
  on: boolean;
}
