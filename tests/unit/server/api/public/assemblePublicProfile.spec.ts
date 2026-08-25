import { describe, it, expect } from "vitest";
import { assemblePublicProfile } from "~/server/api/public/profile/[slug].get";

describe("assemblePublicProfile", () => {
  const base = {
    profile: {
      header_color: "slate", bio: "hi", banner_url: null,
      commitment_status: "committed", looking_for: "D1 Midwest",
      values_tags: ["Academics"], awards: [{ title: "All-Conf", year: 2025 }],
      section_config: [
        { key: "metrics", visible: true },
        { key: "academics", visible: false },
      ],
      show_academics: false, show_athletic: true, show_film: false, show_schools: false,
    },
    user: { full_name: "Owen A", profile_photo_url: null },
    details: { gpa: 3.8, jersey_number: 7, twelfth_grade_team: "Varsity" },
    metricsRows: [{ metric_type: "exit_velocity", value: 91, unit: "mph", verified: true, is_primary: true }],
    videoLinks: null, schools: null, committedSchoolName: "Ohio State",
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
    const withEmail = { ...base, details: { ...base.details, email: "x@y.com", phone: "555" } };
    const r = assemblePublicProfile(withEmail);
    expect(JSON.stringify(r)).not.toContain("x@y.com");
    expect(JSON.stringify(r)).not.toContain("555");
  });
});
