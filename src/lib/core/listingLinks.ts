/**
 * Reads the address out of a Zillow, Redfin or Realtor.com home link, so a
 * buyer can send a home to their agent in one tap. Only the link is used;
 * nothing is copied from those sites.
 */
export type ListingSite = "zillow" | "redfin" | "realtor";

export const SITE_NAMES: Record<ListingSite, string> = { zillow: "Zillow", redfin: "Redfin", realtor: "Realtor.com" };

const words = (s: string) => decodeURIComponent(s).replace(/[-_+]+/g, " ").replace(/\s+/g, " ").trim();

/** Finds the first link in shared text ("Check out this home! https://…"). */
export function firstUrl(text: string): string | null {
  return text.match(/https?:\/\/[^\s<>"']+/i)?.[0] ?? null;
}

export function parseListingUrl(raw: string): { site: ListingSite; url: string; address: string } | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const parts = u.pathname.split("/").filter(Boolean);
  const clean = `https://www.${host}${u.pathname}`;

  if (host === "zillow.com") {
    // /homedetails/2519-W-Giddings-St-Chicago-IL-60625/12345_zpid/
    const i = parts.indexOf("homedetails");
    const slug = i >= 0 ? parts[i + 1] : undefined;
    if (!slug) return { site: "zillow", url: clean, address: "" };
    const m = slug.match(/^(.*)-([A-Za-z]{2})-(\d{5})$/);
    return { site: "zillow", url: clean, address: m ? `${words(m[1])}, ${m[2].toUpperCase()} ${m[3]}` : words(slug) };
  }
  if (host === "redfin.com") {
    // /IL/Chicago/2519-W-Giddings-St-60625/home/12345  (or /unit-3/home/…)
    const [state, city, street] = parts;
    if (!state || !city || !street) return { site: "redfin", url: clean, address: "" };
    const m = street.match(/^(.*)-(\d{5})$/);
    const unit = parts[3]?.startsWith("unit-") ? ` #${parts[3].slice(5)}` : "";
    return { site: "redfin", url: clean, address: `${words(m ? m[1] : street)}${unit}, ${words(city)}, ${state.toUpperCase()}${m ? ` ${m[2]}` : ""}` };
  }
  if (host === "realtor.com") {
    // /realestateandhomes-detail/2519-W-Giddings-St_Chicago_IL_60625_M12345-67890
    const i = parts.indexOf("realestateandhomes-detail");
    const slug = i >= 0 ? parts[i + 1] : undefined;
    if (!slug) return { site: "realtor", url: clean, address: "" };
    const [street, city, state, zip] = slug.split("_");
    if (!street || !city || !state) return { site: "realtor", url: clean, address: words(slug) };
    return { site: "realtor", url: clean, address: `${words(street)}, ${words(city)}, ${state.toUpperCase()}${zip && /^\d{5}$/.test(zip) ? ` ${zip}` : ""}` };
  }
  return null;
}
