import { describe, it, expect } from "vitest";
import { servicesForSport, ALL_SERVICE_DEFS } from "~/utils/services/canonical";
import { SPORT_POSITIONS } from "~/utils/positions/canonical";

describe("servicesForSport", () => {
  it("returns [] for a nil or unknown sport", () => {
    expect(servicesForSport(null)).toEqual([]);
    expect(servicesForSport(undefined)).toEqual([]);
    expect(servicesForSport("Quidditch")).toEqual([]);
  });

  it("offers NCSA (the all-sports service) for every sport in the vocabulary", () => {
    // ALL_SPORTS is derived from SPORT_POSITIONS, so NCSA must resolve for every
    // canonical sport — this fails if the two registries ever drift apart.
    for (const sport of Object.keys(SPORT_POSITIONS)) {
      const keys = servicesForSport(sport).map((d) => d.key);
      expect(keys, `${sport} should offer NCSA`).toContain("ncsa_id");
    }
  });

  it("scopes sport-specific services (Perfect Game is baseball/softball only)", () => {
    expect(servicesForSport("Baseball").map((d) => d.key)).toContain(
      "perfect_game_id",
    );
    expect(servicesForSport("Basketball").map((d) => d.key)).not.toContain(
      "perfect_game_id",
    );
  });

  it("every service def has a unique key", () => {
    const keys = ALL_SERVICE_DEFS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
