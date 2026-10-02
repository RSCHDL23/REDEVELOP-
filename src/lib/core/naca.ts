/**
 * NACA (Neighborhood Assistance Corporation of America) works differently from a
 * typical lender: members qualify through workshops and counseling, save their
 * "payment shock", and are approved for a maximum monthly payment.
 * Steps follow naca.com/10steps.
 */
export const NACA_STEPS = [
  { id: "workshop", label: "Homebuyer Workshop", hint: "Free NACA workshop on the process and qualification." },
  { id: "counseling", label: "Housing counseling", hint: "Intake session (about 2 hours), then a follow-up within 30 days. Counselor builds the budget and action plan." },
  { id: "payment_shock", label: "Payment shock savings", hint: "Save the difference between today's housing payment and the new one, to show it's affordable." },
  { id: "qualified", label: "NACA Qualified", hint: "Pre-approved for a maximum monthly payment. The Qualification Form is good for 6 months." },
  { id: "purchase_workshop", label: "Purchase Workshop", hint: "Required before the housing search." },
  { id: "contract", label: "Purchase & sale contract", hint: "Confirm the price fits the approved payment with the counselor first. At least a 30-day closing and a NACA-approved settlement agent." },
  { id: "inspection_hand", label: "Inspection & HAND review", hint: "NACA-approved home and pest inspectors; HAND (Home and Neighborhood Development) reviews required repairs." },
  { id: "credit_access", label: "NACA Credit Access & application", hint: "Mortgage Consultant confirms the member is still qualified and submits updated documents." },
  { id: "underwriting", label: "Processing & underwriting", hint: "Lender underwriting; buyer gets homeowner's insurance and does the walk-through." },
  { id: "closing", label: "Closing at the NACA office", hint: "Sign, get the keys. Members can use MAP afterward if payments get hard." },
] as const;

export type NacaStep = (typeof NACA_STEPS)[number]["id"];

export const NACA_LINKS = [
  { title: "NACA: Steps to homeownership", url: "https://www.naca.com/10steps/", source: "NACA" },
  { title: "NACA: Purchase process", url: "https://www.naca.com/purchase/", source: "NACA" },
  { title: "NACA: Qualification FAQ", url: "https://www.naca.com/faq/qualification-process/", source: "NACA" },
  { title: "NACA: Counseling Department", url: "https://www.naca.com/counseling-department/", source: "NACA" },
];

/** Qualification Forms are valid for 6 months. */
export function qualificationExpires(qualifiedOn: string): string {
  const [y, m, d] = qualifiedOn.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + 6, d));
  return dt.toISOString().slice(0, 10);
}

/** What NACA offers, from naca.com/faq/naca-mortgage-product (checked Oct 2026). */
export const NACA_HIGHLIGHTS = [
  "No down payment",
  "No closing costs and no fees",
  "No mortgage insurance (PMI)",
  "Below-market fixed rate, 15, 20 or 30 years",
  "Everyone gets the same terms",
  "Free workshop and housing counseling to qualify",
];

/** A friendly NACA introduction for renters, from their agent. */
export function nacaIntroMessage(p: { clientFirst: string; agentName: string; agentPhone: string }): string {
  return [
    `Hi ${p.clientFirst}! Since you're renting now, I wanted to tell you about NACA, a nonprofit mortgage program that helps renters become homeowners.`,
    `It has no down payment, no closing costs, no fees and no mortgage insurance, with a below-market fixed rate. You qualify through a free workshop and housing counseling.`,
    `Start here: https://www.naca.com/10steps/`,
    `Happy to walk you through it or go to a workshop with you. ${p.agentName}${p.agentPhone ? ` · ${p.agentPhone}` : ""}`,
  ].join("\n\n");
}
