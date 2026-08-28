import { describe, it, expect } from "vitest";
import type { NcaaCatalogSchool } from "~/utils/ncaaDatabase";
import {
  catalogKeyFor,
  gpaBucket,
  divisionWeights,
  rankSchoolRecommendations,
  recommendationToSchoolDraft,
  resolveHomeState,
} from "~/utils/schoolRecommendations";
import { isAdjacentState } from "~/utils/usStateAdjacency";

const catalog: NcaaCatalogSchool[] = [
  {
    name: "Ohio State University",
    division: "D1",
    conference: "Big Ten",
    state: "OH",
    website: "osu.edu",
    athleticWebsite: "ohiostatebuckeyes.com",
  },
  {
    name: "University of Cincinnati",
    division: "D1",
    conference: "Big 12 Conference",
    state: "OH",
    website: "uc.edu",
    athleticWebsite: null,
  },
  {
    name: "Kent State University",
    division: "D1",
    conference: "MAC",
    state: "OH",
    website: "kent.edu",
    athleticWebsite: null,
  },
  {
    name: "Bowling Green State University",
    division: "D1",
    conference: "MAC",
    state: "OH",
    website: "bgsu.edu",
    athleticWebsite: null,
  },
  {
    name: "Miami University",
    division: "D1",
    conference: "MAC",
    state: "OH",
    website: "miamioh.edu",
    athleticWebsite: null,
  },
  {
    name: "Indiana University",
    division: "D1",
    conference: "Big Ten",
    state: "IN",
    website: "indiana.edu",
    athleticWebsite: null,
  },
  {
    name: "Duke University",
    division: "D1",
    conference: "ACC",
    state: "NC",
    website: "duke.edu",
    athleticWebsite: null,
  },
  {
    name: "Grand Valley State",
    division: "D2",
    conference: "GLIAC",
    state: "MI",
    website: "gvsu.edu",
    athleticWebsite: null,
  },
  {
    name: "Williams College",
    division: "D3",
    conference: "NESCAC",
    state: "MA",
    website: "williams.edu",
    athleticWebsite: null,
  },
];

describe("catalogKeyFor", () => {
  it("normalizes punctuation and case", () => {
    expect(catalogKeyFor("Ohio State University")).toBe(
      "ohio state university",
    );
    expect(catalogKeyFor("  Ohio-State   University ")).toBe(
      "ohio state university",
    );
  });
});

describe("gpaBucket / divisionWeights", () => {
  it("tilts high GPA toward D1", () => {
    expect(gpaBucket(3.8)).toBe("high");
    const weights = divisionWeights(3.8);
    expect(weights.D1).toBeGreaterThan(weights.D2);
    expect(weights.D2).toBeGreaterThan(weights.D3);
  });

  it("tilts low GPA toward D3", () => {
    expect(gpaBucket(2.6)).toBe("low");
    const weights = divisionWeights(2.6);
    expect(weights.D3).toBeGreaterThan(weights.D1);
  });

  it("treats missing GPA as unknown", () => {
    expect(gpaBucket(null)).toBe("unknown");
    expect(divisionWeights(null).D1).toBeGreaterThan(0);
  });
});

describe("resolveHomeState", () => {
  it("prefers location prefs over school_state over hometown", () => {
    expect(
      resolveHomeState({
        locationState: "oh",
        schoolState: "IN",
        hometownState: "NC",
      }),
    ).toBe("OH");
  });

  it("returns null when no 2-letter state is present", () => {
    expect(
      resolveHomeState({
        locationState: "Ohio",
        schoolState: "",
        hometownState: null,
      }),
    ).toBeNull();
  });
});

describe("isAdjacentState", () => {
  it("treats IN as adjacent to OH", () => {
    expect(isAdjacentState("OH", "IN")).toBe(true);
    expect(isAdjacentState("OH", "OH")).toBe(false);
    expect(isAdjacentState("OH", "CA")).toBe(false);
  });
});

describe("rankSchoolRecommendations", () => {
  it("ranks same-state schools above far-away schools", () => {
    const ranked = rankSchoolRecommendations({
      catalog,
      homeState: "OH",
      gpa: 3.6,
      excludedKeys: new Set(),
      limit: 8,
    });
    expect(ranked[0]?.state).toBe("OH");
    const ohioIdx = ranked.findIndex(
      (row) => row.name === "Ohio State University",
    );
    const dukeIdx = ranked.findIndex((row) => row.name === "Duke University");
    expect(ohioIdx).toBeGreaterThanOrEqual(0);
    if (dukeIdx >= 0) {
      expect(ohioIdx).toBeLessThan(dukeIdx);
    }
  });

  it("omits tracked or dismissed catalog keys", () => {
    const ranked = rankSchoolRecommendations({
      catalog,
      homeState: "OH",
      gpa: 3.6,
      excludedKeys: new Set([catalogKeyFor("Ohio State University")]),
      limit: 8,
    });
    expect(ranked.map((row) => row.name)).not.toContain(
      "Ohio State University",
    );
  });

  it("caps a single conference at two schools before filling the rest", () => {
    const ranked = rankSchoolRecommendations({
      catalog,
      homeState: "OH",
      gpa: 3.6,
      excludedKeys: new Set(),
      limit: 5,
    });
    const macCount = ranked.filter((row) => row.conference === "MAC").length;
    expect(macCount).toBeLessThanOrEqual(2);
  });

  it("still returns schools when no home state is known", () => {
    const ranked = rankSchoolRecommendations({
      catalog,
      homeState: null,
      gpa: null,
      excludedKeys: new Set(),
      limit: 3,
    });
    expect(ranked).toHaveLength(3);
  });

  it("maps a recommendation into a school-create draft", () => {
    const [first] = rankSchoolRecommendations({
      catalog,
      homeState: "OH",
      gpa: 3.6,
      excludedKeys: new Set(),
      limit: 1,
    });
    expect(first).toBeDefined();
    const draft = recommendationToSchoolDraft(first!);
    expect(draft.name).toBe(first!.name);
    expect(draft.status).toBe("researching");
    expect(draft.division).toBe(first!.division);
  });
});
