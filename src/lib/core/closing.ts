/**
 * After-closing checklists sent to clients on closing day.
 * Agents can edit the message before it goes out.
 */
export type ClosingSide = "buyer" | "seller";

export const BUYER_CHECKLIST = [
  "Change the locks and any garage or keypad codes",
  "Put electric, gas, water, trash and internet in your name",
  "File your homestead exemption with the county to lower your property taxes",
  "Keep your closing papers (closing disclosure, deed, title policy) somewhere safe",
  "Update your address with USPS, your bank, employer, license and voter registration",
  "Watch for your first mortgage statement. The first payment is often due the 1st of the second month after closing",
  "Test smoke and carbon monoxide detectors, and find the water shut-off and electrical panel",
  "Register appliance warranties and your home warranty, if you have one",
  "Ignore mail offering a copy of your deed for a fee. The county recorder has it for little or nothing",
];

export const SELLER_CHECKLIST = [
  "Cancel or transfer utilities as of closing day, and note final meter readings",
  "Cancel your homeowner's insurance once the sale records, and ask about a refund",
  "Forward your mail with USPS",
  "Keep your closing statement for tax time",
  "Watch for an escrow refund from your old lender within about 30 days",
  "Stop automatic payments on the old mortgage once the payoff is confirmed",
  "Leave keys, garage remotes, codes and appliance manuals for the buyers",
];

/** "The Sandovals" stays whole, "Grace & Tom Ward" becomes "Grace & Tom", "Ana Price" becomes "Ana". */
export function greetingName(full: string): string {
  const name = full.trim();
  if (!name) return "there";
  if (/^the\s/i.test(name)) return name;
  const amp = name.match(/^(\S+)\s*&\s*(\S+)/);
  if (amp) return `${amp[1]} & ${amp[2]}`;
  return name.split(/\s+/)[0];
}

export function checklistFor(side: "buyer" | "seller" | "both"): { side: ClosingSide; items: string[] }[] {
  if (side === "both") return [{ side: "buyer", items: BUYER_CHECKLIST }, { side: "seller", items: SELLER_CHECKLIST }];
  return [{ side, items: side === "buyer" ? BUYER_CHECKLIST : SELLER_CHECKLIST }];
}

export function checklistMessage(opts: { clientFirstName: string; address: string; side: ClosingSide; agentName: string; agentPhone: string }): string {
  const items = opts.side === "buyer" ? BUYER_CHECKLIST : SELLER_CHECKLIST;
  const opener = opts.side === "buyer"
    ? `Congratulations, ${opts.clientFirstName}! 🎉🏡 You're officially the owner of ${opts.address}!`
    : `Congratulations, ${opts.clientFirstName}! 🎉 ${opts.address} is officially sold!`;
  return [
    opener,
    "",
    "Your after-closing checklist:",
    ...items.map((x, i) => `${i + 1}. ${x}`),
    "",
    "It was a joy working with you. If you have a minute, a review or referral means the world to me.",
    `${opts.agentName} · ${opts.agentPhone}`,
  ].join("\n");
}
