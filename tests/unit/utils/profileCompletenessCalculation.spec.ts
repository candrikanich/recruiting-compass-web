import { describe, it, expect } from "vitest";
import {
  calculateProfileCompleteness,
  isHomeLocationPresent,
  type ScorableProfile,
  type ProfileCompletenessSignals,
} from "~/utils/profileCompletenessCalculation";

// Canonical weighted formula — must stay in lockstep with iOS
// (PlayerDetails.completenessScore). See the iOS repo's
// planning/2026-08-09-profile-completeness-canonical-spec.md.

const SIGNALS_ON: ProfileCompletenessSignals = {
  hasHighlightVideo: true,
  hasHomeLocation: true,
};

// A profile with every player-prefs field filled (75% before signals).
const fullProfile: ScorableProfile = {
  graduation_year: 2028,
  primary_sport: "soccer",
  primary_position: "forward",
  gpa: 3.8,
  sat_score: 1500,
  height_inches: 70,
  weight_lbs: 160,
  phone: "555-123-4567",
};

describe("utils/profileCompletenessCalculation", () => {
  describe("calculateProfileCompleteness", () => {
    it("scores 100% when every field and both signals are present", () => {
      expect(calculateProfileCompleteness(fullProfile, SIGNALS_ON)).toBe(100);
    });

    it("scores 0% for an empty profile with no signals", () => {
      expect(calculateProfileCompleteness({})).toBe(0);
    });

    describe("per-field weights", () => {
      const cases: Array<
        [string, ScorableProfile, ProfileCompletenessSignals, number]
      > = [
        [
          "graduation year",
          { graduation_year: 2028 },
          { hasHighlightVideo: false, hasHomeLocation: false },
          10,
        ],
        [
          "primary sport",
          { primary_sport: "soccer" },
          { hasHighlightVideo: false, hasHomeLocation: false },
          10,
        ],
        [
          "primary position",
          { primary_position: "forward" },
          { hasHighlightVideo: false, hasHomeLocation: false },
          10,
        ],
        [
          "gpa",
          { gpa: 3.5 },
          { hasHighlightVideo: false, hasHomeLocation: false },
          15,
        ],
        [
          "sat",
          { sat_score: 1200 },
          { hasHighlightVideo: false, hasHomeLocation: false },
          10,
        ],
        [
          "act",
          { act_score: 28 },
          { hasHighlightVideo: false, hasHomeLocation: false },
          10,
        ],
        [
          "height",
          { height_inches: 70 },
          { hasHighlightVideo: false, hasHomeLocation: false },
          5,
        ],
        [
          "weight",
          { weight_lbs: 160 },
          { hasHighlightVideo: false, hasHomeLocation: false },
          5,
        ],
        [
          "phone",
          { phone: "555-1234" },
          { hasHighlightVideo: false, hasHomeLocation: false },
          10,
        ],
        [
          "highlight video",
          {},
          { hasHighlightVideo: true, hasHomeLocation: false },
          15,
        ],
        [
          "home location",
          {},
          { hasHighlightVideo: false, hasHomeLocation: true },
          10,
        ],
      ];

      it.each(cases)(
        "gives %s its weight",
        (_label, profile, signals, expected) => {
          expect(calculateProfileCompleteness(profile, signals)).toBe(expected);
        },
      );
    });

    it("counts SAT or ACT as a single field (no double count)", () => {
      const sat = calculateProfileCompleteness({ sat_score: 1300 });
      const act = calculateProfileCompleteness({ act_score: 30 });
      const both = calculateProfileCompleteness({
        sat_score: 1300,
        act_score: 30,
      });
      expect(sat).toBe(10);
      expect(act).toBe(10);
      expect(both).toBe(10);
    });

    it("defaults both signals to absent when omitted", () => {
      // fullProfile is 75% from player-prefs fields alone.
      expect(calculateProfileCompleteness(fullProfile)).toBe(75);
    });

    it("docks the video weight when only the video is missing", () => {
      expect(
        calculateProfileCompleteness(fullProfile, {
          hasHighlightVideo: false,
          hasHomeLocation: true,
        }),
      ).toBe(85);
    });

    it("docks the home-location weight when only location is missing", () => {
      expect(
        calculateProfileCompleteness(fullProfile, {
          hasHighlightVideo: true,
          hasHomeLocation: false,
        }),
      ).toBe(90);
    });

    it("treats blank/zero values as missing", () => {
      const blank: ScorableProfile = {
        primary_sport: "   ",
        primary_position: "",
        gpa: 0,
        height_inches: 0,
        phone: "  ",
      };
      expect(calculateProfileCompleteness(blank)).toBe(0);
    });

    it("returns an integer between 0 and 100", () => {
      const result = calculateProfileCompleteness(fullProfile, SIGNALS_ON);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe("isHomeLocationPresent", () => {
    it("is false for null/undefined/empty", () => {
      expect(isHomeLocationPresent(null)).toBe(false);
      expect(isHomeLocationPresent(undefined)).toBe(false);
      expect(isHomeLocationPresent({})).toBe(false);
    });

    it("is true when a non-blank zip is present", () => {
      expect(isHomeLocationPresent({ zip: "60601" })).toBe(true);
      expect(isHomeLocationPresent({ zip: "  " })).toBe(false);
    });

    it("is true when a coordinate pair is present", () => {
      expect(isHomeLocationPresent({ latitude: 41.8, longitude: -87.6 })).toBe(
        true,
      );
      expect(isHomeLocationPresent({ latitude: 41.8 })).toBe(false);
    });
  });
});
