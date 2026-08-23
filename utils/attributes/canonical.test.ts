import { describe, it, expect } from "vitest";
import { attributesForSport, ATTRIBUTES_BY_SPORT } from "./canonical";

const keys = (sport: string | null | undefined) =>
  attributesForSport(sport).map((a) => a.key);

describe("attributesForSport", () => {
  it("returns bats + throws for baseball and softball", () => {
    expect(keys("Baseball")).toEqual(["bats", "throws"]);
    expect(keys("Softball")).toEqual(["bats", "throws"]);
    const bats = attributesForSport("Baseball")[0];
    expect(bats.options).toEqual(["L", "R", "S"]);
    expect(bats.optionLabels).toEqual({ L: "Left", R: "Right", S: "Switch" });
    expect(bats.positions).toBeUndefined();
  });

  it("returns shooting_hand for basketball", () => {
    expect(keys("Basketball")).toEqual(["shooting_hand"]);
  });

  it("returns shoots (ungated) always and catches gated to Goalie for ice hockey", () => {
    const defs = attributesForSport("Ice Hockey");
    expect(defs.map((a) => a.key)).toEqual(["shoots", "catches"]);
    const shoots = defs.find((a) => a.key === "shoots")!;
    const catches = defs.find((a) => a.key === "catches")!;
    expect(shoots.positions).toBeUndefined();
    expect(catches.positions).toEqual(["Goalie"]);
  });

  it("gates football throwing_hand to Quarterback and kicking_foot to Kicker/Punter", () => {
    const defs = attributesForSport("Football");
    const throwing = defs.find((a) => a.key === "throwing_hand")!;
    const kicking = defs.find((a) => a.key === "kicking_foot")!;
    expect(throwing.positions).toEqual(["Quarterback"]);
    expect(kicking.positions).toEqual(["Kicker", "Punter"]);
  });

  it("uses closed token sets for the multi-option attributes", () => {
    const rowing = attributesForSport("Rowing");
    const side = rowing.find((a) => a.key === "rowing_side")!;
    expect(side.options).toEqual(["port", "starboard", "both", "cox"]);
    const tennis = attributesForSport("Tennis");
    const backhand = tennis.find((a) => a.key === "backhand_style")!;
    expect(backhand.options).toEqual(["one", "two"]);
  });

  it("returns [] for sports without attributes", () => {
    expect(attributesForSport("Wrestling")).toEqual([]);
    expect(attributesForSport("Track & Field")).toEqual([]);
  });

  it("returns [] for nil / unknown sport", () => {
    expect(attributesForSport(null)).toEqual([]);
    expect(attributesForSport(undefined)).toEqual([]);
    expect(attributesForSport("")).toEqual([]);
    expect(attributesForSport("Quidditch")).toEqual([]);
  });

  it("options and optionLabels agree for every def", () => {
    for (const defs of Object.values(ATTRIBUTES_BY_SPORT)) {
      for (const d of defs) {
        expect(d.options).toEqual(Object.keys(d.optionLabels));
      }
    }
  });
});
