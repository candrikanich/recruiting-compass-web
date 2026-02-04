import { describe, it, expect } from "vitest";
import { useSportsPositionLookup } from "~/composables/useSportsPositionLookup";

describe("useSportsPositionLookup", () => {
  it("should return list of common sports", () => {
    const { commonSports } = useSportsPositionLookup();

    expect(commonSports).toContain("Baseball");
    expect(commonSports).toContain("Basketball");
    expect(commonSports).toContain("Soccer");
    expect(commonSports.length).toBeGreaterThan(0);
  });

  it("should return baseball positions for Baseball sport", () => {
    const { getPositionsBySport } = useSportsPositionLookup();
    const positions = getPositionsBySport("Baseball");

    expect(positions).toContain("P");
    expect(positions).toContain("C");
    expect(positions).toContain("1B");
    expect(positions).toContain("SS");
    expect(positions).toContain("LF");
    expect(positions.length).toBe(11);
  });

  it("should return basketball positions for Basketball sport", () => {
    const { getPositionsBySport } = useSportsPositionLookup();
    const positions = getPositionsBySport("Basketball");

    expect(positions).toContain("PG");
    expect(positions).toContain("SG");
    expect(positions).toContain("SF");
    expect(positions).toContain("PF");
    expect(positions).toContain("C");
    expect(positions.length).toBe(5);
  });

  it("should return soccer positions for Soccer sport", () => {
    const { getPositionsBySport } = useSportsPositionLookup();
    const positions = getPositionsBySport("Soccer");

    expect(positions).toContain("GK");
    expect(positions).toContain("DEF");
    expect(positions).toContain("MID");
    expect(positions).toContain("FWD");
    expect(positions.length).toBe(4);
  });

  it("should return football positions for Football sport", () => {
    const { getPositionsBySport } = useSportsPositionLookup();
    const positions = getPositionsBySport("Football");

    expect(positions).toContain("QB");
    expect(positions).toContain("RB");
    expect(positions).toContain("WR");
    expect(positions).toContain("TE");
    expect(positions).toBeInstanceOf(Array);
  });

  it("should return empty array for unknown sport", () => {
    const { getPositionsBySport } = useSportsPositionLookup();
    const positions = getPositionsBySport("UnknownSport");

    expect(positions).toEqual([]);
  });

  it("should return positions for all sports in commonSports", () => {
    const { commonSports, getPositionsBySport } = useSportsPositionLookup();

    commonSports.forEach((sport) => {
      const positions = getPositionsBySport(sport);
      expect(positions).toBeInstanceOf(Array);
      expect(positions.length).toBeGreaterThan(0);
    });
  });

  it("should include Softball with same positions as Baseball", () => {
    const { getPositionsBySport } = useSportsPositionLookup();
    const baseballPositions = getPositionsBySport("Baseball");
    const softballPositions = getPositionsBySport("Softball");

    expect(softballPositions).toEqual(baseballPositions);
  });

  it("should include Track & Field sport", () => {
    const { commonSports, getPositionsBySport } = useSportsPositionLookup();

    expect(commonSports).toContain("Track & Field");
    const positions = getPositionsBySport("Track & Field");
    expect(positions).toContain("Distance");
    expect(positions).toContain("Sprints");
  });

  it("should include Ice Hockey sport", () => {
    const { commonSports, getPositionsBySport } = useSportsPositionLookup();

    expect(commonSports).toContain("Ice Hockey");
    const positions = getPositionsBySport("Ice Hockey");
    expect(positions).toContain("G");
    expect(positions).toContain("D");
    expect(positions).toContain("LW");
    expect(positions).toContain("C");
    expect(positions).toContain("RW");
  });

  it("should include Volleyball sport", () => {
    const { commonSports, getPositionsBySport } = useSportsPositionLookup();

    expect(commonSports).toContain("Volleyball");
    const positions = getPositionsBySport("Volleyball");
    expect(positions).toContain("S");
    expect(positions).toContain("MB");
    expect(positions).toContain("OH");
  });

  it("should include Lacrosse sport", () => {
    const { commonSports, getPositionsBySport } = useSportsPositionLookup();

    expect(commonSports).toContain("Lacrosse");
    const positions = getPositionsBySport("Lacrosse");
    expect(positions).toContain("G");
    expect(positions).toContain("D");
    expect(positions).toContain("M");
    expect(positions).toContain("A");
  });

  it("should include Swimming sport", () => {
    const { commonSports, getPositionsBySport } = useSportsPositionLookup();

    expect(commonSports).toContain("Swimming");
    const positions = getPositionsBySport("Swimming");
    expect(positions).toContain("Distance");
    expect(positions).toContain("Sprint");
    expect(positions).toContain("IM");
    expect(positions).toContain("Dive");
  });

  it("should include Tennis sport", () => {
    const { commonSports, getPositionsBySport } = useSportsPositionLookup();

    expect(commonSports).toContain("Tennis");
    const positions = getPositionsBySport("Tennis");
    expect(positions).toContain("Singles");
    expect(positions).toContain("Doubles");
  });

  it("should include Golf sport", () => {
    const { commonSports, getPositionsBySport } = useSportsPositionLookup();

    expect(commonSports).toContain("Golf");
    const positions = getPositionsBySport("Golf");
    expect(positions).toEqual(["Player"]);
  });

  it("should include Cross Country sport", () => {
    const { commonSports, getPositionsBySport } = useSportsPositionLookup();

    expect(commonSports).toContain("Cross Country");
    const positions = getPositionsBySport("Cross Country");
    expect(positions).toEqual(["Runner"]);
  });

  it("should have consistent sport names case", () => {
    const { commonSports } = useSportsPositionLookup();

    // All sports should be properly capitalized strings
    commonSports.forEach((sport) => {
      expect(typeof sport).toBe("string");
      expect(sport.length).toBeGreaterThan(0);
    });
  });

  it("should handle case sensitivity correctly", () => {
    const { getPositionsBySport } = useSportsPositionLookup();

    // Lowercase should return empty
    expect(getPositionsBySport("baseball")).toEqual([]);
    // Correct case should return positions
    expect(getPositionsBySport("Baseball").length).toBeGreaterThan(0);
  });
});
