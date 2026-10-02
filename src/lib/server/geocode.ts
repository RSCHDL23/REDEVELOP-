import "server-only";

/**
 * Turns a U.S. street address into map coordinates using the free U.S. Census
 * Geocoder (no key needed). Swap in Google or Mapbox later if you prefer.
 */
export interface GeoResult { address: string; lat: number; lng: number }

export function parseCensus(json: unknown): GeoResult | null {
  const match = (json as { result?: { addressMatches?: { matchedAddress: string; coordinates: { x: number; y: number } }[] } })?.result?.addressMatches?.[0];
  if (!match || typeof match.coordinates?.x !== "number" || typeof match.coordinates?.y !== "number") return null;
  return { address: match.matchedAddress, lat: match.coordinates.y, lng: match.coordinates.x };
}

export async function geocode(address: string): Promise<GeoResult | null> {
  const q = address.trim();
  if (q.length < 5 || q.length > 200) return null;
  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(q)}&benchmark=Public_AR_Current&format=json`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" }, next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return parseCensus(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
