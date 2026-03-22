import { describe, it, expect } from "vitest";
import { calculateDistance, formatDistance } from "~/utils/distance";

describe("calculateDistance", () => {
  it("returns 0 for identical coordinates", () => {
    const coords = { latitude: 40.7128, longitude: -74.006 };
    expect(calculateDistance(coords, coords)).toBe(0);
  });

  it("calculates distance between New York and Los Angeles (~2451 miles)", () => {
    const newYork = { latitude: 40.7128, longitude: -74.006 };
    const losAngeles = { latitude: 34.0522, longitude: -118.2437 };
    const distance = calculateDistance(newYork, losAngeles);
    // ~2451 miles — allow ±5 for rounding
    expect(distance).toBeGreaterThan(2440);
    expect(distance).toBeLessThan(2465);
  });

  it("calculates distance between Chicago and Houston (~940 miles)", () => {
    const chicago = { latitude: 41.8781, longitude: -87.6298 };
    const houston = { latitude: 29.7604, longitude: -95.3698 };
    const distance = calculateDistance(chicago, houston);
    expect(distance).toBeGreaterThan(930);
    expect(distance).toBeLessThan(955);
  });

  it("returns same distance regardless of direction (symmetry)", () => {
    const a = { latitude: 37.7749, longitude: -122.4194 };
    const b = { latitude: 47.6062, longitude: -122.3321 };
    expect(calculateDistance(a, b)).toBe(calculateDistance(b, a));
  });

  it("returns a positive number for distinct coordinates", () => {
    const a = { latitude: 0, longitude: 0 };
    const b = { latitude: 1, longitude: 1 };
    expect(calculateDistance(a, b)).toBeGreaterThan(0);
  });

  it("handles coordinates spanning the equator", () => {
    const north = { latitude: 10, longitude: 0 };
    const south = { latitude: -10, longitude: 0 };
    const distance = calculateDistance(north, south);
    // ~20 degrees latitude ≈ 1381 miles
    expect(distance).toBeGreaterThan(1370);
    expect(distance).toBeLessThan(1395);
  });
});

describe("formatDistance", () => {
  it("formats a simple integer distance", () => {
    expect(formatDistance(150)).toBe("150 miles");
  });

  it("formats a distance of 1 mile", () => {
    expect(formatDistance(1)).toBe("1 miles");
  });

  it("formats zero miles", () => {
    expect(formatDistance(0)).toBe("0 miles");
  });

  it("formats a large distance with locale separators", () => {
    const result = formatDistance(1234);
    // toLocaleString may produce "1,234" or "1234" depending on locale
    expect(result).toContain("miles");
    expect(result).toContain("1");
  });

  it("formats a fractional distance", () => {
    const result = formatDistance(0.5);
    expect(result).toContain("miles");
  });
});
