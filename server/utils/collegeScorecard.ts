/**
 * College Scorecard API client
 * Free data from US Dept of Education: https://collegescorecard.ed.gov/data/
 * API key registered at: https://api.data.gov/signup
 * Runtime config key: runtimeConfig.collegeScorecardApiKey (NUXT_COLLEGE_SCORECARD_API_KEY)
 */

import { useRuntimeConfig } from "#imports";
import type { SchoolAcademicInfo } from "~/types/schoolFit";

const BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools.json";

const SCORECARD_FIELDS = [
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
  "latest.admissions.sat_scores.25th_percentile.critical_reading":
    | number
    | null;
  "latest.admissions.sat_scores.75th_percentile.critical_reading":
    | number
    | null;
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
 * Returns up to 5 matches for the user to confirm the correct school.
 */
export async function searchCollegeScorecard(
  schoolName: string,
): Promise<ScorecardSearchResult> {
  const config = useRuntimeConfig();
  const apiKey = config.collegeScorecardApiKey as string;

  if (!apiKey) {
    throw new Error("NUXT_COLLEGE_SCORECARD_API_KEY is not configured");
  }

  const params = new URLSearchParams({
    "school.name": schoolName,
    fields: SCORECARD_FIELDS,
    per_page: "5",
    api_key: apiKey,
  });

  const response = await fetch(`${BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(
      `College Scorecard API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as {
    results: ScorecardSchool[];
    metadata: { total: number };
  };

  return { results: data.results ?? [], total: data.metadata?.total ?? 0 };
}

/**
 * Convert a Scorecard API result into our SchoolAcademicInfo shape.
 * SAT composite = reading + math for both 25th and 75th percentiles.
 */
export function scorecardToAcademicInfo(
  school: ScorecardSchool,
): Partial<SchoolAcademicInfo> {
  const sat25Reading =
    school["latest.admissions.sat_scores.25th_percentile.critical_reading"];
  const sat25Math = school["latest.admissions.sat_scores.25th_percentile.math"];
  const sat75Reading =
    school["latest.admissions.sat_scores.75th_percentile.critical_reading"];
  const sat75Math = school["latest.admissions.sat_scores.75th_percentile.math"];

  const sat25 =
    sat25Reading !== null && sat25Math !== null
      ? sat25Reading + sat25Math
      : null;
  const sat75 =
    sat75Reading !== null && sat75Math !== null
      ? sat75Reading + sat75Math
      : null;

  return {
    scorecard_id: school.id,
    state: school["school.state"] ?? undefined,
    city: school["school.city"] ?? undefined,
    student_size: school["latest.student.size"] ?? undefined,
    admission_rate:
      school["latest.admissions.admission_rate.overall"] ?? undefined,
    sat_25th: sat25 ?? undefined,
    sat_75th: sat75 ?? undefined,
    act_25th:
      school["latest.admissions.act_scores.25th_percentile.cumulative"] ??
      undefined,
    act_75th:
      school["latest.admissions.act_scores.75th_percentile.cumulative"] ??
      undefined,
    tuition_in_state: school["latest.cost.tuition.in_state"] ?? undefined,
    tuition_out_of_state:
      school["latest.cost.tuition.out_of_state"] ?? undefined,
    scorecard_fetched_at: new Date().toISOString(),
  };
}
