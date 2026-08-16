import { describe, it, expect } from "vitest";
import { formatDigestLines } from "~/server/utils/weeklyDigest";

describe("formatDigestLines", () => {
  it("pluralizes counts correctly", () => {
    const lines = formatDigestLines({
      interactions: 1,
      events: 0,
      metrics: 2,
    });
    expect(lines).toEqual([
      "1 coach interaction logged this week",
      "0 events attended",
      "2 performance metrics recorded",
    ]);
  });

  it("renders a fully empty week without crashing", () => {
    const lines = formatDigestLines({ interactions: 0, events: 0, metrics: 0 });
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("0 coach interactions");
  });
});
