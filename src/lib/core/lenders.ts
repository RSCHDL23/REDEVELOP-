/**
 * Sponsored lender spots shown to buyers without a pre-approval. These are paid
 * ads, always labeled "Sponsored". Lenders pay a flat advertising fee, never a fee
 * per closed loan (RESPA Section 8 bans paying for referrals of settlement services).
 * Ratings come only from verified reviews; new lenders show none.
 */
export interface SponsoredLender {
  id: string;
  name: string;
  company: string;
  nmls: string;
  states: string[];
  areas: string;
  phone: string;
  email: string;
  website: string;
  rating: number | null;
  reviews: number;
  programs: string[];
}

/** Samples so the layout can be seen in demo mode. Real spots come from the lender ad program. */
export const SAMPLE_LENDERS: SponsoredLender[] = [
  { id: "sl1", name: "Sample Lender A", company: "[Mortgage company] (sample ad)", nmls: "000000", states: ["IL", "IN"], areas: "Chicagoland and NW Indiana", phone: "(312) 555-0100", email: "loans@example.com", website: "https://example.com", rating: null, reviews: 0, programs: ["Conventional", "FHA", "VA"] },
  { id: "sl2", name: "Sample Lender B", company: "[Credit union] (sample ad)", nmls: "000001", states: ["IL"], areas: "Cook and DuPage counties", phone: "(630) 555-0100", email: "homeloans@example.com", website: "https://example.com", rating: null, reviews: 0, programs: ["Conventional", "First-time buyer grants"] },
];

export function lendersFor(all: SponsoredLender[], states: string[]): SponsoredLender[] {
  const want = new Set(states.map((s) => s.toUpperCase()));
  const list = want.size ? all.filter((l) => l.states.some((s) => want.has(s))) : all;
  // Highest verified rating first; unrated after.
  return [...list].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || b.reviews - a.reviews);
}
