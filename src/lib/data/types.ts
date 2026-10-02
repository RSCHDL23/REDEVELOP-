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
  /** MLS agent ID, shown in requests if chosen. */
  mlsAgentId: string;
  /** What to put in showing requests: license number, MLS agent ID, or both. */
  idInMessages: "license" | "mls_id" | "both";
  home: Place | null;
  office: Place | null;
  /** Zillow, Google, Realtor.com… where clients can leave reviews. */
  reviewLinks: Website[];
  rememberAuto: boolean;
  rememberChannel: "text" | "email";
  /** The agent's own library of forms and links (REsource). */
  myResources: MyResource[];
  /** For buyers and sellers: the agent they send homes to. */
  myAgent: { name: string; slug: string } | null;
  /** The agent's e-signature software, for sending agreements. */
  esignProvider: EsignProvider | null;
  esignUrl: string;
  /** For buyers: their pre-approval, proof of funds, or a budget estimate. */
  financing: Financing | null;
  /** Last time the notification list was opened. */
  notificationsSeenAt: string | null;
}

/** How a buyer is paying: a lender's pre-approval, cash (proof of funds), or their own estimate. */
export interface Financing {
  kind: "preapproval" | "proof_of_funds" | "estimate";
  lender: string;
  loanType: string;
  /** Pre-approved purchase price, or the price their estimate gave. */
  purchasePrice: number | null;
  loanAmount: number | null;
  downPct: number | null;
  ratePct: number | null;
  termYears: number | null;
  expiresOn: string | null;
  /** Proof of funds: cash available. Estimate: the monthly payment they want. */
  amount: number | null;
  /** The uploaded letter or statement (kept private). */
  fileName: string;
  fileId: string | null;
  savedAt: string;
}

/** One conversation in Messages, with another person on REschedule. */
export interface Thread {
  withId: string;
  withName: string;
  /** "Your client", "Agent · Marcus Bell's showing"… */
  context: string;
  last: string;
  lastAt: string;
  unread: number;
}

export interface Message {
  id: string;
  fromMe: boolean;
  body: string;
  at: string;
}

/** Someone you can message: clients on the app, agents you've shown with, people on your deals. */
export interface MessageContact {
  id: string;
  name: string;
  context: string;
}

export type EsignProvider = "docusign" | "dotloop" | "authentisign" | "skyslope" | "adobe" | "zipforms" | "other";
export type LoanProgram = "unknown" | "conventional" | "fha" | "va" | "usda" | "naca" | "cash" | "other";

export interface MyResource {
  title: string;
  url: string;
  category: string;
}

export interface Membership {
  id: string;
  kind: "association" | "mls";
  name: string;
  memberId: string;
  url: string;
  dataAccess: "none" | "requested" | "connected";
}

export interface Attachment {
  id: string;
  name: string;
  /** Private link: /d/{token} */
  url: string;
  /** When the private link stops working (14 days, or until closing once an offer is accepted). */
  expiresAt?: string;
}

export interface HomeShare {
  id: string;
  clientName: string;
  url: string;
  source: "zillow" | "redfin" | "realtor";
  address: string;
  note: string;
  wantsTour: boolean;
  createdAt: string;
  seen: boolean;
}

export interface Place {
  address: string;
  lat: number | null;
  lng: number | null;
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
  /** List price in dollars, when known. */
  price: number | null;
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
  /** Closing date of their home, for REmember anniversaries. */
  closedOn: string | null;
  remember: boolean;
  reviewToken: string;
  reviewRequestedAt: string | null;
  /** When the buyer or listing agreement was sent for signature. */
  agreementSentAt: string | null;
  loanProgram: LoanProgram;
  /** NACA: approved maximum monthly payment, today's housing payment, finished steps, qualification date. */
  approvedMonthly: number | null;
  currentHousing: number | null;
  programSteps: string[];
  qualifiedOn: string | null;
  financing: Financing | null;
}

export interface ClientReview {
  name: string;
  stars: number;
  body: string;
  at: string;
}

/** What pops up when you tap an address. */
export interface HomeSnapshot {
  address: string;
  city: string;
  photoUrl: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  price?: number | null;
  /** Map position, when known (for drive times and leave-now alerts). */
  lat?: number | null;
  lng?: number | null;
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
  /** Requester said they're running late; when they expect to arrive. */
  lateEta: string | null;
  feedback: ShowingFeedback | null;
  attachments: Attachment[];
  clientId: string | null;
  home: HomeSnapshot;
  createdAt: string;
  /** When the listing side answered. */
  decidedAt: string | null;
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
  id: string;
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
  /** "auto" = made from the deal's to-do template. */
  source: "auto" | "manual";
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
  earnestAmount: number | null;
  earnestHolder: EarnestHolder | null;
  earnestHolderName: string;
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

export type EarnestHolder = "listing_brokerage" | "buyer_brokerage" | "title_company" | "attorney" | "builder" | "other";
