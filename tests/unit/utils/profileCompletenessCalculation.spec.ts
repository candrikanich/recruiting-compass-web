import { describe, it, expect } from "vitest";
import { calculateProfileCompleteness } from "~/utils/profileCompletenessCalculation";
import type { PlayerProfile } from "~/types/onboarding";

describe("utils/profileCompletenessCalculation", () => {
  describe("calculateProfileCompleteness", () => {
    describe("Weight Distribution (sum = 100%)", () => {
      const weightBreakdown = {
        graduationYear: 10,
        primarySport: 10,
        primaryPosition: 10,
        zipCode: 10,
        gpa: 15,
        testScores: 10,
        highlightVideo: 15,
        athleticStats: 10,
        contactInfo: 10,
      };

      it("should sum all weights to 100%", () => {
        const total = Object.values(weightBreakdown).reduce((a, b) => a + b, 0);
        expect(total).toBe(100);
      });
    });

    describe("Happy Path - Complete Profile", () => {
      it("should calculate 100% for fully complete profile", () => {
        const profile: PlayerProfile = {
          graduation_year: 2028,
          primary_sport: "soccer",
          primary_position: "forward",
          zip_code: "60601",
          gpa: 3.8,
          sat_score: 1500,
          act_score: 34,
          highlight_video_url: "https://example.com/video.mp4",
          athletic_stats: "5 goals in league play",
          phone: "555-123-4567",
        };

        const result = calculateProfileCompleteness(profile);
        expect(result).toBe(100);
      });

      it("should give credit for SAT OR ACT (not requiring both)", () => {
        const profileWithSAT: PlayerProfile = {
          graduation_year: 2028,
          primary_sport: "soccer",
          primary_position: "forward",
          zip_code: "60601",
          gpa: 3.8,
          sat_score: 1500,
          highlight_video_url: "https://example.com/video.mp4",
          athletic_stats: "5 goals",
          phone: "555-123-4567",
        };

        const resultSAT = calculateProfileCompleteness(profileWithSAT);
        expect(resultSAT).toBe(100);

        const profileWithACT: PlayerProfile = {
          ...profileWithSAT,
          sat_score: undefined,
          act_score: 34,
        };

        const resultACT = calculateProfileCompleteness(profileWithACT);
        expect(resultACT).toBe(100);
      });
    });

    describe("Happy Path - Partial Completion", () => {
      it("should calculate 40% for profile with basic info only", () => {
        const profile: PlayerProfile = {
          graduation_year: 2028,
          primary_sport: "soccer",
          primary_position: "forward",
          zip_code: "60601",
        };

        const result = calculateProfileCompleteness(profile);
        expect(result).toBe(40); // 10+10+10+10 = 40%
      });

      it("should calculate correctly with graduation year + sport + position + zip", () => {
        const profile: PlayerProfile = {
          graduation_year: 2028,
          primary_sport: "basketball",
          primary_position: "point guard",
          zip_code: "10001",
        };

        const result = calculateProfileCompleteness(profile);
        expect(result).toBe(40); // 10+10+10+10 = 40%
      });

      it("should calculate correctly with academic info added", () => {
        const profile: PlayerProfile = {
          graduation_year: 2028,
          primary_sport: "soccer",
          primary_position: "midfielder",
          zip_code: "60601",
          gpa: 3.5,
          sat_score: 1200,
        };

        const result = calculateProfileCompleteness(profile);
        expect(result).toBe(65); // 10+10+10+10+15+10 = 65%
      });
    });

    describe("Edge Cases - Missing Fields", () => {
      it("should calculate 0% for empty profile", () => {
        const profile: Partial<PlayerProfile> = {};
        const result = calculateProfileCompleteness(profile as PlayerProfile);
        expect(result).toBe(0);
      });

      it("should calculate with only graduation year", () => {
        const profile: PlayerProfile = {
          graduation_year: 2028,
        };

        const result = calculateProfileCompleteness(profile);
        expect(result).toBe(10); // Just the graduation year weight
      });

      it("should not penalize missing secondary sport/position", () => {
        const profile: PlayerProfile = {
          graduation_year: 2028,
          primary_sport: "soccer",
          primary_position: "forward",
          zip_code: "60601",
          gpa: 3.8,
          sat_score: 1400,
          highlight_video_url: "https://example.com/video.mp4",
          athletic_stats: "10 goals",
          phone: "555-123-4567",
        };

        const result = calculateProfileCompleteness(profile);
        expect(result).toBe(100); // No penalty for missing secondary
      });
    });

    describe("Test Score Handling", () => {
      it("should count SAT score as fulfilling test score requirement", () => {
        const profile: PlayerProfile = {
          graduation_year: 2028,
          primary_sport: "soccer",
          primary_position: "forward",
          zip_code: "60601",
          gpa: 3.8,
          sat_score: 1300,
        };

        const result = calculateProfileCompleteness(profile);
        expect(result).toBeGreaterThanOrEqual(65); // Should include SAT's 10%
      });

      it("should count ACT score as fulfilling test score requirement", () => {
        const profile: PlayerProfile = {
          graduation_year: 2028,
          primary_sport: "soccer",
          primary_position: "forward",
          zip_code: "60601",
          gpa: 3.8,
          act_score: 33,
        };

        const result = calculateProfileCompleteness(profile);
        expect(result).toBeGreaterThanOrEqual(65); // Should include ACT's 10%
      });

      it("should not double-count when both SAT and ACT are present", () => {
        const profile1: PlayerProfile = {
          graduation_year: 2028,
          primary_sport: "soccer",
          primary_position: "forward",
          zip_code: "60601",
          gpa: 3.8,
          sat_score: 1300,
        };

        const profile2: PlayerProfile = {
          ...profile1,
          act_score: 33,
        };

        const result1 = calculateProfileCompleteness(profile1);
        const result2 = calculateProfileCompleteness(profile2);

        // Both should be the same (10% for tests, not 20%)
        expect(result1).toBe(result2);
      });
    });

    describe("Optional Fields", () => {
      it("should handle missing highlight video without penalty when others complete", () => {
        const profile: PlayerProfile = {
          graduation_year: 2028,
          primary_sport: "soccer",
          primary_position: "forward",
          zip_code: "60601",
          gpa: 3.8,
          sat_score: 1300,
          athletic_stats: "10 goals, 5 assists",
          phone: "555-123-4567",
        };

        const result = calculateProfileCompleteness(profile);
        expect(result).toBe(85); // 100 - 15 (missing video)
      });

      it("should handle missing athletic stats gracefully", () => {
        const profile: PlayerProfile = {
          graduation_year: 2028,
          primary_sport: "soccer",
          primary_position: "forward",
          zip_code: "60601",
          gpa: 3.8,
          sat_score: 1300,
          highlight_video_url: "https://example.com/video.mp4",
          phone: "555-123-4567",
        };

        const result = calculateProfileCompleteness(profile);
        expect(result).toBe(90); // 100 - 10 (missing stats)
      });

      it("should handle missing contact info", () => {
        const profile: PlayerProfile = {
          graduation_year: 2028,
          primary_sport: "soccer",
          primary_position: "forward",
          zip_code: "60601",
          gpa: 3.8,
          sat_score: 1300,
          highlight_video_url: "https://example.com/video.mp4",
          athletic_stats: "10 goals",
        };

        const result = calculateProfileCompleteness(profile);
        expect(result).toBe(90); // 100 - 10 (missing contact info)
      });
    });

    describe("Return Type", () => {
      it("should return a number between 0 and 100", () => {
        const profile: PlayerProfile = {
          graduation_year: 2028,
          primary_sport: "soccer",
          primary_position: "forward",
          zip_code: "60601",
          gpa: 3.5,
        };

        const result = calculateProfileCompleteness(profile);
        expect(typeof result).toBe("number");
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(100);
      });

      it("should not return decimal places", () => {
        const profile: PlayerProfile = {
          graduation_year: 2028,
          primary_sport: "soccer",
          primary_position: "forward",
        };

        const result = calculateProfileCompleteness(profile);
        expect(Number.isInteger(result)).toBe(true);
      });
    });
  });
});
