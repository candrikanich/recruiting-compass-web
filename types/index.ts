/**
 * Re-export commonly used types with shorter names
 */

// import type { Schools } from "./database-helpers"; // Unused - available if needed
import type { School as SchoolModel } from "./models";

export type School = SchoolModel;

// Export other common types for convenience
export type { Schools } from "./database-helpers";
export type { Database } from "./database";
export type {
  PlayerProfile,
  Sport,
  Position,
  AgeValidationResult,
  FamilyCodeValidationResult,
  OnboardingStep,
  OnboardingProgress,
  ContextualPrompt,
} from "./onboarding";
