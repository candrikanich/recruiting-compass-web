/**
 * School Fit Signal Types
 * Two independent, transparent signals replacing the old composite fit score.
 */

export type FitSignalStrength = "strong" | "good" | "stretch" | "unknown";
export type TestScoreStrength = "above" | "in-range" | "below" | "unknown";

export interface PersonalFitSignal {
  label: string;
  value: string | null;
  strength: FitSignalStrength;
  explanation: string;
}

export interface PersonalFitAnalysis {
  signals: {
    location: PersonalFitSignal;
    campusSize: PersonalFitSignal;
    cost: PersonalFitSignal;
  };
  availableSignals: number;
}

export interface AcademicRange {
  low: number;
  high: number;
}

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
  admissionRate: number | null;
  availableSignals: number;
  hasSchoolData: boolean;
}

export interface SchoolFitSignals {
  personalFit: PersonalFitAnalysis;
  academicFit: AcademicFitAnalysis;
}

/** Extended academic_info shape stored in schools.academic_info JSONB */
export interface SchoolAcademicInfo {
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
  scorecard_id?: number;
  sat_25th?: number;
  sat_75th?: number;
  act_25th?: number;
  act_75th?: number;
  admission_rate?: number;
  scorecard_fetched_at?: string;
}

/** Athlete profile fields used for fit signal calculation */
export interface AthleteProfileForFit {
  school_state?: string | null;
  gpa?: number | null;
  sat_score?: number | null;
  act_score?: number | null;
  campus_size_preference?: "small" | "medium" | "large" | null;
  cost_sensitivity?: "high" | "medium" | "low" | null;
}
