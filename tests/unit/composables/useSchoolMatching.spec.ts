import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSchoolMatching } from "~/composables/useSchoolMatching";
import {
  createMockSchool,
  createEliteSchool,
  createMidTierSchool,
  createAccessibleSchool,
  createD3School,
  createMockSchoolPreference,
  createNortheastSchools,
  createSoutheastSchools,
  createSmallSchool,
  createLargeSchool,
  createVeryLargeSchool,
} from "~/tests/fixtures/schools.fixture";
import type { SchoolPreference } from "~/types/models";

// Mock usePreferenceManager
const mockSchoolPreferences = {
  preferences: [] as SchoolPreference[],
};

const mockHomeLocation = {
  latitude: 42.3601,
  longitude: -71.0589,
  address: "Boston, MA",
};

vi.mock("~/composables/usePreferenceManager", () => ({
  usePreferenceManager: () => ({
    getSchoolPreferences: () => ({
      preferences: mockSchoolPreferences.preferences,
    }),
    getHomeLocation: () => mockHomeLocation,
  }),
}));

interface MockLocation {
  latitude?: number;
  longitude?: number;
}

vi.mock("~/utils/distance", () => ({
  calculateDistance: (home: MockLocation, school: MockLocation) => {
    // Simple mock: return distance based on coordinates
    if (!home.latitude || !school.latitude) return 0;
    const latDiff = Math.abs(home.latitude - school.latitude);
    const lonDiff = Math.abs(home.longitude - school.longitude);
    return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 69; // approx miles per degree
  },
}));

describe("useSchoolMatching", () => {
  beforeEach(() => {
    mockSchoolPreferences.preferences = [];
  });

  describe("calculateMatchScore", () => {
    it("should return 0 score when no preferences set", () => {
      const school = createMockSchool();
      const { calculateMatchScore } = useSchoolMatching();

      const result = calculateMatchScore(school);

      expect(result.score).toBe(0);
      expect(result.matchedCriteria).toHaveLength(0);
      expect(result.missedCriteria).toHaveLength(0);
      expect(result.dealbreakers).toHaveLength(0);
      expect(result.hasDealbreakers).toBe(false);
    });

    it("should achieve 100% score when all preferences match", () => {
      mockSchoolPreferences.preferences = [
        createMockSchoolPreference({
          type: "division",
          value: ["D1"],
          priority: 1,
        }),
        createMockSchoolPreference({
          type: "conference_type",
          value: ["Power 4"],
          priority: 2,
        }),
      ];

      const school = createMockSchool({
        division: "D1",
        conference: "SEC",
      });

      const { calculateMatchScore } = useSchoolMatching();
      const result = calculateMatchScore(school);

      expect(result.score).toBe(100);
      expect(result.matchedCriteria).toHaveLength(2);
      expect(result.missedCriteria).toHaveLength(0);
    });

    it("should calculate weighted score based on priority", () => {
      mockSchoolPreferences.preferences = [
        createMockSchoolPreference({
          type: "division",
          value: ["D1"],
          priority: 1,
          is_dealbreaker: false,
        }), // weight=10, match
        createMockSchoolPreference({
          type: "division",
          value: ["D2"],
          priority: 2,
          is_dealbreaker: false,
        }), // weight=9, miss
        createMockSchoolPreference({
          type: "conference_type",
          value: ["Power 4"],
          priority: 3,
          is_dealbreaker: false,
        }), // weight=8, match
      ];

      const school = createMockSchool({ division: "D1", conference: "SEC" });
      const { calculateMatchScore } = useSchoolMatching();
      const result = calculateMatchScore(school);

      // Expected: (10 + 8) / (10 + 9 + 8) = 18/27 = 0.6667 * 100 = 66.67 ≈ 67%
      expect(result.score).toBe(67);
      expect(result.matchedCriteria).toHaveLength(2);
      expect(result.missedCriteria).toHaveLength(1);
    });

    it("should identify dealbreakers and set hasDealbreakers flag", () => {
      mockSchoolPreferences.preferences = [
        createMockSchoolPreference({
          type: "division",
          value: ["D1"],
          priority: 1,
          is_dealbreaker: true,
        }),
      ];

      const school = createMockSchool({ division: "D3" });
      const { calculateMatchScore } = useSchoolMatching();
      const result = calculateMatchScore(school);

      expect(result.hasDealbreakers).toBe(true);
      expect(result.dealbreakers).toContain("division");
    });

    it("should prioritize dealbreakers in result", () => {
      mockSchoolPreferences.preferences = [
        createMockSchoolPreference({
          type: "division",
          value: ["D1"],
          priority: 1,
          is_dealbreaker: true,
        }),
        createMockSchoolPreference({
          type: "conference_type",
          value: ["Power 4"],
          priority: 2,
          is_dealbreaker: false,
        }),
      ];

      const school = createMockSchool({
        division: "D3",
        conference: "Independent",
      });
      const { calculateMatchScore } = useSchoolMatching();
      const result = calculateMatchScore(school);

      expect(result.hasDealbreakers).toBe(true);
      expect(result.dealbreakers).toEqual(["division"]);
    });
  });

  describe("evaluatePreference", () => {
    describe("Division matching", () => {
      it("should match single division preference", () => {
        const school = createMockSchool({ division: "D1" });
        const pref = createMockSchoolPreference({
          type: "division",
          value: ["D1"],
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });

      it("should match multiple division preferences", () => {
        const school = createMockSchool({ division: "D2" });
        const pref = createMockSchoolPreference({
          type: "division",
          value: ["D1", "D2", "D3"],
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });

      it("should not match excluded divisions", () => {
        const school = createMockSchool({ division: "NAIA" });
        const pref = createMockSchoolPreference({
          type: "division",
          value: ["D1", "D2", "D3"],
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(false);
      });

      it("should return true when school has null division (can't evaluate)", () => {
        const school = createMockSchool({ division: null });
        const pref = createMockSchoolPreference({
          type: "division",
          value: ["D1"],
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });
    });

    describe("Conference Type matching", () => {
      it("should identify Power 4 conferences", () => {
        const power4Conferences = ["SEC", "Big Ten", "Big 12", "ACC"];

        const { evaluatePreference } = useSchoolMatching();

        power4Conferences.forEach((conf) => {
          const school = createMockSchool({ conference: conf });
          const pref = createMockSchoolPreference({
            type: "conference_type",
            value: ["Power 4"],
          });
          expect(evaluatePreference(school, pref)).toBe(true);
        });
      });

      it("should identify Group of 5 conferences", () => {
        const group5Conferences = [
          "AAC",
          "Mountain West",
          "Sun Belt",
          "MAC",
          "Conference USA",
        ];

        const { evaluatePreference } = useSchoolMatching();

        group5Conferences.forEach((conf) => {
          const school = createMockSchool({ conference: conf });
          const pref = createMockSchoolPreference({
            type: "conference_type",
            value: ["Group of 5"],
          });
          expect(evaluatePreference(school, pref)).toBe(true);
        });
      });

      it("should identify Mid-Major conferences", () => {
        const school = createMockSchool({ conference: "Ivy League" });
        const pref = createMockSchoolPreference({
          type: "conference_type",
          value: ["Mid-Major"],
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });

      it("should return true when conference is null (can't evaluate)", () => {
        const school = createMockSchool({ conference: null });
        const pref = createMockSchoolPreference({
          type: "conference_type",
          value: ["Power 4"],
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });
    });

    describe("Academic rating matching", () => {
      it("should evaluate elite schools (admission_rate < 15%)", () => {
        const school = createEliteSchool();
        const pref = createMockSchoolPreference({
          type: "min_academic_rating",
          value: 5,
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });

      it("should evaluate mid-tier schools (admission_rate 30-50%)", () => {
        const school = createMidTierSchool();
        const pref = createMockSchoolPreference({
          type: "min_academic_rating",
          value: 3,
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });

      it("should fail when minimum rating not met", () => {
        const school = createAccessibleSchool();
        const pref = createMockSchoolPreference({
          type: "min_academic_rating",
          value: 4,
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(false);
      });

      it("should default to rating 3 when admission_rate missing", () => {
        const school = createMockSchool({
          academic_info: { enrollment: 10000 }, // no admission_rate
        });
        const pref = createMockSchoolPreference({
          type: "min_academic_rating",
          value: 3,
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });
    });

    describe("School size matching", () => {
      it("should match small schools (< 5000)", () => {
        const school = createSmallSchool();
        const pref = createMockSchoolPreference({
          type: "school_size",
          value: "small",
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });

      it("should match medium schools (5000-15000)", () => {
        const school = createMockSchool({
          academic_info: { enrollment: 10000 },
        });
        const pref = createMockSchoolPreference({
          type: "school_size",
          value: "medium",
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });

      it("should match large schools (15000-30000)", () => {
        const school = createLargeSchool();
        const pref = createMockSchoolPreference({
          type: "school_size",
          value: "large",
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });

      it("should match very large schools (30000+)", () => {
        const school = createVeryLargeSchool();
        const pref = createMockSchoolPreference({
          type: "school_size",
          value: "very_large",
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });

      it("should return true when enrollment missing", () => {
        const school = createMockSchool({
          academic_info: { gpa_requirement: 3.5 }, // no enrollment
        });
        const pref = createMockSchoolPreference({
          type: "school_size",
          value: "small",
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });
    });

    describe("Region matching", () => {
      it("should match Northeast schools", () => {
        const schools = createNortheastSchools();
        const pref = createMockSchoolPreference({
          type: "preferred_regions",
          value: ["northeast"],
        });

        const { evaluatePreference } = useSchoolMatching();
        schools.forEach((school) => {
          expect(evaluatePreference(school, pref)).toBe(true);
        });
      });

      it("should match Southeast schools", () => {
        const schools = createSoutheastSchools();
        const pref = createMockSchoolPreference({
          type: "preferred_regions",
          value: ["southeast"],
        });

        const { evaluatePreference } = useSchoolMatching();
        schools.forEach((school) => {
          expect(evaluatePreference(school, pref)).toBe(true);
        });
      });

      it("should not match when region not in preferences", () => {
        const school = createNortheastSchools()[0];
        const pref = createMockSchoolPreference({
          type: "preferred_regions",
          value: ["southwest"],
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(false);
      });

      it("should return true when location null (can't evaluate)", () => {
        const school = createMockSchool({ location: null });
        const pref = createMockSchoolPreference({
          type: "preferred_regions",
          value: ["northeast"],
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });
    });

    describe("State matching", () => {
      it("should match by state abbreviation", () => {
        const school = createMockSchool({ location: "Boston, MA" });
        const pref = createMockSchoolPreference({
          type: "preferred_states",
          value: ["MA"],
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });

      it("should match by full state name", () => {
        const school = createMockSchool({ location: "Boston, Massachusetts" });
        const pref = createMockSchoolPreference({
          type: "preferred_states",
          value: ["MA"],
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });

      it("should handle multiple state preferences", () => {
        const school = createMockSchool({ location: "Austin, TX" });
        const pref = createMockSchoolPreference({
          type: "preferred_states",
          value: ["CA", "TX", "FL"],
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(true);
      });

      it("should return false for non-matching state", () => {
        const school = createMockSchool({ location: "Boston, MA" });
        const pref = createMockSchoolPreference({
          type: "preferred_states",
          value: ["CA"],
        });

        const { evaluatePreference } = useSchoolMatching();
        expect(evaluatePreference(school, pref)).toBe(false);
      });
    });
  });

  describe("getAcademicRating", () => {
    it("should return 5 for elite schools (< 15% admission rate)", () => {
      const school = createEliteSchool();
      const { getAcademicRating } = useSchoolMatching();

      expect(getAcademicRating(school)).toBe(5);
    });

    it("should return 4 for excellent schools (15-30%)", () => {
      const school = createMockSchool({
        academic_info: { admission_rate: 0.25 },
      });
      const { getAcademicRating } = useSchoolMatching();

      expect(getAcademicRating(school)).toBe(4);
    });

    it("should return 3 for very good schools (30-50%)", () => {
      const school = createMidTierSchool();
      const { getAcademicRating } = useSchoolMatching();

      expect(getAcademicRating(school)).toBe(3);
    });

    it("should return 2 for good schools (50-70%)", () => {
      const school = createMockSchool({
        academic_info: { admission_rate: 0.6 },
      });
      const { getAcademicRating } = useSchoolMatching();

      expect(getAcademicRating(school)).toBe(2);
    });

    it("should return 1 for basic schools (70%+)", () => {
      const school = createAccessibleSchool();
      const { getAcademicRating } = useSchoolMatching();

      expect(getAcademicRating(school)).toBe(1);
    });

    it("should default to 3 when admission_rate missing", () => {
      const school = createMockSchool({
        academic_info: { enrollment: 10000 },
      });
      const { getAcademicRating } = useSchoolMatching();

      expect(getAcademicRating(school)).toBe(3);
    });

    it("should handle boundary cases", () => {
      const { getAcademicRating } = useSchoolMatching();

      expect(
        getAcademicRating(
          createMockSchool({ academic_info: { admission_rate: 0.1499 } }),
        ),
      ).toBe(5);
      expect(
        getAcademicRating(
          createMockSchool({ academic_info: { admission_rate: 0.15 } }),
        ),
      ).toBe(4);
      expect(
        getAcademicRating(
          createMockSchool({ academic_info: { admission_rate: 0.2999 } }),
        ),
      ).toBe(4);
      expect(
        getAcademicRating(
          createMockSchool({ academic_info: { admission_rate: 0.3 } }),
        ),
      ).toBe(3);
    });
  });

  describe("getMatchBadge", () => {
    it("should return dealbreaker badge when hasDealbreakers=true", () => {
      const { getMatchBadge } = useSchoolMatching();
      const badge = getMatchBadge(95, true);

      expect(badge?.label).toBe("Dealbreaker");
      expect(badge?.class).toContain("badge-danger");
      expect(badge?.icon).toBe("⚠️");
    });

    it("should return great match badge for 80+ score", () => {
      const { getMatchBadge } = useSchoolMatching();
      const badge = getMatchBadge(85, false);

      expect(badge?.label).toBe("Great Match");
      expect(badge?.class).toContain("badge-success");
      expect(badge?.icon).toBe("✓");
    });

    it("should return good match badge for 60-79 score", () => {
      const { getMatchBadge } = useSchoolMatching();
      const badge = getMatchBadge(70, false);

      expect(badge?.label).toBe("Good Match");
      expect(badge?.class).toContain("badge-warning");
      expect(badge?.icon).toBe("○");
    });

    it("should return null for scores below 60", () => {
      const { getMatchBadge } = useSchoolMatching();
      const badge = getMatchBadge(50, false);

      expect(badge).toBeNull();
    });

    it("should return null for zero score", () => {
      const { getMatchBadge } = useSchoolMatching();
      const badge = getMatchBadge(0, false);

      expect(badge).toBeNull();
    });

    it("should handle exact threshold: 80", () => {
      const { getMatchBadge } = useSchoolMatching();
      const badge = getMatchBadge(80, false);

      expect(badge?.label).toBe("Great Match");
    });

    it("should handle exact threshold: 60", () => {
      const { getMatchBadge } = useSchoolMatching();
      const badge = getMatchBadge(60, false);

      expect(badge?.label).toBe("Good Match");
    });
  });

  describe("Edge cases", () => {
    it("should handle schools with null academic_info", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const school = createMockSchool({
        academic_info: null as any,
      });

      const { getAcademicRating, evaluatePreference } = useSchoolMatching();

      // When academic_info is null, defaults to 4 (safe assumption)
      expect(getAcademicRating(school)).toBeGreaterThanOrEqual(3);
      const pref = createMockSchoolPreference({
        type: "school_size",
        value: "small",
      });
      // School size evaluation with null academic_info returns false (can't determine size)
      expect(evaluatePreference(school, pref)).toBe(false);
    });

    it("should handle missing home location for distance evaluation", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockHomeLocation.latitude = undefined as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockHomeLocation.longitude = undefined as any;

      const school = createMockSchool();
      const pref = createMockSchoolPreference({
        type: "max_distance_miles",
        value: 300,
      });

      const { evaluatePreference } = useSchoolMatching();
      expect(evaluatePreference(school, pref)).toBe(true); // Can't evaluate, return true
    });

    it("should handle very high priority weights", () => {
      mockSchoolPreferences.preferences = Array.from({ length: 20 }, (_, i) =>
        createMockSchoolPreference({
          type: "division",
          value: i % 2 === 0 ? ["D1"] : ["D2"],
          priority: i,
        }),
      );

      const school = createMockSchool({ division: "D1" });
      const { calculateMatchScore } = useSchoolMatching();
      const result = calculateMatchScore(school);

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should handle case-insensitive conference matching", () => {
      const school = createMockSchool({ conference: "sec" }); // lowercase
      const pref = createMockSchoolPreference({
        type: "conference_type",
        value: ["Power 4"],
      });

      const { evaluatePreference } = useSchoolMatching();
      expect(evaluatePreference(school, pref)).toBe(true);
    });

    it("should handle location with no state abbr", () => {
      const school = createMockSchool({ location: "Unknown Location" });
      const pref = createMockSchoolPreference({
        type: "preferred_states",
        value: ["CA"],
      });

      const { evaluatePreference } = useSchoolMatching();
      // When location can't be parsed, default to true (can't evaluate)
      expect(evaluatePreference(school, pref)).toBe(true);
    });
  });
});
