import { describe, it, expect } from "vitest";
import { assemblePublicProfile } from "~/server/api/public/profile/[slug].get";

describe("assemblePublicProfile", () => {
  const base = {
    profile: {
      header_color: "slate",
      bio: "hi",
      banner_url: null,
      commitment_status: "committed",
      looking_for: "D1 Midwest",
      values_tags: ["Academics"],
      awards: [{ title: "All-Conf", year: 2025 }],
      section_config: [
        { key: "metrics", visible: true },
        { key: "academics", visible: false },
      ],
      show_metrics: true,
      show_academics: false,
      show_athletic: true,
      show_film: false,
      show_schools: false,
    },
    user: { full_name: "Owen A", profile_photo_url: null },
    details: { gpa: 3.8, jersey_number: 7, twelfth_grade_team: "Varsity" },
    metricsRows: [
      {
        metric_type: "exit_velocity",
        value: 91,
        unit: "mph",
        verified: true,
        is_primary: true,
      },
    ],
    videoLinks: null,
    schools: null,
    committedSchoolName: "Ohio State",
  };

  it("includes metrics when metrics section visible", () => {
    const r = assemblePublicProfile(base);
    expect(r.metrics?.[0].key).toBe("exit_velocity");
    expect(r.commitmentStatus).toBe("committed");
    expect(r.committedSchoolName).toBe("Ohio State");
    expect(r.jerseyNumber).toBe(7);
  });

  it("omits academics when its section is hidden", () => {
    const r = assemblePublicProfile(base);
    expect(r.academics).toBeNull();
  });

  it("never returns private contact fields", () => {
    const withEmail = {
      ...base,
      details: { ...base.details, email: "x@y.com", phone: "555" },
    };
    const r = assemblePublicProfile(withEmail);
    expect(JSON.stringify(r)).not.toContain("x@y.com");
    expect(JSON.stringify(r)).not.toContain("555");
  });

  it("show_metrics overrides a stale section_config that still says metrics visible", () => {
    const stale = {
      ...base,
      profile: {
        ...base.profile,
        show_metrics: false,
        section_config: [{ key: "metrics", visible: true }],
      },
    };
    const r = assemblePublicProfile(stale);
    expect(r.metrics).toBeNull();
  });

  it("backfills from show_* when section_config is empty, so a new profile isn't blank", () => {
    const fresh = {
      ...base,
      profile: {
        ...base.profile,
        section_config: [],
        show_metrics: false,
        show_academics: true,
      },
    };
    const r = assemblePublicProfile(fresh);
    // values/team_history/awards default visible on backfill even with no section_config.
    expect(r.awards).toEqual([{ title: "All-Conf", year: 2025 }]);
    expect(r.valuesTags).toEqual(["Academics"]);
    expect(r.academics).not.toBeNull();
  });

  it("hides awards when the awards section is not visible", () => {
    const hidden = {
      ...base,
      profile: {
        ...base.profile,
        section_config: [
          ...base.profile.section_config,
          { key: "awards", visible: false },
        ],
      },
    };
    const r = assemblePublicProfile(hidden);
    expect(r.awards).toEqual([]);
  });

  it("returns awards when the awards section is visible", () => {
    const shown = {
      ...base,
      profile: {
        ...base.profile,
        section_config: [
          ...base.profile.section_config,
          { key: "awards", visible: true },
        ],
      },
    };
    const r = assemblePublicProfile(shown);
    expect(r.awards).toEqual([{ title: "All-Conf", year: 2025 }]);
  });

  it("hides valuesTags and lookingFor when the values section is not visible", () => {
    const hidden = {
      ...base,
      profile: {
        ...base.profile,
        section_config: [
          ...base.profile.section_config,
          { key: "values", visible: false },
        ],
      },
    };
    const r = assemblePublicProfile(hidden);
    expect(r.valuesTags).toEqual([]);
    expect(r.lookingFor).toBeNull();
  });

  it("returns valuesTags and lookingFor when the values section is visible", () => {
    const shown = {
      ...base,
      profile: {
        ...base.profile,
        section_config: [
          ...base.profile.section_config,
          { key: "values", visible: true },
        ],
      },
    };
    const r = assemblePublicProfile(shown);
    expect(r.valuesTags).toEqual(["Academics"]);
    expect(r.lookingFor).toBe("D1 Midwest");
  });
});
