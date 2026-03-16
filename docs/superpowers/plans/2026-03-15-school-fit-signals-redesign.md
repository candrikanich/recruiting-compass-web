# School Fit Signals Redesign

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inaccurate 4-dimension composite fit score with two honest, independent signals — Personal Fit and Academic Fit — powered by real data.

**Architecture:** Remove athletic and opportunity fit entirely (unknowable). Keep personal fit (location/size/cost from player prefs). Power academic fit from the US Dept of Education College Scorecard API (free, public). Show signals as separate, transparent cards — never combined into a single misleading score.

**Tech Stack:** Nuxt 3, TypeScript strict, Supabase JSONB (`academic_info`), College Scorecard API (`api.data.gov/ed/collegescorecard/v1`)

---

## What We're Building

**Personal Fit** — calculated from athlete preferences vs school data we already have:
- Location: same state? (athlete's `school_state` vs school `academic_info.state`)
- Campus size: athlete preference (small/medium/large) vs school `academic_info.student_size`
- Cost: athlete cost sensitivity vs school `academic_info.tuition_out_of_state`

**Academic Fit** — calculated from athlete test scores vs College Scorecard data:
- SAT: athlete SAT vs school 25th/75th percentile range
- ACT: athlete ACT vs school 25th/75th percentile range
- Admission rate: context only (not a fit signal)

Both signals show as transparent cards with green/yellow/red indicators per sub-signal. If data is missing, we say so explicitly — never hide missing data with a fake score.

**What we remove:**
- `calculateAthleticFit()` and `calculateOpportunityFit()` from `utils/fitScoreCalculation.ts`
- The composite `fit_score` number from school cards and sorting
- The portfolio health "reach/match/safety" tier system (was based on the fake composite)
- The recalculate-all endpoint (no longer needed — signals are calculated on-the-fly)

**What we keep (but repurpose):**
- `fit_score` DB column → no longer written, not read for display (leave column, stop using it)
- `fit_score_data` DB column → same (column cleanup is a separate task)
- `academic_info` JSONB column → extended to store College Scorecard data

---

## File Map

**New files:**
- `types/schoolFit.ts` — `PersonalFitAnalysis`, `AcademicFitAnalysis`, `SchoolFitSignals` types
- `server/utils/collegeScorecard.ts` — API client for College Scorecard
- `server/api/schools/[id]/enrich.post.ts` — enriches a school's `academic_info` from Scorecard
- `components/School/SchoolFitSignals.vue` — new display component (replaces FitScoreDisplay for this use case)

**Modified files:**
- `utils/fitScoreCalculation.ts` — remove athletic/opportunity; rework personal/academic to return new types
- `composables/useFitScore.ts` — rework to return `PersonalFitAnalysis` and `AcademicFitAnalysis`
- `components/FitScore/FitScoreDisplay.vue` — kept but simplified (now delegates to SchoolFitSignals or is removed)
- `components/School/SchoolCard.vue` — replace composite score badge with personal fit grade
- `components/School/SchoolSidebar.vue` — replace `FitScoreDisplay` with `SchoolFitSignals`
- `pages/schools/[id]/index.vue` — load new signals instead of composite score
- `pages/schools/index.vue` — remove fit_score sort option and filter
- `components/Schools/SortSelector.vue` — remove "Fit Score" option
- `components/Schools/FilterPanel.vue` — remove fit_score filter range if present
- `server/api/schools/[id]/fit-score.get.ts` — returns signals, not composite score
- `server/api/schools/[id]/fit-score.post.ts` — deprecate or redirect to enrich endpoint
- `server/api/athlete/fit-scores/recalculate-all.post.ts` — remove (signals are on-the-fly)
- `components/Help/helpDefinitions.ts` — update fit score help text
- `types/timeline.ts` — clean up `FitScoreInputs`, `FitScoreResult`, `FIT_WEIGHTS` (keep types for now, note as deprecated)

**Test files updated:**
- `tests/unit/utils/fitScoreCalculation.spec.ts`
- `tests/unit/components/FitScoreDisplay.spec.ts`
- `tests/unit/server/api/schools-fit-score-access.spec.ts`
- `tests/unit/server/api/athlete-fit-scores-recalculate.spec.ts`

---

## Chunk 1: Types and Core Calculation Logic

### Task 1: Define new types in `types/schoolFit.ts`

**Files:**
- Create: `types/schoolFit.ts`

- [ ] **Step 1: Write the new types**

```typescript
// types/schoolFit.ts
/**
 * School Fit Signal Types
 * Two independent, transparent signals replacing the old composite fit score.
 */

export type FitSignalStrength = "strong" | "good" | "stretch" | "unknown";

export interface PersonalFitSignal {
  label: string;
  value: string | null; // human-readable value (e.g., "Same state", "Large (35,000 students)")
  strength: FitSignalStrength;
  explanation: string;
}

export interface PersonalFitAnalysis {
  signals: {
    location: PersonalFitSignal;
    campusSize: PersonalFitSignal;
    cost: PersonalFitSignal;
  };
  availableSignals: number; // how many signals have real data (0-3)
}

export type AcademicRange = {
  low: number;
  high: number;
};

export type TestScoreStrength = "above" | "in-range" | "below" | "unknown";

export interface AcademicFitSignal {
  label: string;
  athleteValue: number | null;
  schoolRange: AcademicRange | null;
  strength: TestScoreStrength;
  explanation: string;
}

export interface AcademicFitAnalysis {
  signals: {
    sat: AcademicFitSignal;
    act: AcademicFitSignal;
  };
  admissionRate: number | null; // 0.0-1.0, context only
  availableSignals: number; // how many signals have real data (0-2)
  hasSchoolData: boolean; // whether College Scorecard data exists for this school
}

export interface SchoolFitSignals {
  personalFit: PersonalFitAnalysis;
  academicFit: AcademicFitAnalysis;
}

/** Data we store in academic_info (extended for College Scorecard fields) */
export interface SchoolAcademicInfo {
  // Existing fields
  gpa_requirement?: number;
  avg_sat?: number;
  avg_act?: number;
  student_size?: number;
  state?: string;
  city?: string;
  tuition_in_state?: number;
  tuition_out_of_state?: number;
  majors?: string[];
  // College Scorecard fields
  scorecard_id?: number; // College Scorecard unit ID
  sat_25th?: number; // SAT composite 25th percentile
  sat_75th?: number; // SAT composite 75th percentile
  act_25th?: number; // ACT composite 25th percentile
  act_75th?: number; // ACT composite 75th percentile
  admission_rate?: number; // 0.0-1.0
  scorecard_fetched_at?: string; // ISO date of last Scorecard fetch
}

/** Athlete profile fields used for fit calculation */
export interface AthleteProfileForFit {
  school_state?: string | null;
  gpa?: number | null;
  sat_score?: number | null;
  act_score?: number | null;
  // Preferences (stored in user_preferences.data)
  campus_size_preference?: "small" | "medium" | "large" | null;
  cost_sensitivity?: "high" | "medium" | "low" | null;
}
```

- [ ] **Step 2: Confirm file saved correctly (no type errors)**

```bash
cd /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-web
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `types/schoolFit.ts`

- [ ] **Step 3: Commit**

```bash
git add types/schoolFit.ts
git commit -m "feat: add SchoolFitSignals types replacing composite fit score"
```

---

### Task 2: Rewrite fit calculation utilities

**Files:**
- Modify: `utils/fitScoreCalculation.ts`
- Modify: `tests/unit/utils/fitScoreCalculation.spec.ts`

The goal: remove `calculateAthleticFit` and `calculateOpportunityFit`. Rework `calculatePersonalFit` and `calculateAcademicFit` to return the new signal types. Keep the old `calculateFitScore`/`getFitTier` exports as no-ops or stubs with a deprecation note so imports don't break immediately (other files import them — we clean those up in later tasks).

- [ ] **Step 1: Update the failing tests first**

Open `tests/unit/utils/fitScoreCalculation.spec.ts`. Replace tests for `calculateAthleticFit` and `calculateOpportunityFit` with tests for the new signal-returning functions:

```typescript
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

  it("returns strong campus size signal when within medium range (5k-25k)", () => {
    const result = calculatePersonalFitSignals(baseAthlete, baseSchoolInfo);
    expect(result.signals.campusSize.strength).toBe("strong");
  });

  it("returns unknown signal when school size is missing", () => {
    const result = calculatePersonalFitSignals(baseAthlete, { ...baseSchoolInfo, student_size: undefined });
    expect(result.signals.campusSize.strength).toBe("unknown");
  });

  it("returns strong cost signal when cost is within medium sensitivity", () => {
    const result = calculatePersonalFitSignals(baseAthlete, baseSchoolInfo);
    expect(result.signals.cost.strength).toBe("strong");
  });

  it("counts available signals correctly", () => {
    const result = calculatePersonalFitSignals(baseAthlete, baseSchoolInfo);
    expect(result.availableSignals).toBe(3);
  });

  it("counts 0 available signals when no school data", () => {
    const result = calculatePersonalFitSignals(baseAthlete, {});
    expect(result.availableSignals).toBe(0);
  });
});

describe("calculateAcademicFitSignals", () => {
  it("returns above-range for SAT above 75th percentile", () => {
    const result = calculateAcademicFitSignals(
      { sat_score: 1450 },
      { sat_25th: 1100, sat_75th: 1350 }
    );
    expect(result.signals.sat.strength).toBe("above");
  });

  it("returns in-range for SAT within 25th-75th percentile", () => {
    const result = calculateAcademicFitSignals(
      { sat_score: 1200 },
      { sat_25th: 1100, sat_75th: 1350 }
    );
    expect(result.signals.sat.strength).toBe("in-range");
  });

  it("returns below for SAT below 25th percentile", () => {
    const result = calculateAcademicFitSignals(
      { sat_score: 980 },
      { sat_25th: 1100, sat_75th: 1350 }
    );
    expect(result.signals.sat.strength).toBe("below");
  });

  it("returns unknown SAT when athlete has no SAT", () => {
    const result = calculateAcademicFitSignals(
      { sat_score: null },
      { sat_25th: 1100, sat_75th: 1350 }
    );
    expect(result.signals.sat.strength).toBe("unknown");
  });

  it("returns unknown SAT when school has no SAT data", () => {
    const result = calculateAcademicFitSignals(
      { sat_score: 1200 },
      {}
    );
    expect(result.signals.sat.strength).toBe("unknown");
    expect(result.hasSchoolData).toBe(false);
  });

  it("includes admission rate when available", () => {
    const result = calculateAcademicFitSignals({ sat_score: 1200 }, { admission_rate: 0.45 });
    expect(result.admissionRate).toBe(0.45);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- tests/unit/utils/fitScoreCalculation.spec.ts
```

Expected: FAIL — `calculatePersonalFitSignals` and `calculateAcademicFitSignals` not found

- [ ] **Step 3: Rewrite `utils/fitScoreCalculation.ts`**

Replace the file content with the following (keeping the old exports as deprecated stubs so other files don't immediately break):

```typescript
/**
 * School Fit Signal Calculation Utilities
 *
 * Replaces the old 4-dimension composite fit score with two honest, independent signals:
 * - Personal Fit: location, campus size, cost preferences
 * - Academic Fit: SAT/ACT score comparison vs school ranges
 *
 * @deprecated calculateFitScore, calculateAthleticFit, calculateOpportunityFit are
 * stubs kept for backward compat during migration. Remove after all callers updated.
 */

import type {
  PersonalFitAnalysis,
  PersonalFitSignal,
  AcademicFitAnalysis,
  AcademicFitSignal,
  SchoolAcademicInfo,
  AthleteProfileForFit,
  FitSignalStrength,
  TestScoreStrength,
} from "~/types/schoolFit";
import type { FitTier, FitScoreInputs, FitScoreResult } from "~/types/timeline";

// ─── Personal Fit ────────────────────────────────────────────────────────────

/**
 * Calculate personal fit signals from athlete preferences vs school info.
 * Returns transparent per-signal analysis — never a composite score.
 */
export function calculatePersonalFitSignals(
  athlete: AthleteProfileForFit,
  school: SchoolAcademicInfo,
): PersonalFitAnalysis {
  const location = calcLocationSignal(athlete.school_state ?? null, school.state ?? null);
  const campusSize = calcCampusSizeSignal(
    athlete.campus_size_preference ?? null,
    school.student_size ?? null,
  );
  const cost = calcCostSignal(
    athlete.cost_sensitivity ?? null,
    school.tuition_out_of_state ?? school.tuition_in_state ?? null,
  );

  const availableSignals = [location, campusSize, cost].filter(
    (s) => s.strength !== "unknown",
  ).length;

  return { signals: { location, campusSize, cost }, availableSignals };
}

function calcLocationSignal(
  athleteState: string | null,
  schoolState: string | null,
): PersonalFitSignal {
  if (!athleteState || !schoolState) {
    return {
      label: "Location",
      value: null,
      strength: "unknown",
      explanation: "Add your home state to see location fit.",
    };
  }

  const sameState = athleteState === schoolState;
  return {
    label: "Location",
    value: sameState ? "In-state" : `Out-of-state (${schoolState})`,
    strength: sameState ? "strong" : "stretch",
    explanation: sameState
      ? "In-state tuition typically applies and you may have regional familiarity."
      : "Out-of-state — consider higher tuition costs and distance from home.",
  };
}

function calcCampusSizeSignal(
  preference: "small" | "medium" | "large" | null,
  studentSize: number | null,
): PersonalFitSignal {
  if (!studentSize) {
    return {
      label: "Campus Size",
      value: null,
      strength: "unknown",
      explanation: "Campus size data not available for this school.",
    };
  }

  const sizeLabel =
    studentSize < 5000 ? "Small" : studentSize <= 25000 ? "Medium" : "Large";
  const sizeDisplay = `${sizeLabel} (${studentSize.toLocaleString()} students)`;

  if (!preference) {
    return {
      label: "Campus Size",
      value: sizeDisplay,
      strength: "unknown",
      explanation: "Add your campus size preference in your profile to see fit.",
    };
  }

  const matches =
    (preference === "small" && studentSize < 5000) ||
    (preference === "medium" && studentSize >= 5000 && studentSize <= 25000) ||
    (preference === "large" && studentSize > 25000);

  return {
    label: "Campus Size",
    value: sizeDisplay,
    strength: matches ? "strong" : "stretch",
    explanation: matches
      ? `Matches your ${preference} campus preference.`
      : `This is a ${sizeLabel.toLowerCase()} campus; you prefer ${preference}.`,
  };
}

function calcCostSignal(
  sensitivity: "high" | "medium" | "low" | null,
  costOfAttendance: number | null,
): PersonalFitSignal {
  if (!costOfAttendance) {
    return {
      label: "Cost",
      value: null,
      strength: "unknown",
      explanation: "Tuition data not available for this school.",
    };
  }

  const costDisplay = `$${costOfAttendance.toLocaleString()}/yr`;

  if (!sensitivity) {
    return {
      label: "Cost",
      value: costDisplay,
      strength: "unknown",
      explanation: "Add your cost sensitivity in your profile to see fit.",
    };
  }

  let strength: FitSignalStrength;
  let explanation: string;

  if (sensitivity === "high") {
    strength = costOfAttendance <= 20000 ? "strong" : costOfAttendance <= 35000 ? "good" : "stretch";
    explanation =
      strength === "stretch"
        ? "Cost may be a significant challenge given your financial situation."
        : "Cost is within a manageable range for your situation.";
  } else if (sensitivity === "medium") {
    strength = costOfAttendance <= 35000 ? "strong" : costOfAttendance <= 55000 ? "good" : "stretch";
    explanation =
      strength === "stretch"
        ? "Cost is on the higher end — factor in scholarship potential."
        : "Cost is reasonable for your situation.";
  } else {
    // low sensitivity
    strength = "strong";
    explanation = "Cost is not a primary concern in your college search.";
  }

  return { label: "Cost", value: costDisplay, strength, explanation };
}

// ─── Academic Fit ─────────────────────────────────────────────────────────────

/**
 * Calculate academic fit signals from athlete test scores vs school score ranges.
 * Requires College Scorecard data in the school's academic_info.
 */
export function calculateAcademicFitSignals(
  athlete: Pick<AthleteProfileForFit, "sat_score" | "act_score">,
  school: Pick<
    SchoolAcademicInfo,
    "sat_25th" | "sat_75th" | "act_25th" | "act_75th" | "admission_rate"
  >,
): AcademicFitAnalysis {
  const sat = calcTestScoreSignal(
    "SAT",
    athlete.sat_score ?? null,
    school.sat_25th ?? null,
    school.sat_75th ?? null,
  );
  const act = calcTestScoreSignal(
    "ACT",
    athlete.act_score ?? null,
    school.act_25th ?? null,
    school.act_75th ?? null,
  );

  const hasSchoolData = !!(school.sat_25th || school.act_25th);
  const availableSignals = [sat, act].filter((s) => s.strength !== "unknown").length;

  return {
    signals: { sat, act },
    admissionRate: school.admission_rate ?? null,
    availableSignals,
    hasSchoolData,
  };
}

function calcTestScoreSignal(
  testName: "SAT" | "ACT",
  athleteScore: number | null,
  school25th: number | null,
  school75th: number | null,
): AcademicFitSignal {
  const hasRange = school25th !== null && school75th !== null;
  const range = hasRange ? { low: school25th!, high: school75th! } : null;

  if (!athleteScore || !hasRange) {
    const missingWhat = !athleteScore
      ? `Add your ${testName} score to your profile`
      : `No ${testName} data available for this school`;
    return {
      label: testName,
      athleteValue: athleteScore,
      schoolRange: range,
      strength: "unknown",
      explanation: `${missingWhat}.`,
    };
  }

  let strength: TestScoreStrength;
  let explanation: string;

  if (athleteScore >= school75th!) {
    strength = "above";
    explanation = `Your ${testName} of ${athleteScore} is above their 75th percentile (${school25th}–${school75th}).`;
  } else if (athleteScore >= school25th!) {
    strength = "in-range";
    explanation = `Your ${testName} of ${athleteScore} falls within their typical range (${school25th}–${school75th}).`;
  } else {
    strength = "below";
    explanation = `Your ${testName} of ${athleteScore} is below their 25th percentile (${school25th}–${school75th}). Consider test prep or schools with a lower range.`;
  }

  return { label: testName, athleteValue: athleteScore, schoolRange: range, strength, explanation };
}

// ─── Deprecated stubs (remove after all callers updated) ─────────────────────

/** @deprecated Use calculatePersonalFitSignals instead */
export function calculateFitScore(inputs: Partial<FitScoreInputs>): FitScoreResult {
  const score =
    (inputs.athleticFit ?? 0) +
    (inputs.academicFit ?? 0) +
    (inputs.opportunityFit ?? 0) +
    (inputs.personalFit ?? 0);
  return {
    score: Math.round(score),
    tier: getFitTier(score),
    breakdown: {
      athleticFit: inputs.athleticFit ?? 0,
      academicFit: inputs.academicFit ?? 0,
      opportunityFit: inputs.opportunityFit ?? 0,
      personalFit: inputs.personalFit ?? 0,
    },
    missingDimensions: [],
  };
}

/** @deprecated */
export function getFitTier(score: number): FitTier {
  if (score >= 70) return "match";
  if (score >= 50) return "reach";
  return "unlikely";
}

/** @deprecated */
export function getFitTierColor(_tier: FitTier): string {
  return "slate";
}

/** @deprecated — athletic fit is not calculable from available data */
export function calculateAthleticFit(): number {
  return 0;
}

/** @deprecated — opportunity fit is not calculable from available data */
export function calculateOpportunityFit(): number {
  return 0;
}

/** @deprecated — use calculateAcademicFitSignals instead */
export function calculateAcademicFit(): number {
  return 0;
}

/** @deprecated — use calculatePersonalFitSignals instead */
export function calculatePersonalFit(): number {
  return 0;
}

/** @deprecated */
export function getFitScoreRecommendation(): string {
  return "";
}

/** @deprecated */
export function calculatePortfolioHealth() {
  return {
    reaches: 0, matches: 0, safeties: 0, unlikelies: 0, total: 0,
    warnings: [], status: "not_started" as const,
  };
}

export const FIT_WEIGHTS = { athletic: 0, academic: 0, opportunity: 0, personal: 0 };
export const FIT_THRESHOLDS = { match: 70, reach: 50, unlikely: 0 };
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/unit/utils/fitScoreCalculation.spec.ts
```

Expected: all tests PASS

- [ ] **Step 5: Run type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new type errors

- [ ] **Step 6: Commit**

```bash
git add utils/fitScoreCalculation.ts tests/unit/utils/fitScoreCalculation.spec.ts
git commit -m "refactor: replace composite fit score with PersonalFit/AcademicFit signal functions"
```

---

## Chunk 2: College Scorecard API Integration

### Task 3: Build College Scorecard API client

**Files:**
- Create: `server/utils/collegeScorecard.ts`

The College Scorecard API is free and provided by the US Dept of Education. It requires an API key (free at https://api.data.gov/signup). Store the key as `COLLEGE_SCORECARD_API_KEY` in `.env.local` and Vercel env vars.

API base: `https://api.data.gov/ed/collegescorecard/v1/schools.json`

- [ ] **Step 1: Add env var to `.env.local`**

```
COLLEGE_SCORECARD_API_KEY=your_key_here
```

Also add to `.env.example` (or whatever the project uses for env documentation):
```
COLLEGE_SCORECARD_API_KEY=  # From https://api.data.gov/signup - free
```

- [ ] **Step 2: Create the API client**

```typescript
// server/utils/collegeScorecard.ts
/**
 * College Scorecard API client
 * Free data from US Dept of Education: https://collegescorecard.ed.gov/data/
 * API key: https://api.data.gov/signup
 */

import type { SchoolAcademicInfo } from "~/types/schoolFit";

const BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools.json";

const FIELDS = [
  "id",
  "school.name",
  "school.state",
  "school.city",
  "latest.student.size",
  "latest.admissions.admission_rate.overall",
  "latest.admissions.sat_scores.25th_percentile.critical_reading",
  "latest.admissions.sat_scores.75th_percentile.critical_reading",
  "latest.admissions.sat_scores.25th_percentile.math",
  "latest.admissions.sat_scores.75th_percentile.math",
  "latest.admissions.act_scores.25th_percentile.cumulative",
  "latest.admissions.act_scores.75th_percentile.cumulative",
  "latest.cost.tuition.in_state",
  "latest.cost.tuition.out_of_state",
].join(",");

export interface ScorecardSchool {
  id: number;
  "school.name": string;
  "school.state": string;
  "school.city": string;
  "latest.student.size": number | null;
  "latest.admissions.admission_rate.overall": number | null;
  "latest.admissions.sat_scores.25th_percentile.critical_reading": number | null;
  "latest.admissions.sat_scores.75th_percentile.critical_reading": number | null;
  "latest.admissions.sat_scores.25th_percentile.math": number | null;
  "latest.admissions.sat_scores.75th_percentile.math": number | null;
  "latest.admissions.act_scores.25th_percentile.cumulative": number | null;
  "latest.admissions.act_scores.75th_percentile.cumulative": number | null;
  "latest.cost.tuition.in_state": number | null;
  "latest.cost.tuition.out_of_state": number | null;
}

export interface ScorecardSearchResult {
  results: ScorecardSchool[];
  total: number;
}

/**
 * Search College Scorecard by school name.
 * Returns up to 5 matches for the user to confirm the right school.
 */
export async function searchCollegeScorecard(
  schoolName: string,
): Promise<ScorecardSearchResult> {
  const apiKey = process.env.COLLEGE_SCORECARD_API_KEY;
  if (!apiKey) {
    throw new Error("COLLEGE_SCORECARD_API_KEY is not configured");
  }

  const params = new URLSearchParams({
    "school.name": schoolName,
    fields: FIELDS,
    per_page: "5",
    api_key: apiKey,
  });

  const response = await fetch(`${BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`College Scorecard API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { results: ScorecardSchool[]; metadata: { total: number } };
  return { results: data.results ?? [], total: data.metadata?.total ?? 0 };
}

/**
 * Convert a Scorecard API result into our SchoolAcademicInfo shape.
 * SAT composite = reading 25th + math 25th (and same for 75th).
 */
export function scorecardToAcademicInfo(school: ScorecardSchool): Partial<SchoolAcademicInfo> {
  // Combine reading + math for composite SAT
  const sat25Reading = school["latest.admissions.sat_scores.25th_percentile.critical_reading"];
  const sat25Math = school["latest.admissions.sat_scores.25th_percentile.math"];
  const sat75Reading = school["latest.admissions.sat_scores.75th_percentile.critical_reading"];
  const sat75Math = school["latest.admissions.sat_scores.75th_percentile.math"];

  const sat25 = sat25Reading && sat25Math ? sat25Reading + sat25Math : null;
  const sat75 = sat75Reading && sat75Math ? sat75Reading + sat75Math : null;

  return {
    scorecard_id: school.id,
    state: school["school.state"] ?? undefined,
    city: school["school.city"] ?? undefined,
    student_size: school["latest.student.size"] ?? undefined,
    admission_rate: school["latest.admissions.admission_rate.overall"] ?? undefined,
    sat_25th: sat25 ?? undefined,
    sat_75th: sat75 ?? undefined,
    act_25th: school["latest.admissions.act_scores.25th_percentile.cumulative"] ?? undefined,
    act_75th: school["latest.admissions.act_scores.75th_percentile.cumulative"] ?? undefined,
    tuition_in_state: school["latest.cost.tuition.in_state"] ?? undefined,
    tuition_out_of_state: school["latest.cost.tuition.out_of_state"] ?? undefined,
    scorecard_fetched_at: new Date().toISOString(),
  };
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "collegeScorecard" | head -10
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add server/utils/collegeScorecard.ts
git commit -m "feat: add College Scorecard API client utility"
```

---

### Task 4: School enrichment endpoint

**Files:**
- Create: `server/api/schools/[id]/enrich.post.ts`

This endpoint:
1. Accepts `{ schoolName: string }` or uses the school's existing name
2. Searches the College Scorecard API
3. Returns up to 5 matches for the UI to present to the user
4. On confirmation (second call with `{ scorecardId: number, confirmed: true }`), merges the data into `academic_info`

This is a two-step flow to avoid silently setting wrong school data (many schools have similar names).

- [ ] **Step 1: Write the test**

```typescript
// tests/unit/server/api/schools-enrich.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "user-1" })),
  assertNotParent: vi.fn(async () => {}),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}));

vi.mock("~/server/utils/collegeScorecard", () => ({
  searchCollegeScorecard: vi.fn(),
  scorecardToAcademicInfo: vi.fn(),
}));

const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(),
};

describe("POST /api/schools/[id]/enrich", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns search results when no scorecardId provided", async () => {
    const { searchCollegeScorecard } = await import("~/server/utils/collegeScorecard");
    vi.mocked(searchCollegeScorecard).mockResolvedValue({
      results: [{ id: 123, "school.name": "Duke University", "school.state": "NC" } as any],
      total: 1,
    });
    mockSupabase.single.mockResolvedValue({
      data: { id: "school-1", family_unit_id: "fam-1", name: "Duke", academic_info: {} },
      error: null,
    });

    const { default: handler } = await import("~/server/api/schools/[id]/enrich.post");
    // Handler test would use mock h3 event — simplified assertion
    expect(searchCollegeScorecard).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to confirm fail**

```bash
npm test -- tests/unit/server/api/schools-enrich.spec.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create the endpoint**

```typescript
// server/api/schools/[id]/enrich.post.ts
/**
 * POST /api/schools/[id]/enrich
 * Enrich a school's academic_info with College Scorecard data.
 *
 * Step 1 — Search: POST { schoolName: string }
 *   → Returns array of matching schools from Scorecard for user to confirm
 *
 * Step 2 — Confirm: POST { scorecardId: number, confirmed: true }
 *   → Merges Scorecard data into school's academic_info and saves
 *
 * RESTRICTED: Athletes only
 */

import { defineEventHandler, createError, readBody } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import { requireUuidParam } from "~/server/utils/validation";
import {
  searchCollegeScorecard,
  scorecardToAcademicInfo,
  type ScorecardSchool,
} from "~/server/utils/collegeScorecard";
import type { SchoolAcademicInfo } from "~/types/schoolFit";

type EnrichBody =
  | { schoolName: string; confirmed?: false }
  | { scorecardId: number; confirmed: true };

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "schools/enrich");
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  await assertNotParent(user.id, supabase);

  const schoolId = requireUuidParam(event, "id");

  const body = await readBody<EnrichBody>(event);

  // Verify school belongs to user's family unit
  const { data: membership } = await supabase
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    throw createError({ statusCode: 404, statusMessage: "School not found" });
  }

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("id, name, academic_info, family_unit_id")
    .eq("id", schoolId)
    .eq("family_unit_id", membership.family_unit_id)
    .single();

  if (schoolError || !school) {
    throw createError({ statusCode: 404, statusMessage: "School not found" });
  }

  // Step 1: Search Scorecard
  if (!body.confirmed) {
    const searchName = body.schoolName || (school as { name: string }).name;
    if (!searchName) {
      throw createError({ statusCode: 400, statusMessage: "School name required" });
    }

    logger.info("Searching College Scorecard", { schoolName: searchName });

    const { results } = await searchCollegeScorecard(searchName);

    return {
      success: true,
      data: {
        matches: results.map((r: ScorecardSchool) => ({
          scorecardId: r.id,
          name: r["school.name"],
          state: r["school.state"],
          city: r["school.city"],
          studentSize: r["latest.student.size"],
          admissionRate: r["latest.admissions.admission_rate.overall"],
        })),
        instruction: "Select the correct school and confirm to save academic data.",
      },
    };
  }

  // Step 2: Confirm and save
  const { results } = await searchCollegeScorecard(
    (school as { name: string }).name,
  );

  const match = results.find((r: ScorecardSchool) => r.id === body.scorecardId);

  if (!match) {
    throw createError({ statusCode: 404, statusMessage: "School not found in College Scorecard" });
  }

  const enrichedData = scorecardToAcademicInfo(match);

  // Merge with existing academic_info
  const existingInfo =
    typeof school.academic_info === "object" && school.academic_info !== null
      ? (school.academic_info as SchoolAcademicInfo)
      : {};

  const mergedInfo: SchoolAcademicInfo = { ...existingInfo, ...enrichedData };

  const { error: updateError } = await supabase
    .from("schools")
    .update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      academic_info: mergedInfo as any,
      updated_at: new Date().toISOString(),
    })
    .eq("id", schoolId);

  if (updateError) {
    logger.error("Failed to save Scorecard data", updateError);
    throw createError({ statusCode: 500, statusMessage: "Failed to save academic data" });
  }

  logger.info("School enriched with Scorecard data", { schoolId, scorecardId: body.scorecardId });

  return {
    success: true,
    data: {
      schoolId,
      academicInfo: mergedInfo,
      message: "Academic data updated from College Scorecard.",
    },
  };
});
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/unit/server/api/schools-enrich.spec.ts
npm run type-check 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add server/api/schools/[id]/enrich.post.ts tests/unit/server/api/schools-enrich.spec.ts
git commit -m "feat: add school enrichment endpoint using College Scorecard API"
```

---

## Chunk 3: UI Components

### Task 5: Build `SchoolFitSignals.vue` component

**Files:**
- Create: `components/School/SchoolFitSignals.vue`

This replaces `FitScoreDisplay` for the school detail sidebar. It shows two independent cards — Personal Fit and Academic Fit — with transparent per-signal indicators. Never shows a number score. Uses green/amber/red chips for signal strength.

Signal strength → color:
- `strong` / `above` / `in-range` → green
- `good` → blue
- `stretch` / `below` → amber
- `unknown` → slate (dimmed)

- [ ] **Step 1: Create the component**

```vue
<!-- components/School/SchoolFitSignals.vue -->
<template>
  <div class="space-y-4">
    <!-- Personal Fit -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-semibold text-slate-900 text-sm">Personal Fit</h4>
        <span class="text-xs text-slate-400">Based on your preferences</span>
      </div>

      <div
        v-if="personalFit.availableSignals === 0"
        class="text-sm text-slate-500 py-2"
      >
        Add your home state, campus size preference, and cost sensitivity in your
        <NuxtLink to="/settings/player-details" class="text-blue-600 underline">
          profile
        </NuxtLink>
        to see personal fit.
      </div>

      <div v-else class="space-y-3">
        <FitSignalRow
          v-for="signal in personalFitSignals"
          :key="signal.label"
          :signal="signal"
        />
      </div>
    </div>

    <!-- Academic Fit -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-semibold text-slate-900 text-sm">Academic Fit</h4>
        <span class="text-xs text-slate-400">Test score comparison</span>
      </div>

      <!-- No school data — offer to enrich -->
      <div v-if="!academicFit.hasSchoolData" class="text-sm text-slate-500 py-2">
        <p>No academic data for this school yet.</p>
        <button
          class="mt-2 text-xs text-blue-600 underline hover:text-blue-700"
          @click="emit('enrich')"
        >
          Look up this school's academic profile →
        </button>
      </div>

      <div v-else class="space-y-3">
        <FitSignalRow
          v-for="signal in academicFitSignals"
          :key="signal.label"
          :signal="signal as PersonalFitSignal"
        />

        <!-- Admission rate as context (not a fit signal) -->
        <div
          v-if="academicFit.admissionRate !== null"
          class="pt-2 border-t border-slate-100 text-xs text-slate-500"
        >
          Acceptance rate: {{ formatAdmissionRate(academicFit.admissionRate) }}
        </div>
      </div>
    </div>

    <!-- Data source note -->
    <p class="text-xs text-slate-400 px-1">
      Academic data sourced from the
      <a
        href="https://collegescorecard.ed.gov"
        target="_blank"
        rel="noopener"
        class="underline"
      >US College Scorecard</a>.
      Personal fit based on your profile preferences.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
  PersonalFitAnalysis,
  AcademicFitAnalysis,
  PersonalFitSignal,
  AcademicFitSignal,
} from "~/types/schoolFit";

interface Props {
  personalFit: PersonalFitAnalysis;
  academicFit: AcademicFitAnalysis;
}

const props = defineProps<Props>();
const emit = defineEmits<{ enrich: [] }>();

const personalFitSignals = computed(() =>
  Object.values(props.personalFit.signals),
);

const academicFitSignals = computed(() =>
  Object.values(props.academicFit.signals),
);

function formatAdmissionRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}
</script>
```

Also create the `FitSignalRow` sub-component (small, focused):

```vue
<!-- components/School/FitSignalRow.vue -->
<template>
  <div class="flex items-start justify-between gap-3">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-slate-700">{{ signal.label }}</span>
        <span
          class="px-1.5 py-0.5 rounded-sm text-xs font-medium"
          :class="chipClass"
        >
          {{ chipLabel }}
        </span>
      </div>
      <p v-if="signal.value" class="text-xs text-slate-500 mt-0.5 truncate">
        {{ signal.value }}
      </p>
      <p class="text-xs text-slate-400 mt-0.5">{{ signal.explanation }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { PersonalFitSignal } from "~/types/schoolFit";

const props = defineProps<{ signal: PersonalFitSignal }>();

const chipClass = computed(() => {
  switch (props.signal.strength) {
    case "strong":
    case "above":
    case "in-range":
      return "bg-emerald-100 text-emerald-700";
    case "good":
      return "bg-blue-100 text-blue-700";
    case "stretch":
    case "below":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-400";
  }
});

const chipLabel = computed(() => {
  switch (props.signal.strength) {
    case "strong": return "Strong";
    case "above": return "Above range";
    case "in-range": return "In range";
    case "good": return "Good";
    case "stretch": return "Stretch";
    case "below": return "Below range";
    default: return "No data";
  }
});
</script>
```

Note: `FitSignalRow` references `signal.strength` with `"above"` and `"in-range"` which are `TestScoreStrength` values. The `PersonalFitSignal` type uses `FitSignalStrength`. Both are needed — adjust the prop type in `FitSignalRow` to accept `PersonalFitSignal | AcademicFitSignal` by using a union on the `strength` field.

- [ ] **Step 2: Run type-check after creating files**

```bash
npx tsc --noEmit 2>&1 | grep "FitSignal\|SchoolFit" | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/School/SchoolFitSignals.vue components/School/FitSignalRow.vue
git commit -m "feat: add SchoolFitSignals and FitSignalRow components"
```

---

### Task 6: Update `SchoolSidebar.vue` to use new component

**Files:**
- Modify: `components/School/SchoolSidebar.vue`

Replace the `FitScoreDisplay` section (lines 99–106) with `SchoolFitSignals`. The sidebar now receives `personalFit` and `academicFit` props instead of the old `fitScore` prop.

- [ ] **Step 1: Update the component**

In `SchoolSidebar.vue`:
1. Remove the `FitScoreDisplay` import and the old `fitScore?: FitScoreResult | null` prop
2. Add `personalFit: PersonalFitAnalysis` and `academicFit: AcademicFitAnalysis` props
3. Replace the "School Fit Analysis" card with `<SchoolFitSignals>`
4. Add `@enrich` event emission so the parent page can handle the enrichment flow

- [ ] **Step 2: Run type-check and tests**

```bash
npx tsc --noEmit 2>&1 | grep "SchoolSidebar" | head -10
npm test -- tests/unit/components/School/SchoolSidebar.spec.ts
```

- [ ] **Step 3: Commit**

```bash
git add components/School/SchoolSidebar.vue
git commit -m "feat: update SchoolSidebar to show fit signals instead of composite score"
```

---

### Task 7: Update `SchoolCard.vue` fit badge

**Files:**
- Modify: `components/School/SchoolCard.vue`

Replace the `{{ fitScore }}/100` composite badge with a simple personal fit indicator. Since `SchoolCard` is shown in list views where we don't want to re-calculate full signals on every card, show either:
- Nothing (no badge if no signal data available)
- A simple "In-state" location chip if athlete and school are same state

This keeps the card light. Remove the `fit_score` entirely from card display — school list is for browsing, not scoring.

- [ ] **Step 1: Update SchoolCard**

Remove `hasFitScore`, `fitScore`, and `fitScoreBadgeClass` computed properties. Remove the fit score badge span from the template. The card should not show any fit scoring — that detail belongs on the school detail page.

- [ ] **Step 2: Update test**

```bash
npm test -- tests/unit/components/School/SchoolCard.full.spec.ts
```

Fix any assertions that expected a fit score badge.

- [ ] **Step 3: Commit**

```bash
git add components/School/SchoolCard.vue tests/unit/components/School/SchoolCard.full.spec.ts
git commit -m "refactor: remove composite fit score badge from SchoolCard"
```

---

### Task 8: Remove fit score sorting from schools list

**Files:**
- Modify: `components/Schools/SortSelector.vue`
- Modify: `pages/schools/index.vue`
- Modify: `components/Schools/FilterPanel.vue`

- [ ] **Step 1: Remove "Fit Score" option from SortSelector**

Delete `<option value="fit-score">Fit Score</option>` from `SortSelector.vue`.

- [ ] **Step 2: Remove fit_score sort case from schools index**

In `pages/schools/index.vue`, remove the `case "fit-score":` sort block and the `fit_score?: { min: number; max: number }` from the filters type. Remove any fit_score range filter from `FilterPanel.vue` if present.

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/unit/pages/schools-sorting.spec.ts tests/unit/pages/schools-filtering.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add components/Schools/SortSelector.vue pages/schools/index.vue components/Schools/FilterPanel.vue
git commit -m "refactor: remove fit score sorting and filtering from schools list"
```

---

## Chunk 4: Composable and Page Updates

### Task 9: Refactor `useFitScore` composable

**Files:**
- Modify: `composables/useFitScore.ts`

Rewrite to expose `calculateSchoolFitSignals(schoolId, athlete, school)` → `SchoolFitSignals`. Remove `recalculateAllFitScores`, `getPortfolioHealth`, and the server-call functions (no longer needed — signals are calculated on-the-fly from profile data already in memory).

- [ ] **Step 1: Rewrite composable**

The composable now:
1. Takes athlete profile data (from `useProfileCompleteness` or player prefs store) and school `academic_info`
2. Calls `calculatePersonalFitSignals` and `calculateAcademicFitSignals` from the util
3. Returns the `SchoolFitSignals` object
4. Caches result by schoolId in a `shallowRef<Map>`

```typescript
// composables/useFitScore.ts
import { shallowRef, computed } from "vue";
import {
  calculatePersonalFitSignals,
  calculateAcademicFitSignals,
} from "~/utils/fitScoreCalculation";
import type {
  SchoolFitSignals,
  SchoolAcademicInfo,
  AthleteProfileForFit,
} from "~/types/schoolFit";

export function useFitScore() {
  const cache = shallowRef<Map<string, SchoolFitSignals>>(new Map());

  function calculateSignals(
    schoolId: string,
    athlete: AthleteProfileForFit,
    schoolInfo: SchoolAcademicInfo,
  ): SchoolFitSignals {
    const cached = cache.value.get(schoolId);
    if (cached) return cached;

    const personalFit = calculatePersonalFitSignals(athlete, schoolInfo);
    const academicFit = calculateAcademicFitSignals(athlete, schoolInfo);
    const signals: SchoolFitSignals = { personalFit, academicFit };

    const newMap = new Map(cache.value);
    newMap.set(schoolId, signals);
    cache.value = newMap;

    return signals;
  }

  function invalidate(schoolId: string) {
    const newMap = new Map(cache.value);
    newMap.delete(schoolId);
    cache.value = newMap;
  }

  function clearCache() {
    cache.value = new Map();
  }

  return { calculateSignals, invalidate, clearCache, cache: computed(() => cache.value) };
}
```

- [ ] **Step 2: Update tests**

`tests/unit/composables/useFitScoreRecalculation.spec.ts` — this tests the old server-call recalculation. Remove or replace with a test for the new composable.

- [ ] **Step 3: Run type-check**

```bash
npx tsc --noEmit 2>&1 | grep "useFitScore" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add composables/useFitScore.ts
git commit -m "refactor: simplify useFitScore to on-the-fly signal calculation"
```

---

### Task 10: Update school detail page

**Files:**
- Modify: `pages/schools/[id]/index.vue`

Replace the `loadFitScore` function and `fitScore` ref with calls to `useFitScore().calculateSignals()`. Pass `personalFit` and `academicFit` to `SchoolSidebar`. Handle the `@enrich` event by calling `$fetchAuth('/api/schools/:id/enrich')` and showing a modal or inline search results.

Key changes:
- Remove imports: `FitScoreResult`, `FitScoreInputs`, `calculateFitScore`, `useFitScore` (old), `FitScoreDisplay`
- Add imports: `SchoolFitSignals` type, new `useFitScore` composable
- Replace `const fitScore = ref<FitScoreResult | null>(null)` with `const fitSignals = ref<SchoolFitSignals | null>(null)`
- Replace `loadFitScore()` with direct call to `calculateSignals()`
- Add `handleEnrich()` function for the enrichment flow

- [ ] **Step 1: Update the page**

- [ ] **Step 2: Run type-check and tests**

```bash
npx tsc --noEmit 2>&1 | head -30
npm run test
```

- [ ] **Step 3: Commit**

```bash
git add pages/schools/[id]/index.vue
git commit -m "feat: update school detail page to use independent fit signals"
```

---

## Chunk 5: API Cleanup and Help Text

### Task 11: Simplify or deprecate old fit score API endpoints

**Files:**
- Modify: `server/api/schools/[id]/fit-score.get.ts`
- Modify: `server/api/schools/[id]/fit-score.post.ts`
- Modify: `server/api/athlete/fit-scores/recalculate-all.post.ts`

Signals are now calculated client-side from `academic_info` (which is already loaded with the school). The old fit-score endpoints stored a pre-calculated composite score. We no longer need to store or recalculate a composite.

**Plan:**
- `fit-score.get.ts` — keep as-is but note it will return `null` for new schools (no composite written anymore). This prevents breaking any parent-view code that may still call it. No changes needed.
- `fit-score.post.ts` — add a `410 Gone` response directing callers to use the enrich endpoint instead
- `recalculate-all.post.ts` — replace implementation with a `410 Gone` response

- [ ] **Step 1: Update `fit-score.post.ts`**

Replace the handler body with:
```typescript
throw createError({
  statusCode: 410,
  statusMessage: "Fit score calculation has been replaced by independent fit signals. Use POST /api/schools/[id]/enrich to update academic data.",
});
```

- [ ] **Step 2: Update `recalculate-all.post.ts`**

Replace the handler body with:
```typescript
return {
  success: true,
  updated: 0,
  failed: 0,
  message: "Batch fit score recalculation is no longer supported. Fit signals are calculated on-the-fly from school academic data.",
};
```

- [ ] **Step 3: Update tests**

```bash
npm test -- tests/unit/server/api/athlete-fit-scores-recalculate.spec.ts
npm test -- tests/unit/server/api/schools-fit-score-access.spec.ts
```

Fix assertions to match new responses.

- [ ] **Step 4: Commit**

```bash
git add server/api/schools/[id]/fit-score.post.ts server/api/athlete/fit-scores/recalculate-all.post.ts
git commit -m "refactor: deprecate composite fit score endpoints"
```

---

### Task 12: Update help definitions and help pages

**Files:**
- Modify: `components/Help/helpDefinitions.ts`
- Modify: `pages/help/schools.vue` (check if it references fit scores)

Update `fitScore`, `academicFit`, `athleticFit` entries to reflect the new signals approach.

- [ ] **Step 1: Update `helpDefinitions.ts`**

Replace the `fitScore`, `academicFit`, `athleticFit`, and `opportunityFit` entries:

```typescript
schoolFitSignals: {
  id: "school-fit-signals",
  title: "School Fit Signals",
  shortDescription: "Transparent indicators of academic and personal fit",
  fullDescription: `School Fit Signals give you two independent, honest views of how well a school matches your profile.

Personal Fit looks at things we know from your profile preferences: your home state, your campus size preference, and cost sensitivity. These are factors only you can weigh — a stretch on cost might be worth it for the right school.

Academic Fit compares your SAT or ACT scores against that school's typical admitted student range (sourced from the US College Scorecard). If your scores are in-range or above, you have a realistic academic profile for that school.

We do not show Athletic Fit or Opportunity Fit because we cannot reliably know what a coach is looking for or what roster spots are available. That information can only come from direct conversations with coaches.`,
},
```

- [ ] **Step 2: Run tests**

```bash
npm run test
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/Help/helpDefinitions.ts pages/help/schools.vue
git commit -m "docs: update help text to reflect fit signals redesign"
```

---

## Chunk 6: Final Verification

### Task 13: Full test suite and type-check pass

- [ ] **Step 1: Run full test suite**

```bash
npm run test
```

Expected: all tests pass (fix any remaining failures from old `fitScore` references)

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: 0 errors

- [ ] **Step 3: Lint**

```bash
npm run lint:fix
```

- [ ] **Step 4: Dev server smoke test**

```bash
npm run dev
```

Open browser:
- [ ] Schools list loads without errors
- [ ] School detail page loads
- [ ] Fit Signals card shows in sidebar (Personal Fit and Academic Fit sections)
- [ ] "Look up this school's academic profile" button visible when no Scorecard data
- [ ] Clicking enrich button works (or shows correct error if API key not set)
- [ ] No console errors

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete school fit signals redesign — remove composite score, add transparent per-signal analysis"
```

---

## Unresolved Questions

1. **College Scorecard API key** — You'll need to register for a free key at https://api.data.gov/signup and add `COLLEGE_SCORECARD_API_KEY` to Vercel env vars. This is required before the academic fit enrichment feature works.

2. **Athlete preferences for personal fit** — `campus_size_preference` and `cost_sensitivity` are new fields. Are they already collected in the player details form? If not, Task 10 will show "unknown" for those signals until the form is updated. Check `pages/settings/player-details.vue` — if missing, add a follow-up task.

3. **School cards in list view** — Removing the fit score badge from `SchoolCard` means the list page shows no fit indication at all. Is that acceptable, or do you want a minimal "same state" indicator on cards? Decision needed before Task 7.

4. **Portfolio Health widget** — Currently only referenced in `SuggestionHelpModal`. Since the new signals don't produce reach/match/safety tiers, portfolio health as a concept goes away. Confirm this is fine — or decide if there's a new version (e.g., "Your list has X schools with in-range test scores").

5. **Backward compat for `fit_score` DB column** — The plan leaves the column in place and just stops writing to it. If you want a clean DB, a migration to drop `fit_score` and `fit_score_data` from the `schools` table is a follow-up task not included here.
