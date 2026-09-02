import type { Division, AppSport } from "~/utils/recruitingCalendar/types";

export type UserDeadlineCategory =
  | "application"
  | "decision"
  | "financial_aid"
  | "visit"
  | "custom";

export type SystemDeadlineCategory =
  | "test"
  | "signing"
  | "ncaa-period"
  | "deadline"
  | "application";

export interface UnifiedDeadline {
  id: string;
  label: string;
  date: string;
  endDate?: string;
  category: UserDeadlineCategory | SystemDeadlineCategory;
  source: "user" | "system";
  sport?: AppSport;
  division?: Division;
  schoolId?: string;
  description?: string;
  url?: string;
}
