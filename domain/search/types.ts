export type SearchEntity = "schools" | "coaches" | "interactions" | "metrics";

export interface SchoolSearchFilters {
  division: string;
  state: string;
  verified: boolean | null;
}

export interface CoachSearchFilters {
  sport: string;
  responseRate: number;
  verified: boolean | null;
}

export interface InteractionSearchFilters {
  sentiment: string;
  direction: string;
  dateFrom: string;
  dateTo: string;
}

export interface MetricSearchFilters {
  metricType: string;
  minValue: number;
  maxValue: number;
}

export interface SearchFilters {
  schools: SchoolSearchFilters;
  coaches: CoachSearchFilters;
  interactions: InteractionSearchFilters;
  metrics: MetricSearchFilters;
}
