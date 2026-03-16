import { describe, it, expect } from "vitest";
import {
  calculatePersonalFitSignals,
  calculateAcademicFitSignals,
} from "~/utils/fitScoreCalculation";
import type { SchoolAcademicInfo, AthleteProfileForFit } from "~/types/schoolFit";

describe("calculatePersonalFitSignals", () => {
  const baseAthlete: AthleteProfileForFit = {
    school_state: "NC",
    campus_size_preference: "medium",
    cost_sensitivity: "medium",
  };

  const baseSchoolInfo: SchoolAcademicInfo = {
    state: "NC",
    student_size: 15000,
    tuition_out_of_state: 28000,
  };

  it("returns strong location signal for same state", () => {
    const result = calculatePersonalFitSignals(baseAthlete, baseSchoolInfo);
    expect(result.signals.location.strength).toBe("strong");
  });

  it("returns stretch location signal for different state", () => {
    const result = calculatePersonalFitSignals(baseAthlete, { ...baseSchoolInfo, state: "CA" });
    expect(result.signals.location.strength).toBe("stretch");
  });

  it("returns unknown location signal when athlete state is missing", () => {
    const result = calculatePersonalFitSignals({ ...baseAthlete, school_state: null }, baseSchoolInfo);
    expect(result.signals.location.strength).toBe("unknown");
  });

  it("returns strong campus size signal when within medium range (5k-25k)", () => {
    const result = calculatePersonalFitSignals(baseAthlete, baseSchoolInfo);
    expect(result.signals.campusSize.strength).toBe("strong");
  });

  it("returns stretch campus size signal when outside preference range", () => {
    const result = calculatePersonalFitSignals(
      { ...baseAthlete, campus_size_preference: "small" },
      baseSchoolInfo
    );
    expect(result.signals.campusSize.strength).toBe("stretch");
  });

  it("returns unknown campus size signal when school size is missing", () => {
    const result = calculatePersonalFitSignals(baseAthlete, { ...baseSchoolInfo, student_size: undefined });
    expect(result.signals.campusSize.strength).toBe("unknown");
  });

  it("returns strong cost signal when cost is within medium sensitivity range", () => {
    const result = calculatePersonalFitSignals(baseAthlete, baseSchoolInfo);
    expect(result.signals.cost.strength).toBe("strong");
  });

  it("returns stretch cost signal when cost is high for high-sensitivity athlete", () => {
    const result = calculatePersonalFitSignals(
      { ...baseAthlete, cost_sensitivity: "high" },
      { ...baseSchoolInfo, tuition_out_of_state: 50000 }
    );
    expect(result.signals.cost.strength).toBe("stretch");
  });

  it("counts available signals correctly when all data present", () => {
    const result = calculatePersonalFitSignals(baseAthlete, baseSchoolInfo);
    expect(result.availableSignals).toBe(3);
  });

  it("counts 0 available signals when no school data", () => {
    const result = calculatePersonalFitSignals(baseAthlete, {});
    expect(result.availableSignals).toBe(0);
  });

  it("returns unknown signals when athlete has no preferences", () => {
    const result = calculatePersonalFitSignals({}, baseSchoolInfo);
    expect(result.signals.location.strength).toBe("unknown");
    expect(result.signals.campusSize.strength).toBe("unknown");
    expect(result.signals.cost.strength).toBe("unknown");
  });
});

describe("calculateAcademicFitSignals", () => {
  it("returns above strength for SAT above 75th percentile", () => {
    const result = calculateAcademicFitSignals(
      { sat_score: 1450 },
      { sat_25th: 1100, sat_75th: 1350 }
    );
    expect(result.signals.sat.strength).toBe("above");
  });

  it("returns in-range strength for SAT within 25th-75th percentile", () => {
    const result = calculateAcademicFitSignals(
      { sat_score: 1200 },
      { sat_25th: 1100, sat_75th: 1350 }
    );
    expect(result.signals.sat.strength).toBe("in-range");
  });

  it("returns below strength for SAT below 25th percentile", () => {
    const result = calculateAcademicFitSignals(
      { sat_score: 980 },
      { sat_25th: 1100, sat_75th: 1350 }
    );
    expect(result.signals.sat.strength).toBe("below");
  });

  it("returns unknown SAT strength when athlete has no SAT score", () => {
    const result = calculateAcademicFitSignals(
      { sat_score: null },
      { sat_25th: 1100, sat_75th: 1350 }
    );
    expect(result.signals.sat.strength).toBe("unknown");
  });

  it("returns unknown SAT strength when school has no SAT data", () => {
    const result = calculateAcademicFitSignals({ sat_score: 1200 }, {});
    expect(result.signals.sat.strength).toBe("unknown");
    expect(result.hasSchoolData).toBe(false);
  });

  it("returns above strength for ACT above 75th percentile", () => {
    const result = calculateAcademicFitSignals(
      { act_score: 34 },
      { act_25th: 26, act_75th: 32 }
    );
    expect(result.signals.act.strength).toBe("above");
  });

  it("returns in-range strength for ACT within range", () => {
    const result = calculateAcademicFitSignals(
      { act_score: 29 },
      { act_25th: 26, act_75th: 32 }
    );
    expect(result.signals.act.strength).toBe("in-range");
  });

  it("includes admission rate when available", () => {
    const result = calculateAcademicFitSignals(
      { sat_score: 1200 },
      { sat_25th: 1100, sat_75th: 1350, admission_rate: 0.45 }
    );
    expect(result.admissionRate).toBe(0.45);
  });

  it("sets hasSchoolData true when Scorecard data present", () => {
    const result = calculateAcademicFitSignals(
      { sat_score: 1200 },
      { sat_25th: 1100, sat_75th: 1350 }
    );
    expect(result.hasSchoolData).toBe(true);
  });

  it("counts availableSignals correctly when both scores present", () => {
    const result = calculateAcademicFitSignals(
      { sat_score: 1200, act_score: 29 },
      { sat_25th: 1100, sat_75th: 1350, act_25th: 26, act_75th: 32 }
    );
    expect(result.availableSignals).toBe(2);
  });
});
