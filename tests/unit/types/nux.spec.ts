import { describe, it, expect } from "vitest";
import {
  hasNuxCompletionExpired,
  NUX_AUTO_HIDE_THRESHOLD_HOURS,
} from "~/types/nux";

describe("hasNuxCompletionExpired", () => {
  it("returns false when completedAt is null", () => {
    expect(hasNuxCompletionExpired(null)).toBe(false);
  });

  it("returns false just under the 24h threshold", () => {
    const now = new Date("2026-01-02T00:00:00Z");
    const completedAt = new Date(
      now.getTime() - (NUX_AUTO_HIDE_THRESHOLD_HOURS * 3_600_000 - 1),
    ).toISOString();
    expect(hasNuxCompletionExpired(completedAt, now)).toBe(false);
  });

  it("returns true exactly at the 24h threshold", () => {
    const now = new Date("2026-01-02T00:00:00Z");
    const completedAt = new Date(
      now.getTime() - NUX_AUTO_HIDE_THRESHOLD_HOURS * 3_600_000,
    ).toISOString();
    expect(hasNuxCompletionExpired(completedAt, now)).toBe(true);
  });

  it("returns true well past the 24h threshold", () => {
    const now = new Date("2026-01-02T00:00:00Z");
    const completedAt = new Date(now.getTime() - 48 * 3_600_000).toISOString();
    expect(hasNuxCompletionExpired(completedAt, now)).toBe(true);
  });
});
