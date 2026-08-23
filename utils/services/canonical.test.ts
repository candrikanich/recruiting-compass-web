import { describe, it, expect } from "vitest";
import {
  servicesForSport,
  serviceProfileUrl,
  ALL_SERVICE_DEFS,
} from "./canonical";

const keys = (sport: string | null | undefined) =>
  servicesForSport(sport).map((s) => s.key);

const ALL_SPORTS = [
  "Baseball",
  "Softball",
  "Basketball",
  "Football",
  "Soccer",
  "Volleyball",
  "Track & Field",
  "Swimming",
  "Cross Country",
  "Tennis",
  "Golf",
  "Lacrosse",
  "Field Hockey",
  "Ice Hockey",
  "Wrestling",
  "Rowing",
  "Water Polo",
];

const HUDL_SPORTS = [
  "Football",
  "Basketball",
  "Volleyball",
  "Soccer",
  "Lacrosse",
  "Ice Hockey",
  "Field Hockey",
  "Water Polo",
  "Wrestling",
];

describe("servicesForSport", () => {
  it("offers NCSA for every sport", () => {
    for (const sport of ALL_SPORTS) {
      expect(keys(sport)).toContain("ncsa_id");
    }
  });

  it("offers Hudl only for its sport list", () => {
    for (const sport of ALL_SPORTS) {
      const hasHudl = keys(sport).includes("hudl_url");
      expect(hasHudl).toBe(HUDL_SPORTS.includes(sport));
    }
  });

  it("offers Perfect Game and Prep Baseball only for baseball and softball", () => {
    for (const sport of ALL_SPORTS) {
      const k = keys(sport);
      const expected = sport === "Baseball" || sport === "Softball";
      expect(k.includes("perfect_game_id")).toBe(expected);
      expect(k.includes("prep_baseball_id")).toBe(expected);
    }
  });

  it("orders services ncsa → hudl → perfect_game → prep_baseball", () => {
    expect(keys("Baseball")).toEqual([
      "ncsa_id",
      "perfect_game_id",
      "prep_baseball_id",
    ]);
    expect(keys("Football")).toEqual(["ncsa_id", "hudl_url"]);
    expect(keys("Golf")).toEqual(["ncsa_id"]);
  });

  it("returns [] for nil / unknown sport", () => {
    expect(servicesForSport(null)).toEqual([]);
    expect(servicesForSport(undefined)).toEqual([]);
    expect(servicesForSport("")).toEqual([]);
    expect(servicesForSport("Quidditch")).toEqual([]);
  });

  it("uses the exact Perfect Game urlTemplate", () => {
    const pg = ALL_SERVICE_DEFS.find((s) => s.key === "perfect_game_id")!;
    expect(pg.urlTemplate).toBe(
      "https://www.perfectgame.org/Players/Playerprofile.aspx?ID={value}",
    );
    expect(pg.signupUrl).toBe("https://www.perfectgame.org/");
  });
});

describe("serviceProfileUrl", () => {
  const pg = ALL_SERVICE_DEFS.find((s) => s.key === "perfect_game_id")!;
  const hudl = ALL_SERVICE_DEFS.find((s) => s.key === "hudl_url")!;
  const prep = ALL_SERVICE_DEFS.find((s) => s.key === "prep_baseball_id")!;

  it("builds an id link from the urlTemplate", () => {
    expect(serviceProfileUrl(pg, "12345")).toBe(
      "https://www.perfectgame.org/Players/Playerprofile.aspx?ID=12345",
    );
  });

  it("returns the stored value itself for url-kind services", () => {
    expect(serviceProfileUrl(hudl, "https://hudl.com/profile/abc")).toBe(
      "https://hudl.com/profile/abc",
    );
  });

  it("returns null for an empty / blank value", () => {
    expect(serviceProfileUrl(pg, "")).toBeNull();
    expect(serviceProfileUrl(pg, "   ")).toBeNull();
    expect(serviceProfileUrl(hudl, undefined)).toBeNull();
    expect(serviceProfileUrl(hudl, null)).toBeNull();
  });

  it("trims the value before substituting", () => {
    expect(serviceProfileUrl(pg, "  99 ")).toBe(
      "https://www.perfectgame.org/Players/Playerprofile.aspx?ID=99",
    );
  });

  it("tags each def with the right linkKind", () => {
    expect(pg.linkKind).toBe("template");
    expect(hudl.linkKind).toBe("url");
    expect(prep.linkKind).toBe("prepBaseball");
    expect(prep.urlTemplate).toBeUndefined();
  });

  describe("prepBaseball kind", () => {
    it("builds the slug-based URL from state + name (ignores the id value)", () => {
      expect(
        serviceProfileUrl(prep, {
          value: "ignored-id",
          state: "OH",
          name: "Owen Andrikanich",
        }),
      ).toBe("https://www.prepbaseballreport.com/profiles/OH/owen-andrikanich");
    });

    it("normalizes a full state name before building", () => {
      expect(
        serviceProfileUrl(prep, { state: "Ohio", name: "Owen Andrikanich" }),
      ).toBe("https://www.prepbaseballreport.com/profiles/OH/owen-andrikanich");
    });

    it("returns null when the state is missing or invalid", () => {
      expect(serviceProfileUrl(prep, { name: "Owen Andrikanich" })).toBeNull();
      expect(
        serviceProfileUrl(prep, { state: "Narnia", name: "Owen Andrikanich" }),
      ).toBeNull();
    });

    it("returns null when the name is missing or blank", () => {
      expect(serviceProfileUrl(prep, { state: "OH" })).toBeNull();
      expect(serviceProfileUrl(prep, { state: "OH", name: "   " })).toBeNull();
    });

    it("returns null when only a bare value string is passed (no state/name)", () => {
      expect(serviceProfileUrl(prep, "owen-andrikanich")).toBeNull();
    });
  });
});
