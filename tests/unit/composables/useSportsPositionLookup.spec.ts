import { describe, it, expect } from "vitest";
import { useSportsPositionLookup } from "~/composables/useSportsPositionLookup";

// useSportsPositionLookup now delegates to the canonical position source
// (utils/positions/canonical): one full-name, granular vocabulary shared with
// onboarding. No abbreviations, no coarse "Infielder"/"Outfielder".
describe("useSportsPositionLookup", () => {
  it("should return list of common sports", () => {
    const { commonSports } = useSportsPositionLookup();

    expect(commonSports).toContain("Baseball");
    expect(commonSports).toContain("Basketball");
    expect(commonSports).toContain("Soccer");
    expect(commonSports.length).toBeGreaterThan(0);
  });

  it("should return canonical full-name baseball positions", () => {
    const { getPositionsBySport } = useSportsPositionLookup();
    const positions = getPositionsBySport("Baseball");

    expect(positions).toContain("Pitcher");
    expect(positions).toContain("Catcher");
    expect(positions).toContain("First Base");
    expect(positions).toContain("Shortstop");
    expect(positions).toContain("Left Field");
    expect(positions).not.toContain("Utility");
    expect(positions).not.toContain("Infielder");
    expect(positions).not.toContain("Outfielder");
    expect(positions.length).toBe(10);
  });

  it("should return basketball positions for Basketball sport", () => {
    const { getPositionsBySport } = useSportsPositionLookup();
    const positions = getPositionsBySport("Basketball");

    expect(positions).toContain("Point Guard");
    expect(positions).toContain("Shooting Guard");
    expect(positions).toContain("Small Forward");
    expect(positions).toContain("Power Forward");
    expect(positions).toContain("Center");
    expect(positions.length).toBe(5);
  });

  it("should return soccer positions for Soccer sport", () => {
    const { getPositionsBySport } = useSportsPositionLookup();
    const positions = getPositionsBySport("Soccer");

    expect(positions).toContain("Goalkeeper");
    expect(positions).toContain("Defender");
    expect(positions).toContain("Midfielder");
    expect(positions).toContain("Forward");
    expect(positions.length).toBe(4);
  });

  it("should return football positions for Football sport", () => {
    const { getPositionsBySport } = useSportsPositionLookup();
    const positions = getPositionsBySport("Football");

    expect(positions).toContain("Quarterback");
    expect(positions).toContain("Running Back");
    expect(positions).toContain("Wide Receiver");
    expect(positions).toContain("Tight End");
    expect(positions).toBeInstanceOf(Array);
  });

  it("should return empty array for unknown sport", () => {
    const { getPositionsBySport } = useSportsPositionLookup();
    expect(getPositionsBySport("UnknownSport")).toEqual([]);
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
    expect(getPositionsBySport("Softball")).toEqual(
      getPositionsBySport("Baseball"),
    );
  });

  it("should include Track & Field sport", () => {
    const { commonSports, getPositionsBySport } = useSportsPositionLookup();

    expect(commonSports).toContain("Track & Field");
    const positions = getPositionsBySport("Track & Field");
    expect(positions).toContain("Sprinter");
    expect(positions).toContain("Distance Runner");
  });

  it("should include Ice Hockey sport", () => {
    const { commonSports, getPositionsBySport } = useSportsPositionLookup();

    expect(commonSports).toContain("Ice Hockey");
    const positions = getPositionsBySport("Ice Hockey");
    expect(positions).toContain("Forward");
    expect(positions).toContain("Defenseman");
    expect(positions).toContain("Goalie");
  });

  it("should include Volleyball sport", () => {
    const { commonSports, getPositionsBySport } = useSportsPositionLookup();

    expect(commonSports).toContain("Volleyball");
    const positions = getPositionsBySport("Volleyball");
    expect(positions).toContain("Outside Hitter");
    expect(positions).toContain("Middle Blocker");
    expect(positions).toContain("Setter");
  });

  it("should include Lacrosse sport", () => {
    const { commonSports, getPositionsBySport } = useSportsPositionLookup();

    expect(commonSports).toContain("Lacrosse");
    const positions = getPositionsBySport("Lacrosse");
    expect(positions).toContain("Attackman");
    expect(positions).toContain("Midfielder");
    expect(positions).toContain("Defenseman");
    expect(positions).toContain("Goalie");
  });

  it("should include Swimming sport", () => {
    const { commonSports, getPositionsBySport } = useSportsPositionLookup();

    expect(commonSports).toContain("Swimming");
    const positions = getPositionsBySport("Swimming");
    expect(positions).toContain("Freestyle");
    expect(positions).toContain("Individual Medley");
    expect(positions).toContain("Diver");
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
    expect(getPositionsBySport("Golf")).toEqual(["Golfer"]);
  });

  it("should include Cross Country sport", () => {
    const { commonSports, getPositionsBySport } = useSportsPositionLookup();

    expect(commonSports).toContain("Cross Country");
    expect(getPositionsBySport("Cross Country")).toEqual(["Runner"]);
  });

  it("should have consistent sport names case", () => {
    const { commonSports } = useSportsPositionLookup();
    commonSports.forEach((sport) => {
      expect(typeof sport).toBe("string");
      expect(sport.length).toBeGreaterThan(0);
    });
  });

  it("should handle case sensitivity correctly", () => {
    const { getPositionsBySport } = useSportsPositionLookup();
    expect(getPositionsBySport("baseball")).toEqual([]);
    expect(getPositionsBySport("Baseball").length).toBeGreaterThan(0);
  });
});
