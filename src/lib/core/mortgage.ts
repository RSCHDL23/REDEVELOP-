/**
 * Mortgage math for the calculator: payment from a price, the price a monthly
 * budget can buy (how NACA approves: a maximum monthly payment), and payment shock.
 * Estimates only; the lender's numbers are final.
 */
export interface Costs {
  downPct: number;        // e.g. 3.5 means 3.5%
  ratePct: number;        // annual interest rate
  years: number;          // 15, 20, 30
  taxRatePct: number;     // yearly property tax as % of price
  insuranceYear: number;  // homeowner's insurance per year
  hoaMonth: number;
  pmiPct: number;         // yearly mortgage insurance as % of the loan (0 for NACA, VA, 20%+ down)
}

/** Monthly principal and interest. */
export function monthlyPI(loan: number, ratePct: number, years: number): number {
  const n = years * 12;
  const r = ratePct / 100 / 12;
  if (loan <= 0) return 0;
  return r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n));
}

export interface Breakdown { price: number; loan: number; pi: number; tax: number; insurance: number; hoa: number; pmi: number; total: number }

export function paymentFromPrice(price: number, c: Costs): Breakdown {
  const loan = price * (1 - c.downPct / 100);
  const pi = monthlyPI(loan, c.ratePct, c.years);
  const tax = (price * c.taxRatePct) / 100 / 12;
  const insurance = c.insuranceYear / 12;
  const pmi = (loan * c.pmiPct) / 100 / 12;
  return { price, loan, pi, tax, insurance, hoa: c.hoaMonth, pmi, total: pi + tax + insurance + c.hoaMonth + pmi };
}

/** The highest price a total monthly payment covers (taxes, insurance, HOA and PMI included). */
export function priceFromPayment(monthly: number, c: Costs): Breakdown {
  const perDollar = monthlyPI(1, c.ratePct, c.years) * (1 - c.downPct / 100) + c.taxRatePct / 100 / 12 + ((1 - c.downPct / 100) * c.pmiPct) / 100 / 12;
  const fixed = c.insuranceYear / 12 + c.hoaMonth;
  const price = Math.max(0, (monthly - fixed) / perDollar);
  return paymentFromPrice(price, c);
}

/** Payment shock: how much more the new payment is than today's rent or mortgage. NACA members save this each month to show they can afford it. */
export function paymentShock(currentHousing: number, newPayment: number): number {
  return Math.max(0, newPayment - currentHousing);
}

/** NACA Mortgage: no down payment, no closing costs or fees, no mortgage insurance. */
export const NACA_COSTS: Pick<Costs, "downPct" | "pmiPct"> = { downPct: 0, pmiPct: 0 };

/**
 * NACA rate buy-down (naca.com/faq/naca-mortgage-product):
 * 30- and 20-year: 1.5% of the mortgage lowers the rate 0.25% (0.75% per 0.125% step).
 * 15-year: 1% of the mortgage lowers it 0.25% (0.5% per 0.125% step).
 * Lowest rate 0.125%. Seller-paid buy-down can't exceed 10% of the price.
 */
export const NACA_BUYDOWN = { step: 0.125, minRate: 0.125, sellerCapPct: 10 };

export function nacaBuydownCost(loan: number, fromRate: number, toRate: number, years: number): number {
  const steps = Math.max(0, Math.round((fromRate - toRate) / NACA_BUYDOWN.step));
  const pctPerStep = years === 15 ? 0.5 : 0.75;
  return (loan * pctPerStep * steps) / 100;
}

/** Lowest-cost NACA buy-down that brings the payment within the approved monthly amount. */
export function nacaBuydownToAfford(price: number, approvedMonthly: number, startRate: number, c: Omit<Costs, "ratePct" | "downPct" | "pmiPct">) {
  const costs = (rate: number): Costs => ({ ...c, ratePct: rate, downPct: 0, pmiPct: 0 });
  const now = paymentFromPrice(price, costs(startRate));
  if (now.total <= approvedMonthly) return { needed: false as const, rate: startRate, cost: 0, payment: now.total, sellerMax: (price * NACA_BUYDOWN.sellerCapPct) / 100 };
  for (let rate = startRate - NACA_BUYDOWN.step; rate >= NACA_BUYDOWN.minRate - 1e-9; rate -= NACA_BUYDOWN.step) {
    const r = Math.round(rate * 1000) / 1000;
    const p = paymentFromPrice(price, costs(r));
    if (p.total <= approvedMonthly) {
      return { needed: true as const, rate: r, cost: nacaBuydownCost(p.loan, startRate, r, c.years), payment: p.total, sellerMax: (price * NACA_BUYDOWN.sellerCapPct) / 100 };
    }
  }
  return null; // not affordable even at the lowest rate
}

/** Down payment needed for a home to hit a monthly payment target (mortgage insurance drops at 20% down). */
export function downPaymentForPayment(price: number, target: number, c: Omit<Costs, "downPct">): { downPct: number; amount: number; payment: number } | null {
  const total = (d: number) => paymentFromPrice(price, { ...c, downPct: d, pmiPct: d >= 20 ? 0 : c.pmiPct }).total;
  if (total(0) <= target) return { downPct: 0, amount: 0, payment: total(0) };
  if (total(100) > target) return null; // taxes, insurance and HOA alone are over the target
  // Payment drops as the down payment grows (with a step down at 20%); search the smallest that works.
  let lo = 0, hi = 100;
  if (total(20) <= target) {
    // Maybe less than 20% works even with mortgage insurance.
    const below = (() => { let l = 0, h = 19.999; if (total(h) > target) return null; for (let i = 0; i < 50; i++) { const m = (l + h) / 2; if (total(m) <= target) h = m; else l = m; } return h; })();
    if (below !== null) hi = below; else { lo = 0; hi = 20; return { downPct: 20, amount: price * 0.2, payment: total(20) }; }
    return { downPct: Math.ceil(hi * 10) / 10, amount: Math.ceil((price * hi) / 100 / 100) * 100, payment: total(hi) };
  }
  lo = 20;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (total(m) <= target) hi = m; else lo = m; }
  return { downPct: Math.ceil(hi * 10) / 10, amount: Math.ceil((price * hi) / 100 / 100) * 100, payment: total(hi) };
}
