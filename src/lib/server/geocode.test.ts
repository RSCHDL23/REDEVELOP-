import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseCensus } from "./geocode";

describe("geocode", () => {
  it("reads the Census Geocoder response", () => {
    const sample = { result: { addressMatches: [{ matchedAddress: "418 MAPLE AVE, OAK PARK, IL, 60302", coordinates: { x: -87.7975, y: 41.8805 } }] } };
    expect(parseCensus(sample)).toEqual({ address: "418 MAPLE AVE, OAK PARK, IL, 60302", lat: 41.8805, lng: -87.7975 });
    expect(parseCensus({ result: { addressMatches: [] } })).toBeNull();
    expect(parseCensus(null)).toBeNull();
  });
});
