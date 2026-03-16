import { describe, it, expect } from "vitest";
import { useFitScore } from "~/composables/useFitScore";
import type { AthleteProfileForFit, SchoolAcademicInfo } from "~/types/schoolFit";

describe("useFitScore", () => {
  const athlete: AthleteProfileForFit = {
    school_state: "NC",
    campus_size_preference: "medium",
    cost_sensitivity: "medium",
    sat_score: 1200,
    act_score: 28,
  };

  const schoolInfo: SchoolAcademicInfo = {
    state: "NC",
    student_size: 18000,
    tuition_out_of_state: 30000,
    sat_25th: 1100,
    sat_75th: 1350,
    act_25th: 26,
    act_75th: 32,
  };

  it("calculates and returns SchoolFitSignals", () => {
    const { calculateSignals } = useFitScore();
    const result = calculateSignals("school-1", athlete, schoolInfo);
    expect(result.personalFit).toBeDefined();
    expect(result.academicFit).toBeDefined();
  });

  it("returns cached result on second call with same schoolId", () => {
    const { calculateSignals, cache } = useFitScore();
    calculateSignals("school-2", athlete, schoolInfo);
    expect(cache.value.has("school-2")).toBe(true);
    const second = calculateSignals("school-2", athlete, schoolInfo);
    expect(second).toBe(cache.value.get("school-2"));
  });

  it("invalidate removes a school from cache", () => {
    const { calculateSignals, invalidate, cache } = useFitScore();
    calculateSignals("school-3", athlete, schoolInfo);
    expect(cache.value.has("school-3")).toBe(true);
    invalidate("school-3");
    expect(cache.value.has("school-3")).toBe(false);
  });

  it("clearCache empties all cached entries", () => {
    const { calculateSignals, clearCache, cache } = useFitScore();
    calculateSignals("school-4", athlete, schoolInfo);
    calculateSignals("school-5", athlete, schoolInfo);
    clearCache();
    expect(cache.value.size).toBe(0);
  });

  it("personalFit signals include location, campusSize, and cost", () => {
    const { calculateSignals } = useFitScore();
    const result = calculateSignals("school-6", athlete, schoolInfo);
    expect(result.personalFit.signals.location).toBeDefined();
    expect(result.personalFit.signals.campusSize).toBeDefined();
    expect(result.personalFit.signals.cost).toBeDefined();
  });

  it("academicFit signals include sat and act", () => {
    const { calculateSignals } = useFitScore();
    const result = calculateSignals("school-7", athlete, schoolInfo);
    expect(result.academicFit.signals.sat).toBeDefined();
    expect(result.academicFit.signals.act).toBeDefined();
  });
});
