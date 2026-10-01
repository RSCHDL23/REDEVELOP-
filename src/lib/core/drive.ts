/**
 * Drive time estimates. The beta estimates from straight-line distance so the
 * app works with no paid services. Swap `estimateDriveMinutes` for a maps
 * routing API (Google Routes, Mapbox, etc.) when you are ready.
 */

export interface Point {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_MILES = 3958.8;

export function milesBetween(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

/**
 * City driving: roads wind about 1.3x the straight line, average ~18 mph,
 * plus 4 minutes to park and walk in. Always at least 5 minutes.
 */
export function estimateDriveMinutes(a: Point, b: Point): number {
  const roadMiles = milesBetween(a, b) * 1.3;
  return Math.max(5, Math.round((roadMiles / 18) * 60 + 4));
}

/** Build a symmetric drive-time table for a set of named points. */
export function driveTable(points: Record<string, Point>, estimate = estimateDriveMinutes): Record<string, Record<string, number>> {
  const ids = Object.keys(points);
  const table: Record<string, Record<string, number>> = {};
  for (const a of ids) {
    table[a] = {};
    for (const b of ids) table[a][b] = a === b ? 0 : estimate(points[a], points[b]);
  }
  return table;
}
