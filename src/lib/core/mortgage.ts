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
