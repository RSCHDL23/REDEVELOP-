/**
 * REsource: quick answers and official links for agents and their clients.
 * General information only, not legal advice. Links checked October 2026.
 */
export type ResourceLink = { title: string; url: string; source: string };
export type Faq = { q: string; a: string; links: ResourceLink[]; tags: string[] };
export type Section = { id: string; title: string; blurb: string; audience: "agents" | "clients"; links: ResourceLink[] };

const L = {
  licenseAct: { title: "Illinois Real Estate License Act of 2000 (225 ILCS 454)", url: "https://www.ilga.gov/legislation/ILCS/details?MajorTopic=&Chapter=&ActName=Real+Estate+License+Act+of+2000.&ActID=1364&ChapterID=24&SeqStart=&ChapAct=FullText", source: "Illinois General Assembly" },
  idfpr: { title: "IDFPR Division of Real Estate", url: "https://idfpr.illinois.gov/dre.html", source: "Illinois IDFPR" },
  inPla: { title: "Indiana Real Estate Commission", url: "https://www.in.gov/pla/professions/real-estate-home/", source: "Indiana PLA" },
  disclosureAct: { title: "Residential Real Property Disclosure Act (765 ILCS 77)", url: "https://www.ilga.gov/legislation/ILCS/details?ActID=2152&ActName=Residential+Real+Property+Disclosure+Act.", source: "Illinois General Assembly" },
  radon: { title: "Radon in real estate transactions", url: "https://iemaohs.illinois.gov/nrs/radon/realestate.html", source: "Illinois Emergency Management Agency" },
  lead: { title: "Lead-based paint disclosure rule", url: "https://www.epa.gov/lead/real-estate-disclosure", source: "U.S. EPA" },
  fairHousing: { title: "Fair Housing and Equal Opportunity", url: "https://www.hud.gov/program_offices/fair_housing_equal_opp", source: "U.S. HUD" },
  tcpa: { title: "Telemarketing, texting and the Do-Not-Call rules", url: "https://www.fcc.gov/general/telemarketing-and-robocalls", source: "FCC" },
  ic3: { title: "Report wire fraud and scams", url: "https://www.ic3.gov/", source: "FBI Internet Crime Complaint Center" },
  irs701: { title: "Sale of your home (capital gains exclusion)", url: "https://www.irs.gov/taxtopics/tc701", source: "IRS" },
  multiBoard: { title: "Multi-Board 8.0 contract and forms updates", url: "https://chicagorealtor.com/new-upcoming-forms-contracts-for-2025/", source: "Chicago Association of REALTORS®" },
  cfpb: { title: "Buying a house: tools and guides", url: "https://www.consumerfinance.gov/owning-a-home/", source: "Consumer Financial Protection Bureau" },
  counselor: { title: "Find a HUD-approved housing counselor", url: "https://www.consumerfinance.gov/find-a-housing-counselor/", source: "CFPB" },
  freddie: { title: "My Home: buying, owning and selling", url: "https://myhome.freddiemac.com/", source: "Freddie Mac" },
  ihda: { title: "IHDA homebuyer programs (Illinois)", url: "https://www.ihda.org/my-home/", source: "Illinois Housing Development Authority" },
  ihcda: { title: "IHCDA homeowner programs and down payment help (Indiana)", url: "https://www.in.gov/ihcda/homeowners-and-renters/", source: "Indiana Housing & Community Development Authority" },
  cookExempt: { title: "Cook County property tax exemptions", url: "https://www.cookcountyassessoril.gov/exemptions", source: "Cook County Assessor" },
  cookAppeal: { title: "Cook County residential appeals", url: "https://www.cookcountyassessoril.gov/residential-appeals", source: "Cook County Assessor" },
  cookCalendar: { title: "Cook County assessment and appeal calendar", url: "https://www.cookcountyassessoril.gov/assessment-calendar-and-deadlines", source: "Cook County Assessor" },
  cookBor: { title: "Cook County Board of Review (second-level appeals)", url: "https://www.cookcountyboardofreview.com/", source: "Cook County Board of Review" },
  inDeductions: { title: "Indiana property tax deductions (homestead and more)", url: "https://www.in.gov/dlgf/deductions-and-credits/", source: "Indiana DLGF" },
  narFaq: { title: "NAR settlement FAQs (written buyer agreements)", url: "https://www.nar.realtor/the-facts/nar-settlement-faqs", source: "National Association of REALTORS®" },
  naca10: { title: "NACA: 10 steps to homeownership", url: "https://www.naca.com/10steps/", source: "NACA" },
  nacaPurchase: { title: "NACA: Purchase process (HAND, closing)", url: "https://www.naca.com/purchase/", source: "NACA" },
  nacaQual: { title: "NACA: Qualification FAQ", url: "https://www.naca.com/faq/qualification-process/", source: "NACA" },
  nacaCounsel: { title: "NACA: Counseling Department", url: "https://www.naca.com/counseling-department/", source: "NACA" },
} satisfies Record<string, ResourceLink>;

export const FAQS: Faq[] = [
  {
    q: "Can I represent both the buyer and the seller (dual agency)?",
    a: "In Illinois, a licensee may act as a dual agent only with the informed written consent of both clients, given before acting as a dual agent. Check your brokerage's policy and use its dual agency disclosure. Indiana has its own limited-agency rules.",
    links: [L.licenseAct, L.inPla], tags: ["agency", "dual", "disclosure", "illinois", "indiana"],
  },
  {
    q: "I'm also the loan officer on this deal. What do I need to do?",
    a: "Tell your client in writing that you're acting as both their agent and their loan officer, and keep the roles separate in your files. Federal RESPA rules ban paying or receiving fees or anything of value for referring settlement business. Check with your brokerage and your mortgage company's compliance team.",
    links: [L.cfpb], tags: ["mlo", "loan officer", "respa", "dual role", "referral"],
  },
  {
    q: "What does an Illinois seller have to disclose?",
    a: "Sellers of 1–4 unit homes generally must give buyers the Residential Real Property Disclosure Report before a contract is signed, plus the radon disclosure and pamphlet. Homes built before 1978 also need the lead-based paint disclosure.",
    links: [L.disclosureAct, L.radon, L.lead], tags: ["disclosure", "seller", "radon", "lead", "illinois"],
  },
  {
    q: "What's required for a home built before 1978?",
    a: "Give the lead-based paint disclosure and the EPA pamphlet before the contract. Buyers get a 10-day chance to have the home inspected for lead, which the parties can change or the buyer can waive in writing.",
    links: [L.lead], tags: ["lead", "paint", "1978", "inspection"],
  },
  {
    q: "Can I text leads and clients?",
    a: "Get prior express written consent before sending marketing texts or using automated calls, honor every STOP or opt-out, and check the Do Not Call list before cold calling. REschedule's sign-up and 'Connect with me' forms collect texting consent.",
    links: [L.tcpa], tags: ["text", "tcpa", "do not call", "marketing", "leads"],
  },
  {
    q: "What should I avoid in listing descriptions and ads?",
    a: "Describe the home, not the people you think should live there. The Fair Housing Act bans preferences based on race, color, religion, sex, national origin, familial status and disability, and Illinois law protects more groups. Illinois also requires your sponsoring brokerage's name in your ads.",
    links: [L.fairHousing, L.licenseAct], tags: ["fair housing", "advertising", "ads", "social"],
  },
  {
    q: "Who holds the earnest money, and when is it due?",
    a: "The contract says who holds it (often the listing brokerage's escrow account, a title company or an attorney) and when it's due. Brokers who hold it must follow the License Act's escrow rules. Ask your managing broker for your brokerage's procedure.",
    links: [L.licenseAct], tags: ["earnest money", "escrow", "deposit"],
  },
  {
    q: "How does attorney review work on Chicago-area contracts?",
    a: "The Multi-Board Residential Real Estate Contract includes an attorney review period after acceptance, when either side's attorney can propose changes. REschedule counts it in business days and puts it on your deal timeline. Always confirm the dates in your signed contract.",
    links: [L.multiBoard], tags: ["attorney review", "multi-board", "contract", "chicago"],
  },
  {
    q: "How do I protect my clients from wire fraud?",
    a: "Tell clients at the start: wiring instructions never change by email. Have them call the title company at a number they already know before sending money. If money goes to the wrong place, call their bank right away and report it to the FBI's IC3.",
    links: [L.ic3], tags: ["wire fraud", "scam", "closing", "title"],
  },
  {
    q: "Will my seller owe tax on the profit?",
    a: "If they owned and lived in the home as their main home for at least 2 of the last 5 years, they may be able to exclude up to $250,000 of gain ($500,000 for married couples filing jointly). They should talk to a tax professional.",
    links: [L.irs701], tags: ["tax", "capital gains", "seller", "irs"],
  },
  {
    q: "Do I need a signed agreement before showing a buyer homes?",
    a: "Yes, if you're in an MLS. Since NAR's practice change on August 17, 2024, agents working with a buyer must have a written agreement with them before touring a home, and it must spell out how you're paid. When you add a client, REschedule offers to send their agreement through your e-signature software.",
    links: [L.narFaq], tags: ["buyer agreement", "nar", "settlement", "touring", "compensation"],
  },
  {
    q: "How is a NACA purchase different from a regular loan?",
    a: "NACA buyers become members, attend a homebuyer workshop, work with a housing counselor, and save their 'payment shock' each month. Once NACA Qualified, they're approved for a maximum monthly payment (the Qualification Form is good for 6 months). Contracts need at least a 30-day closing and a NACA-approved settlement agent. NACA-approved inspectors check the home, the HAND department reviews repairs, and closing happens at the NACA office. There's no down payment, no closing costs and no mortgage insurance.",
    links: [L.naca10, L.nacaPurchase, L.nacaQual], tags: ["naca", "lending", "payment shock", "hand", "workshop", "counseling"],
  },
  {
    q: "Where do I check a license or renew mine?",
    a: "Illinois licenses are managed by IDFPR's Division of Real Estate; Indiana's by the Professional Licensing Agency.",
    links: [L.idfpr, L.inPla], tags: ["license", "renewal", "idfpr", "indiana"],
  },
];

export const SECTIONS: Section[] = [
  { id: "laws", title: "Laws & licensing", blurb: "The rules agents work under in Illinois and Indiana.", audience: "agents", links: [L.licenseAct, L.idfpr, L.inPla, L.disclosureAct, L.fairHousing, L.tcpa] },
  { id: "forms", title: "Contracts & disclosures", blurb: "Standard forms and required disclosures.", audience: "agents", links: [L.multiBoard, L.disclosureAct, L.radon, L.lead] },
  { id: "buyers", title: "First-time homebuyer help", blurb: "Down payment help, grants, loans and free counseling.", audience: "clients", links: [L.ihda, L.ihcda, L.counselor, L.cfpb, L.freddie] },
  { id: "taxes", title: "Property taxes & appeals", blurb: "Lower the tax bill: exemptions and appeals.", audience: "clients", links: [L.cookExempt, L.cookAppeal, L.cookCalendar, L.cookBor, L.inDeductions] },
  { id: "naca", title: "NACA mortgage", blurb: "Workshops, counseling, payment shock and a monthly-payment approval, with no down payment or closing costs.", audience: "clients", links: [L.naca10, L.nacaQual, L.nacaPurchase, L.nacaCounsel] },
  { id: "selling", title: "Selling & closing", blurb: "Taxes on a sale and staying safe at closing.", audience: "clients", links: [L.irs701, L.ic3, L.cfpb] },
];
