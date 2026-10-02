import type { Financing } from "@/lib/data/types";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** One line about how a buyer is paying. */
export function financingSummary(f: Financing): string {
  if (f.kind === "proof_of_funds") return `Cash buyer${f.amount ? ` · ${usd(f.amount)} proof of funds` : ""}`;
  if (f.kind === "estimate") return `Estimate only${f.amount ? ` · wants about ${usd(f.amount)}/month` : ""}${f.purchasePrice ? ` · about ${usd(f.purchasePrice)}` : ""}`;
  return [
    `Pre-approved${f.purchasePrice ? ` up to ${usd(f.purchasePrice)}` : ""}`,
    f.loanType || null,
    f.ratePct ? `${f.ratePct}%` : null,
    f.downPct != null ? `${f.downPct}% down` : null,
    f.lender || null,
  ].filter(Boolean).join(" · ");
}

/** Opens the mortgage calculator filled in with the buyer's terms. */
export function calculatorLink(f: Financing, opts: { naca?: boolean } = {}): string {
  const q = new URLSearchParams();
  if (f.kind === "estimate") {
    q.set("mode", "budget");
    if (f.amount) q.set("monthly", String(Math.round(f.amount)));
  } else {
    q.set("mode", "price");
    if (f.purchasePrice) q.set("price", String(Math.round(f.purchasePrice)));
    if (f.ratePct) q.set("rate", String(f.ratePct));
    if (f.downPct != null) q.set("down", String(f.downPct));
    if (f.termYears) q.set("years", String(f.termYears));
    if (f.kind === "preapproval") q.set("from", "preapproval");
  }
  if (opts.naca || /naca/i.test(f.loanType)) q.set("naca", "1");
  return `/calculator?${q.toString()}`;
}

/** Pre-approval or proof of funds is out of date. */
export const financingExpired = (f: Financing, today: string) => !!f.expiresOn && f.expiresOn < today;

/** Asks a new buyer for their pre-approval (or proof of funds), with a fallback if they have neither. */
export function askForFinancingMessage(p: { clientFirst: string; agentName: string; agentPhone: string }): string {
  return [
    `Hi ${p.clientFirst}! Before we start touring, please send me your pre-approval letter (a photo or PDF is fine). Listing agents usually ask for it before showings and offers.`,
    `Paying cash? A recent bank or brokerage statement showing the funds works instead.`,
    `No pre-approval yet? I can connect you with lenders I trust, or we can start with an estimate of what you can afford based on the monthly payment you're comfortable with.`,
    `${p.agentName}${p.agentPhone ? ` · ${p.agentPhone}` : ""}`,
  ].join("\n\n");
}
