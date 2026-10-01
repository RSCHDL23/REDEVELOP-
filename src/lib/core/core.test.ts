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
