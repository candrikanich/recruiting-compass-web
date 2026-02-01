import { describe, it, expect } from "vitest";
import { useDivisionRecommendations } from "~/composables/useDivisionRecommendations";

describe("useDivisionRecommendations", () => {
  const { getRecommendedDivisions } = useDivisionRecommendations();

  describe("D1 schools", () => {
    it("recommends D2/D3 when D1 fit score is below 50", () => {
      const recommendation = getRecommendedDivisions("D1", 42);
      expect(recommendation.shouldConsiderOtherDivisions).toBe(true);
      expect(recommendation.recommendedDivisions).toContain("D2");
      expect(recommendation.recommendedDivisions).toContain("D3");
      expect(recommendation.message).toContain("D2");
    });

    it("recommends D2 for reach D1 schools (score 50-69)", () => {
      const recommendation = getRecommendedDivisions("D1", 62);
      expect(recommendation.shouldConsiderOtherDivisions).toBe(true);
      expect(recommendation.recommendedDivisions).toContain("D2");
      expect(recommendation.recommendedDivisions.length).toBeLessThan(3);
    });

    it("does not recommend other divisions when D1 fit score >= 70", () => {
      const recommendation = getRecommendedDivisions("D1", 75);
      expect(recommendation.shouldConsiderOtherDivisions).toBe(false);
      expect(recommendation.recommendedDivisions.length).toBe(0);
    });
  });

  describe("D2 schools", () => {
    it("recommends D3/NAIA when D2 fit score is below 50", () => {
      const recommendation = getRecommendedDivisions("D2", 45);
      expect(recommendation.shouldConsiderOtherDivisions).toBe(true);
      expect(recommendation.recommendedDivisions).toContain("D3");
      expect(recommendation.recommendedDivisions).toContain("NAIA");
      expect(recommendation.message).toContain("D3");
    });

    it("recommends D3 for reach D2 schools (score 50-69)", () => {
      const recommendation = getRecommendedDivisions("D2", 58);
      expect(recommendation.shouldConsiderOtherDivisions).toBe(true);
      expect(recommendation.recommendedDivisions).toContain("D3");
    });

    it("does not recommend other divisions when D2 fit score >= 70", () => {
      const recommendation = getRecommendedDivisions("D2", 72);
      expect(recommendation.shouldConsiderOtherDivisions).toBe(false);
      expect(recommendation.recommendedDivisions.length).toBe(0);
    });
  });

  describe("D3 schools", () => {
    it("recommends NAIA when D3 fit score is below 50", () => {
      const recommendation = getRecommendedDivisions("D3", 40);
      expect(recommendation.shouldConsiderOtherDivisions).toBe(true);
      expect(recommendation.recommendedDivisions).toContain("NAIA");
    });

    it("does not recommend other divisions when D3 fit score >= 70", () => {
      const recommendation = getRecommendedDivisions("D3", 78);
      expect(recommendation.shouldConsiderOtherDivisions).toBe(false);
      expect(recommendation.recommendedDivisions.length).toBe(0);
    });
  });

  describe("NAIA and JUCO schools", () => {
    it("does not recommend other divisions for NAIA at any score", () => {
      const lowScore = getRecommendedDivisions("NAIA", 30);
      const highScore = getRecommendedDivisions("NAIA", 85);

      expect(lowScore.shouldConsiderOtherDivisions).toBe(false);
      expect(highScore.shouldConsiderOtherDivisions).toBe(false);
    });

    it("does not recommend other divisions for JUCO at any score", () => {
      const lowScore = getRecommendedDivisions("JUCO", 25);
      const highScore = getRecommendedDivisions("JUCO", 90);

      expect(lowScore.shouldConsiderOtherDivisions).toBe(false);
      expect(highScore.shouldConsiderOtherDivisions).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("handles null division gracefully", () => {
      const recommendation = getRecommendedDivisions(null, 50);
      expect(recommendation.shouldConsiderOtherDivisions).toBe(false);
      expect(recommendation.recommendedDivisions.length).toBe(0);
    });

    it("handles undefined division gracefully", () => {
      const recommendation = getRecommendedDivisions(undefined, 50);
      expect(recommendation.shouldConsiderOtherDivisions).toBe(false);
      expect(recommendation.recommendedDivisions.length).toBe(0);
    });

    it("handles null fit score gracefully", () => {
      const recommendation = getRecommendedDivisions("D1", null);
      expect(recommendation.shouldConsiderOtherDivisions).toBe(false);
      expect(recommendation.recommendedDivisions.length).toBe(0);
    });

    it("handles undefined fit score gracefully", () => {
      const recommendation = getRecommendedDivisions("D1", undefined);
      expect(recommendation.shouldConsiderOtherDivisions).toBe(false);
      expect(recommendation.recommendedDivisions.length).toBe(0);
    });

    it("handles score of exactly 70 (boundary condition)", () => {
      const recommendation = getRecommendedDivisions("D1", 70);
      expect(recommendation.shouldConsiderOtherDivisions).toBe(false);
    });

    it("handles score of exactly 50 (boundary condition)", () => {
      const d1At50 = getRecommendedDivisions("D1", 50);
      expect(d1At50.shouldConsiderOtherDivisions).toBe(true);
      expect(d1At50.recommendedDivisions).toContain("D2");
    });

    it("handles score of exactly 69 (boundary condition)", () => {
      const d1At69 = getRecommendedDivisions("D1", 69);
      expect(d1At69.shouldConsiderOtherDivisions).toBe(true);
      expect(d1At69.recommendedDivisions).toContain("D2");
    });

    it("handles case-insensitive division names", () => {
      const lowercase = getRecommendedDivisions("d1", 42);
      const uppercase = getRecommendedDivisions("D1", 42);
      const mixedCase = getRecommendedDivisions("D1", 42);

      expect(lowercase.shouldConsiderOtherDivisions).toBe(true);
      expect(lowercase.recommendedDivisions).toEqual(
        uppercase.recommendedDivisions,
      );
      expect(uppercase.recommendedDivisions).toEqual(
        mixedCase.recommendedDivisions,
      );
    });
  });

  describe("Recommendation messages", () => {
    it("returns appropriate message for D1 low score", () => {
      const recommendation = getRecommendedDivisions("D1", 40);
      expect(recommendation.message).toBeTruthy();
      expect(recommendation.message).toContain("D2");
      expect(recommendation.message).toContain("D3");
    });

    it("returns appropriate message for D2 low score", () => {
      const recommendation = getRecommendedDivisions("D2", 45);
      expect(recommendation.message).toBeTruthy();
      expect(recommendation.message).toContain("D3");
      expect(recommendation.message).toContain("NAIA");
    });

    it("returns appropriate message for D3 low score", () => {
      const recommendation = getRecommendedDivisions("D3", 40);
      expect(recommendation.message).toBeTruthy();
      expect(recommendation.message).toContain("NAIA");
    });

    it("returns appropriate message for D1 reach score", () => {
      const recommendation = getRecommendedDivisions("D1", 65);
      expect(recommendation.message).toBeTruthy();
      expect(recommendation.message).toContain("reach");
    });

    it("returns empty message when no recommendations", () => {
      const recommendation = getRecommendedDivisions("D1", 78);
      expect(recommendation.message).toBe("");
    });
  });

  describe("Score boundaries for different tiers", () => {
    it("provides recommendations for scores 0-49", () => {
      [0, 25, 49].forEach((score) => {
        const d1Rec = getRecommendedDivisions("D1", score);
        expect(d1Rec.shouldConsiderOtherDivisions).toBe(true);
      });
    });

    it("provides reach recommendations for scores 50-69", () => {
      [50, 55, 69].forEach((score) => {
        const d1Rec = getRecommendedDivisions("D1", score);
        expect(d1Rec.shouldConsiderOtherDivisions).toBe(true);
      });
    });

    it("provides no recommendations for scores 70+", () => {
      [70, 80, 100].forEach((score) => {
        const d1Rec = getRecommendedDivisions("D1", score);
        expect(d1Rec.shouldConsiderOtherDivisions).toBe(false);
      });
    });
  });
});
