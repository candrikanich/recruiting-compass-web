import { describe, it, expect } from "vitest";
import { buildRecruitingCredentials } from "~/utils/profile/recruitingCredentials";

describe("buildRecruitingCredentials", () => {
  it("returns null ncaaId and no services for empty/absent athletic data", () => {
    expect(buildRecruitingCredentials(null)).toEqual({
      ncaaId: null,
      services: [],
    });
    expect(buildRecruitingCredentials(undefined)).toEqual({
      ncaaId: null,
      services: [],
    });
    expect(buildRecruitingCredentials({})).toEqual({
      ncaaId: null,
      services: [],
    });
  });

  it("returns the NCAA ID when present", () => {
    expect(buildRecruitingCredentials({ ncaa_id: "1234567890" })).toEqual({
      ncaaId: "1234567890",
      services: [],
    });
  });

  it("maps a template-kind service value to its resolved public URL", () => {
    const result = buildRecruitingCredentials({
      perfect_game_id: "PG123",
    });
    expect(result.services).toEqual([
      {
        key: "perfect_game_id",
        label: "Perfect Game",
        url: "https://www.perfectgame.org/Players/Playerprofile.aspx?ID=PG123",
      },
    ]);
  });

  it("maps a url-kind service value verbatim", () => {
    const result = buildRecruitingCredentials({
      hudl_url: "https://www.hudl.com/profile/12345/Owen-A",
    });
    expect(result.services).toEqual([
      {
        key: "hudl_url",
        label: "Hudl",
        url: "https://www.hudl.com/profile/12345/Owen-A",
      },
    ]);
  });

  it("skips a signup-only service with no resolvable URL (NCSA)", () => {
    const result = buildRecruitingCredentials({ ncsa_id: "NCSA-1" });
    expect(result.services).toEqual([]);
  });

  it("skips Prep Baseball Report when no playerName is passed", () => {
    const result = buildRecruitingCredentials({
      prep_baseball_id: "PBR-1",
      prep_baseball_state: "TX",
    });
    expect(result.services).toEqual([]);
  });

  it("skips Prep Baseball Report when the state is missing, even with a playerName", () => {
    const result = buildRecruitingCredentials(
      { prep_baseball_id: "PBR-1" },
      "Owen Andrikanich",
    );
    expect(result.services).toEqual([]);
  });

  it("resolves Prep Baseball Report to a slug URL when both state and playerName are present", () => {
    const result = buildRecruitingCredentials(
      { prep_baseball_id: "PBR-1", prep_baseball_state: "TX" },
      "Owen Andrikanich",
    );
    expect(result.services).toEqual([
      {
        key: "prep_baseball_id",
        label: "Prep Baseball Report",
        url: "https://www.prepbaseballreport.com/profiles/TX/owen-andrikanich",
      },
    ]);
  });

  it("only includes services that have a value, ignoring empty strings", () => {
    const result = buildRecruitingCredentials({
      perfect_game_id: "",
      swimcloud_id: "sc-9",
    });
    expect(result.services).toEqual([
      {
        key: "swimcloud_id",
        label: "SwimCloud",
        url: "https://www.swimcloud.com/swimmer/sc-9/",
      },
    ]);
  });

  it("returns multiple services in ALL_SERVICE_DEFS order", () => {
    const result = buildRecruitingCredentials({
      on3_url: "https://www.on3.com/db/owen-a/",
      perfect_game_id: "PG123",
    });
    expect(result.services.map((s) => s.key)).toEqual([
      "perfect_game_id",
      "on3_url",
    ]);
  });

  it("renders Perfect Game and Prep Baseball Report together (Chris's mockup)", () => {
    const result = buildRecruitingCredentials(
      {
        perfect_game_id: "PG123",
        prep_baseball_id: "PBR-1",
        prep_baseball_state: "OH",
      },
      "Owen Andrikanich",
    );
    expect(result.services.map((s) => s.key)).toEqual([
      "perfect_game_id",
      "prep_baseball_id",
    ]);
    expect(result.services[1].url).toBe(
      "https://www.prepbaseballreport.com/profiles/OH/owen-andrikanich",
    );
  });
});
