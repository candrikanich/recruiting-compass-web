import type { NcaaDivision } from "~/utils/ncaaDatabase";

export interface SchoolRecommendation {
  catalogKey: string;
  name: string;
  division: NcaaDivision;
  conference: string | null;
  state: string | null;
  website: string | null;
  athleticsUrl: string | null;
  score: number;
  reasons: string[];
}

export interface SchoolRecommendationSignals {
  homeState: string | null;
  gpa: number | null;
  excludedCount: number;
}

export type RecommendationCacheSource =
  "memory" | "redis" | "postgres" | "origin";

export interface SchoolRecommendationsResponse {
  recommendations: SchoolRecommendation[];
  signals: SchoolRecommendationSignals;
  cache: RecommendationCacheSource;
}

export interface DismissSchoolRecommendationBody {
  catalogKey: string;
  athleteId?: string;
}

export interface DismissSchoolRecommendationResponse {
  dismissed: true;
  catalogKey: string;
}
