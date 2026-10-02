/**
 * Reads the main terms from a pre-approval letter's text. Letters vary, so the
 * agent or buyer confirms (and can fix) every value before it's saved.
 */
export interface LetterTerms {
  lender?: string;
  loanType?: "Conventional" | "FHA" | "VA" | "USDA" | "Jumbo" | "NACA";
  purchasePrice?: number;
  loanAmount?: number;
  downPct?: number;
  ratePct?: number;
  termYears?: number;
  expiresOn?: string; // YYYY-MM-DD
}

const money = (s: string) => Number(s.replace(/[$,\s]/g, ""));
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function toISO(raw: string): string | undefined {
  const t = raw.trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  m = t.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const mo = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    if (mo >= 0) return `${m[3]}-${String(mo + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? t : undefined;
}

export function readLetter(text: string): LetterTerms {
  const flat = text.replace(/\s+/g, " ");
  const out: LetterTerms = {};

  const type = flat.match(/\b(conventional|fha|va|usda|jumbo|naca)\b/i)?.[1];
  if (type) out.loanType = (type.length <= 4 && type.toUpperCase() !== "JUMBO" ? type.toUpperCase() : type[0].toUpperCase() + type.slice(1).toLowerCase()) as LetterTerms["loanType"];

  const price = flat.match(/(?:purchase|sales?|maximum)\s*price[^$\d]{0,40}\$?\s?([\d,]{5,})/i)?.[1];
  if (price) out.purchasePrice = money(price);
  const loan = flat.match(/(?:base\s+)?(?:loan|mortgage)\s*amount[^$\d]{0,40}\$?\s?([\d,]{5,})/i)?.[1];
  if (loan) out.loanAmount = money(loan);
  if (!out.purchasePrice && !out.loanAmount) {
    const amounts = [...flat.matchAll(/\$\s?([\d,]{6,})/g)].map((x) => money(x[1])).filter((n) => n >= 25000 && n <= 20000000);
    if (amounts.length) out.purchasePrice = Math.max(...amounts);
  }

  const down = flat.match(/down\s*payment[^%]{0,40}?(\d{1,2}(?:\.\d{1,2})?)\s?%/i)?.[1];
  if (down) out.downPct = Number(down);
  else if (out.purchasePrice && out.loanAmount && out.loanAmount <= out.purchasePrice) out.downPct = Math.round((1 - out.loanAmount / out.purchasePrice) * 1000) / 10;

  const rate = flat.match(/(?:interest\s*)?rate[^%\d]{0,30}(\d{1,2}\.\d{1,3})\s?%/i)?.[1];
  if (rate) out.ratePct = Number(rate);
  const term = flat.match(/\b(10|15|20|25|30|40)[-\s]?(?:year|yr)\b/i)?.[1];
  if (term) out.termYears = Number(term);

  const exp = flat.match(/(?:expir\w*|valid\s+(?:through|until|thru)|good\s+(?:through|until))\s*(?:on|date)?:?\s*([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/i)?.[1];
  if (exp) out.expiresOn = toISO(exp);

  const lender = text.split(/\n/).map((l) => l.trim()).find((l) => l.length <= 70 && /\b(mortgage|bank|lending|home loans|credit union|financial|funding)\b/i.test(l) && !/pre-?approv|dear|congratulations/i.test(l));
  if (lender) out.lender = lender.replace(/\s{2,}/g, " ");
  return out;
}
