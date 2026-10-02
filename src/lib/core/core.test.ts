import { describe, expect, it } from "vitest";
import { hm, intersect, intersectAll, subtract, firstFit, formatClock } from "./time";
import { planTour, type TourInput } from "./optimizer";
import { suggestOpenHouse } from "./openHouse";
import { addBusinessDays, contractMilestones, federalHolidays, isBusinessDay } from "./deadlines";
import { afterCallText, deviceLink, draftsFor, emailRequest } from "./messages";
import { checkPassword } from "./password";
import { can, effectiveAccess, needsDualRoleDisclosure, rolesFor } from "./access";
import { estimateDriveMinutes, milesBetween } from "./drive";

describe("time windows", () => {
  it("intersects and subtracts", () => {
    expect(intersect([[hm(9), hm(12)]], [[hm(10), hm(16)]])).toEqual([[600, 720]]);
    expect(subtract([[hm(9), hm(17)]], [[hm(12), hm(12, 45)]])).toEqual([[540, 720], [765, 1020]]);
    expect(intersectAll([])).toEqual([]);
  });
  it("finds the first slot and formats times", () => {
    expect(firstFit([[600, 640]], 603, 30)).toBe(605);
    expect(firstFit([[600, 620]], 600, 30)).toBeNull();
    expect(formatClock(hm(13, 5))).toBe("1:05 PM");
    expect(formatClock(hm(0, 0))).toBe("12:00 AM");
  });
});

describe("REroute tour optimizer", () => {
  // Same scenario as the prototype: Saturday tour for Maria & Luis.
  const you = [[hm(9), hm(12)], [hm(12, 45), hm(17)]] as const;
  const maria = [[hm(10), hm(16)]] as const;
  const luis = [[hm(10), hm(13, 30)], [hm(14), hm(17)]] as const;
  const m: Record<string, Record<string, number>> = {
    office: { sem: 12, elm: 35, gid: 18, her: 15, gra: 22 },
    sem: { elm: 30, gid: 15, her: 10, gra: 15 },
    elm: { gid: 22, her: 25, gra: 15 },
    gid: { her: 8, gra: 12 },
    her: { gra: 12 },
  };
  const drive: Record<string, Record<string, number>> = {};
  for (const a of Object.keys(m)) for (const b of Object.keys(m[a])) {
    (drive[a] ??= {})[b] = m[a][b];
    (drive[b] ??= {})[a] = m[a][b];
  }
  const base: TourInput = {
    homes: [
      { id: "sem", free: [[hm(10), hm(13)]] },
      { id: "elm", free: [[hm(11), hm(12)], [hm(14), hm(16)]] },
      { id: "gid", free: [[hm(9), hm(17)]] },
      { id: "her", free: [[hm(13), hm(15)]] },
      { id: "gra", free: [[hm(10), hm(12)], [hm(15), hm(17)]] },
    ],
    party: intersectAll([you, maria, luis]),
    drive,
    start: "office",
    departAfter: hm(9, 30),
    showingMinutes: 30,
    bufferMinutes: 5,
  };

  it("fits all five homes and respects every window", () => {
    const plan = planTour(base);
    expect(plan.stops.map((s) => s.homeId)).toEqual(["sem", "gra", "her", "gid", "elm"]);
    expect(plan.skipped).toEqual([]);
    expect(formatClock(plan.end)).toBe("3:30 PM");
    expect(plan.driveTotal).toBe(69);
    for (const s of plan.stops) {
      const home = base.homes.find((h) => h.id === s.homeId)!;
      const ok = intersect(base.party, home.free).some(([a, b]) => s.start >= a && s.end <= b);
      expect(ok, s.homeId).toBe(true);
    }
  });

  it("skips homes that cannot fit and honors the daily cap", () => {
    const plan = planTour({ ...base, homes: [...base.homes, { id: "late", free: [[hm(20), hm(21)]] }], drive: { ...drive, late: {} } });
    expect(plan.skipped).toContain("late");
    expect(planTour({ ...base, maxStops: 2 }).stops).toHaveLength(2);
  });

  it("handles big tours with the fast heuristic", () => {
    const homes = Array.from({ length: 12 }, (_, i) => ({ id: `h${i}`, free: [[hm(9), hm(17)]] as const }));
    const d: Record<string, Record<string, number>> = {};
    for (const a of ["office", ...homes.map((h) => h.id)]) for (const b of homes.map((h) => h.id)) {
      (d[a] ??= {})[b] = 10;
      (d[b] ??= {})[a] = 10;
    }
    const plan = planTour({ ...base, homes, drive: d, party: [[hm(9), hm(17)]] });
    // 9:30 start, 10 min drives, 30 min showings, 5 min buffer: 10 fit before 5 PM.
    expect(plan.stops.length).toBe(10);
    expect(plan.end).toBeLessThanOrEqual(hm(17));
  });
});

describe("REveal open house suggestion", () => {
  it("picks Sunday 1 to 3 for the 418 Maple requests", () => {
    const r = (id: string, free: Record<string, [number, number][]>) => ({ agentId: id, free });
    const slots = suggestOpenHouse(
      [
        r("bell", { sat: [[hm(10), hm(12)]], sun: [[hm(13), hm(16)]] }),
        r("lee", { sun: [[hm(12), hm(15)]] }),
        r("khan", { sat: [[hm(14), hm(17)]], sun: [[hm(13), hm(15)]] }),
        r("cho", { sun: [[hm(11), hm(14)]] }),
        r("diaz", { sun: [[hm(13, 30), hm(17)]] }),
        r("ortiz", { sat: [[hm(13), hm(15)]], sun: [[hm(14), hm(16)]] }),
        r("lin", { sat: [[hm(9), hm(11)]] }),
        r("haddad", { sun: [[hm(12), hm(14, 30)]] }),
      ],
      { days: ["sat", "sun"], seller: { sat: [[hm(12), hm(16)]], sun: [[hm(12), hm(17)]] }, lengthMinutes: 120 },
    );
    expect(slots[0]).toMatchObject({ day: "sun", start: hm(13), end: hm(15) });
    expect(slots[0].fits).toHaveLength(7);
    expect(slots[0].misses).toEqual(["lin"]);
  });
});

describe("contract deadlines", () => {
  it("skips weekends and federal holidays", () => {
    expect(isBusinessDay("2026-10-03")).toBe(false); // Saturday
    expect(federalHolidays(2026).has("2026-11-26")).toBe(true); // Thanksgiving
    expect(federalHolidays(2026).has("2026-10-12")).toBe(true); // Columbus Day
    expect(addBusinessDays("2026-09-28", 5)).toBe("2026-10-05");
    expect(addBusinessDays("2026-10-06", 5)).toBe("2026-10-14"); // skips Oct 12
  });
  it("builds a milestone timeline", () => {
    const ms = contractMilestones({ acceptance: "2026-09-28", closing: "2026-10-30", mortgageContingencyDays: 21 });
    expect(ms.map((m) => m.kind)).toEqual(["accepted", "earnest_money", "attorney_review", "inspection", "mortgage", "walkthrough", "closing"]);
    expect(ms.find((m) => m.kind === "mortgage")?.due).toBe("2026-10-19");
  });
});

describe("REquest message drafts", () => {
  const s = { name: "Donna White", brokerage: "D. White Realty", phone: "(708) 555-0123" };
  const d = { listingAgentFirstName: "Chris", address: "4417 N Hermitage Ave", dayLabel: "Sat 10/3", timeLabel: "1:00–1:30 PM", buyerNames: "Maria & Luis Alvarez", preApproved: true };
  it("drafts every available method in a stable order", () => {
    const drafts = draftsFor(s, d, { phone: "(773) 555-0188", email: "chris@example.com", onApp: true });
    expect(drafts.map((x) => x.method)).toEqual(["app", "text", "email", "call"]);
    expect(emailRequest(s, d).subject).toContain("4417 N Hermitage Ave");
  });
  it("builds device links and after-call texts", () => {
    const text = draftsFor(s, d, { phone: "(773) 555-0188" })[0];
    expect(deviceLink(text)).toMatch(/^sms:7735550188\?&body=/);
    expect(afterCallText(s, d, "confirmed")).toContain("thanks for confirming");
    expect(afterCallText(s, d, "voicemail")).toContain("just tried calling");
  });
});

describe("password rules", () => {
  it("requires all five rules for strong", () => {
    expect(checkPassword("password").strong).toBe(false);
    expect(checkPassword("Longerpassword1").label).toBe("Good");
    expect(checkPassword("Longerpassword1!").strong).toBe(true);
    expect(checkPassword("DonnaWhite2026!", ["donna"]).strong).toBe(false);
  });
});

describe("roles and licenses", () => {
  it("combines real estate and loan officer licenses", () => {
    const roles = rolesFor([
      { profession: "real_estate_broker", status: "verified" },
      { profession: "mortgage_loan_originator", status: "verified" },
      { profession: "appraiser", status: "checking" },
    ]);
    expect(roles.sort()).toEqual(["buyers_agent", "lender", "listing_agent"]);
    expect(can(roles, "loan_updates")).toBe(true);
    expect(can(roles, "approve_showings")).toBe(true);
    expect(effectiveAccess(["tenant"]).approve_showings).toBe("view");
    expect(needsDualRoleDisclosure(["buyers_agent", "lender"])).toBe(true);
  });
  it("never grants licensed roles without a verified license", () => {
    expect(rolesFor([], ["lender", "buyer"])).toEqual(["buyer"]);
  });
});

describe("drive estimates", () => {
  it("gives sensible city drive times", () => {
    const loop = { lat: 41.8819, lng: -87.6278 };
    const evanston = { lat: 42.0451, lng: -87.6877 };
    expect(milesBetween(loop, evanston)).toBeGreaterThan(10);
    const mins = estimateDriveMinutes(loop, evanston);
    expect(mins).toBeGreaterThan(40);
    expect(mins).toBeLessThan(70);
  });
});

import { nudgeDraft } from "./messages";
describe("reminders and resends", () => {
  const s = { name: "Donna White", brokerage: "D. White Realty", phone: "(708) 555-0123" };
  const d = { listingAgentFirstName: "Kevin", address: "1029 Elmwood Ave", dayLabel: "Sat 10/3", timeLabel: "11:00–11:30 AM", buyerNames: "Maria & Luis", preApproved: true };
  it("uses the listing agent's preferred way", () => {
    expect(nudgeDraft("remind", s, d, { preferred: "email", email: "kevin@example.com", phone: "8475550119" }).method).toBe("email");
    expect(nudgeDraft("remind", s, d, { preferred: "text", phone: "8475550119" }).body).toContain("following up");
    expect(nudgeDraft("resend", s, d, { preferred: "text", phone: "8475550119" }).body).toContain("I would like to show");
    expect(nudgeDraft("remind", s, d, { preferred: "app", onApp: true }).method).toBe("app");
    expect(nudgeDraft("remind", s, d, { preferred: "call", phone: "8475550119" }).method).toBe("call");
  });
});

import { checklistMessage, greetingName } from "./closing";
describe("after-closing checklist", () => {
  it("congratulates and lists every step", () => {
    const m = checklistMessage({ clientFirstName: "Ana", address: "6120 S Kenwood Ave", side: "buyer", agentName: "Donna White", agentPhone: "(708) 555-0123" });
    expect(m).toContain("Congratulations, Ana!");
    expect(m).toContain("9. Ignore mail");
    expect(checklistMessage({ clientFirstName: "Tom", address: "x", side: "seller", agentName: "D", agentPhone: "1" })).toContain("officially sold");
    expect(greetingName("The Sandovals")).toBe("The Sandovals");
    expect(greetingName("Grace & Tom Ward")).toBe("Grace & Tom");
    expect(greetingName("Ana Price")).toBe("Ana");
  });
});

import { holidaysWithNames, isBankingDay } from "./deadlines";
describe("holiday calendar", () => {
  it("names holidays and knows bank closures", () => {
    const h2026 = holidaysWithNames(2026);
    expect(h2026).toHaveLength(11);
    // July 4, 2026 is a Saturday: federal offices observe Friday July 3, banks stay open.
    const july = h2026.find((h) => h.name.startsWith("Independence"))!;
    expect(july.date).toBe("2026-07-03");
    expect(july.banksClosed).toBe(false);
    expect(isBankingDay("2026-07-03")).toBe(true);
    expect(isBankingDay("2026-10-12")).toBe(false); // Columbus Day
    expect(isBankingDay("2026-10-13")).toBe(true);
  });
});

import { anniversaryMessage, nextAnniversary, upcomingAnniversaries } from "./remember";
describe("REmember anniversaries", () => {
  it("finds the next anniversary and its year count", () => {
    expect(nextAnniversary("2025-10-07", "2026-10-01")).toEqual({ date: "2026-10-07", years: 1 });
    expect(nextAnniversary("2024-03-15", "2026-10-01")).toEqual({ date: "2027-03-15", years: 3 });
    expect(nextAnniversary("2024-02-29", "2026-01-10")).toEqual({ date: "2026-02-28", years: 2 });
    expect(nextAnniversary("2026-09-01", "2026-10-01").years).toBe(1); // first one is next year
  });
  it("lists upcoming ones soonest first and skips opted-out clients", () => {
    const list = upcomingAnniversaries([
      { id: "a", closedOn: "2024-10-21", remember: true },
      { id: "b", closedOn: "2025-10-07", remember: true },
      { id: "c", closedOn: "2025-10-05", remember: false },
    ], "2026-10-01");
    expect(list.map((x) => x.client.id)).toEqual(["b", "a"]);
    const year = (n: number) => anniversaryMessage({ clientFirst: "Chidi", years: n, agentName: "Donna", agentPhone: "1", seed: "c-okafor" });
    for (let n = 1; n < 10; n++) expect(year(n)).not.toBe(year(n + 1)); // never the same two years in a row
    expect(new Set([1, 2, 3, 4, 5].map(year)).size).toBe(5);
  });
});

import { dealTodoTemplate } from "./tasks";
describe("deal to-do template", () => {
  const milestones = contractMilestones({ acceptance: "2026-10-05", closing: "2026-11-20", mortgageContingencyDays: 21, hasHoa: true });
  it("builds buyer to-dos from the dates, loan and HOA", () => {
    const t = dealTodoTemplate({ side: "buyer", loanType: "Conventional", hasHoa: true, acceptance: "2026-10-05", milestones, earnestHolder: "the title company" });
    expect(t.some((x) => x.title.includes("appraisal"))).toBe(true);
    expect(t.some((x) => x.title.includes("HOA"))).toBe(true);
    expect(t[0].due! <= t[t.length - 1].due!).toBe(true);
    expect(t.find((x) => x.title.startsWith("Deliver earnest"))!.title).toContain("the title company");
  });
  it("skips loan steps for cash and HOA steps without an HOA", () => {
    const t = dealTodoTemplate({ side: "seller", loanType: "Cash", hasHoa: false, acceptance: "2026-10-05", milestones });
    expect(t.some((x) => x.title.includes("appraisal"))).toBe(false);
    expect(t.some((x) => x.title.includes("HOA"))).toBe(false);
  });
});

import { firstUrl, parseListingUrl } from "./listingLinks";
describe("home links from listing sites", () => {
  it("reads addresses from Zillow, Redfin and Realtor.com links", () => {
    expect(parseListingUrl("https://www.zillow.com/homedetails/2519-W-Giddings-St-Chicago-IL-60625/12345_zpid/")).toMatchObject({ site: "zillow", address: "2519 W Giddings St Chicago, IL 60625" });
    expect(parseListingUrl("https://www.redfin.com/IL/Chicago/2519-W-Giddings-St-60625/home/12345")).toMatchObject({ site: "redfin", address: "2519 W Giddings St, Chicago, IL 60625" });
    expect(parseListingUrl("https://www.realtor.com/realestateandhomes-detail/2519-W-Giddings-St_Chicago_IL_60625_M12345-67890")).toMatchObject({ site: "realtor", address: "2519 W Giddings St, Chicago, IL 60625" });
    expect(parseListingUrl("https://example.com/home/1")).toBeNull();
    expect(firstUrl("Check this out! https://www.redfin.com/IL/Chicago/x-60625/home/1 nice")).toBe("https://www.redfin.com/IL/Chicago/x-60625/home/1");
  });
});

import { monthlyPI, paymentFromPrice, priceFromPayment, paymentShock } from "./mortgage";
import { qualificationExpires } from "./naca";
describe("mortgage calculator", () => {
  const costs = { downPct: 0, ratePct: 6.625, years: 30, taxRatePct: 2, insuranceYear: 1800, hoaMonth: 0, pmiPct: 0 };
  it("matches the standard payment formula", () => {
    expect(monthlyPI(300000, 6, 30)).toBeCloseTo(1798.65, 1);
    expect(monthlyPI(120000, 0, 10)).toBe(1000);
  });
  it("turns a monthly approval into a price and back", () => {
    const p = priceFromPayment(2500, costs);
    expect(paymentFromPrice(p.price, costs).total).toBeCloseTo(2500, 2);
    expect(p.price).toBeGreaterThan(250000);
    expect(p.price).toBeLessThan(320000);
    expect(paymentShock(1600, 2500)).toBe(900);
    expect(paymentShock(2600, 2500)).toBe(0);
    expect(qualificationExpires("2026-10-01")).toBe("2027-04-01");
  });
});

describe("NACA to-dos", () => {
  it("adds the NACA steps and drops the generic inspection booking", () => {
    const ms = contractMilestones({ acceptance: "2026-10-05", closing: "2026-11-20", mortgageContingencyDays: 21 });
    const t = dealTodoTemplate({ side: "buyer", loanType: "NACA", hasHoa: false, acceptance: "2026-10-05", milestones: ms });
    expect(t.some((x) => x.title.includes("HAND"))).toBe(true);
    expect(t.some((x) => x.title === "Schedule the home inspection")).toBe(false);
  });
});

import { downPaymentForPayment, nacaBuydownCost, nacaBuydownToAfford } from "./mortgage";
import { readLetter } from "./preapproval";
describe("NACA buy-down and down payment", () => {
  const c = { years: 30, taxRatePct: 2, insuranceYear: 1800, hoaMonth: 0 };
  it("uses NACA's 1.5% per 0.25% rule", () => {
    expect(nacaBuydownCost(300000, 6.625, 6.375, 30)).toBeCloseTo(4500, 2); // 2 steps x 0.75%
    expect(nacaBuydownCost(300000, 6.625, 6.375, 15)).toBeCloseTo(3000, 2);
  });
  it("finds the cheapest buy-down that fits the approved payment", () => {
    const r = nacaBuydownToAfford(300000, 2400, 6.625, c)!;
    expect(r.needed).toBe(true);
    expect(r.payment).toBeLessThanOrEqual(2400);
    expect(r.rate).toBeLessThan(6.625);
    expect(r.sellerMax).toBe(30000);
    expect(nacaBuydownToAfford(900000, 1500, 6.625, c)).toBeNull();
  });
  it("finds the down payment for a target monthly payment", () => {
    const costs = { ratePct: 6.625, years: 30, taxRatePct: 2, insuranceYear: 1800, hoaMonth: 0, pmiPct: 0.5 };
    const d = downPaymentForPayment(400000, 3000, costs)!;
    expect(d.payment).toBeLessThanOrEqual(3000.01);
    expect(d.downPct).toBeGreaterThan(0);
    expect(downPaymentForPayment(400000, 500, costs)).toBeNull();
  });
});
describe("pre-approval letter reader", () => {
  it("pulls the main terms", () => {
    const t = readLetter(`Lakeshore Home Loans
Pre-Approval Letter
Dear Maria and Luis Alvarez,
Congratulations! You are pre-approved for a Conventional 30-year fixed loan.
Purchase Price: $650,000   Loan Amount: $617,500
Down payment of 5% · Interest rate 6.375% (not locked)
This pre-approval expires on November 30, 2026.`);
    expect(t).toMatchObject({ lender: "Lakeshore Home Loans", loanType: "Conventional", purchasePrice: 650000, loanAmount: 617500, downPct: 5, ratePct: 6.375, termYears: 30, expiresOn: "2026-11-30" });
    expect(readLetter("FHA approval up to $289,000. Valid through 12/15/26").expiresOn).toBe("2026-12-15");
  });
});
