/**
 * Onboarding and family linking type definitions
 */

/**
 * Player profile data captured during onboarding
 */
export interface PlayerProfile {
  graduation_year?: number;
  primary_sport?: string;
  primary_position?: string;
  primary_position_custom?: string;
  secondary_sport?: string;
  secondary_position?: string;
  secondary_position_custom?: string;
  zip_code?: string;
  gpa?: number;
  sat_score?: number;
  act_score?: number;
  highlight_video_url?: string;
  athletic_stats?: string;
  phone?: string;
}

/**
 * Sport definition for dropdown selection
 */
export interface Sport {
  id: string;
  name: string;
  hasPositionList: boolean;
  displayOrder: number;
}

/**
 * Position definition for sport-specific selection
 */
export interface Position {
  id: string;
  sportId: string;
  name: string;
  displayOrder: number;
}

/**
 * Age verification result
 */
export interface AgeValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Family code validation result
 */
export interface FamilyCodeValidationResult {
  valid: boolean;
  playerProfile?: PlayerProfile;
  error?: string;
}

/**
 * Onboarding step data
 */
export interface OnboardingStep {
  step: number;
  completed: boolean;
  data: Record<string, unknown>;
}

/**
 * Onboarding progress tracking
 */
export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: number;
  isComplete: boolean;
  profileCompleteness: number;
}

/**
 * Contextual prompt for profile completion
 */
export interface ContextualPrompt {
  id: string;
  title: string;
  message: string;
  targetField: string;
  dismissedAt?: string;
  dismissDurationDays?: number;
}
