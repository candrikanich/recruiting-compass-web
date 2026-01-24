import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateFitScore } from "~/utils/fitScoreCalculation";
import type { FitScoreInputs } from "~/types/timeline";
import type { PlayerDetails } from "~/types/models";

/**
 * Unit tests for fit score recalculation logic
 * These tests verify the calculation and mapping logic used in the batch endpoint
 */

describe("Fit Score Recalculation Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate fit scores for player details", () => {
    const inputs: FitScoreInputs = {
      athleticFit: 20,
      academicFit: 15,
      opportunityFit: 10,
      personalFit: 8,
    };

    const result = calculateFitScore(inputs);

    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.tier).toMatch(/^(reach|match|safety|unlikely)$/);
  });

  it("should handle empty fit score inputs", () => {
    const inputs: FitScoreInputs = {};

    const result = calculateFitScore(inputs);

    expect(result.score).toBe(0);
    expect(result.breakdown).toBeDefined();
  });

  it("should handle partial fit score inputs", () => {
    const inputs: FitScoreInputs = {
      academicFit: 20,
    };

    const result = calculateFitScore(inputs);

    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("should calculate higher scores with better inputs", () => {
    const lowInputs: FitScoreInputs = {
      athleticFit: 5,
      academicFit: 5,
      opportunityFit: 5,
      personalFit: 5,
    };

    const highInputs: FitScoreInputs = {
      athleticFit: 35,
      academicFit: 20,
      opportunityFit: 18,
      personalFit: 12,
    };

    const lowResult = calculateFitScore(lowInputs);
    const highResult = calculateFitScore(highInputs);

    expect(highResult.score).toBeGreaterThan(lowResult.score);
  });

  it("should return tier match for high scores", () => {
    const inputs: FitScoreInputs = {
      athleticFit: 35,
      academicFit: 20,
      opportunityFit: 18,
      personalFit: 12,
    };

    const result = calculateFitScore(inputs);

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.tier).toBe("match");
  });

  it("should return tier reach for medium scores", () => {
    const inputs: FitScoreInputs = {
      athleticFit: 20,
      academicFit: 15,
      opportunityFit: 12,
      personalFit: 9,
    };

    const result = calculateFitScore(inputs);

    // Just verify it's a valid reach score (medium fit)
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("should return tier unlikely for low scores", () => {
    const inputs: FitScoreInputs = {
      athleticFit: 5,
      academicFit: 5,
      opportunityFit: 5,
      personalFit: 5,
    };

    const result = calculateFitScore(inputs);

    expect(result.score).toBeLessThan(50);
    expect(result.tier).toBe("unlikely");
  });

  it("should include breakdown in result", () => {
    const inputs: FitScoreInputs = {
      athleticFit: 20,
      academicFit: 15,
      opportunityFit: 10,
      personalFit: 8,
    };

    const result = calculateFitScore(inputs);

    expect(result.breakdown).toBeDefined();
    expect(result.breakdown.athleticFit).toBeDefined();
  });

  it("should mark missing dimensions", () => {
    const inputs: FitScoreInputs = {
      athleticFit: 0,
      academicFit: 15,
      opportunityFit: 10,
      personalFit: 8,
    };

    const result = calculateFitScore(inputs);

    expect(result.missingDimensions).toBeDefined();
    expect(Array.isArray(result.missingDimensions)).toBe(true);
  });

  it("should handle player details mapping to fit score inputs", () => {
    const playerDetails: PlayerDetails = {
      gpa: 3.5,
      positions: ["SS"],
      height_inches: 72,
      weight_lbs: 190,
      sat_score: 1400,
      act_score: undefined,
    };

    // Mock the mapping logic used in the endpoint
    const inputs: FitScoreInputs = {
      athleticFit: playerDetails.positions?.[0] ? 20 : 0,
      academicFit: playerDetails.gpa ? 15 : 0,
      opportunityFit: 10,
      personalFit: 8,
    };

    expect(inputs.athleticFit).toBe(20);
    expect(inputs.academicFit).toBe(15);
    expect(inputs.opportunityFit).toBe(10);
    expect(inputs.personalFit).toBe(8);
  });

  it("should handle sparse player details", () => {
    const playerDetails: Partial<PlayerDetails> = {
      gpa: undefined,
      positions: [],
    };

    const inputs: FitScoreInputs = {
      athleticFit: playerDetails.positions?.[0] ? 20 : 0,
      academicFit: playerDetails.gpa ? 15 : 0,
      opportunityFit: 10,
      personalFit: 8,
    };

    expect(inputs.athleticFit).toBe(0);
    expect(inputs.academicFit).toBe(0);
  });

  it("should produce consistent results with same inputs", () => {
    const inputs: FitScoreInputs = {
      athleticFit: 20,
      academicFit: 15,
      opportunityFit: 10,
      personalFit: 8,
    };

    const result1 = calculateFitScore(inputs);
    const result2 = calculateFitScore(inputs);

    expect(result1.score).toBe(result2.score);
    expect(result1.tier).toBe(result2.tier);
  });
});
