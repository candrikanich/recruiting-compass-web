import type { Suggestion, Urgency } from "~/types/timeline";

/**
 * Determines if a dismissed suggestion should be re-evaluated.
 *
 * A dismissed suggestion is eligible for re-evaluation if:
 * 1. It is actually dismissed (dismissed === true)
 * 2. It was dismissed at least 14 days ago
 * 3. It has not been completed
 * 4. It has not already reappeared
 *
 * @param suggestion The suggestion to check
 * @returns true if the suggestion should be re-evaluated, false otherwise
 */
export function shouldReEvaluateDismissedSuggestion(suggestion: Suggestion): boolean {
  // Must be dismissed
  if (!suggestion.dismissed) {
    return false;
  }

  // Must not be completed (completed suggestions never resurface)
  if (suggestion.completed) {
    return false;
  }

  // Must not have already reappeared
  if (suggestion.reappeared) {
    return false;
  }

  // Must have a dismissed_at timestamp
  if (!suggestion.dismissed_at) {
    return false;
  }

  // Must be dismissed for at least 14 days
  const dismissedDate = new Date(suggestion.dismissed_at);
  const now = new Date();
  const daysSinceDismissal = Math.floor(
    (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceDismissal >= 14;
}

/**
 * Escalates urgency to the next level when a suggestion re-evaluates.
 *
 * Escalation mapping:
 * - low → medium
 * - medium → high
 * - high → high (already at maximum)
 *
 * @param currentUrgency The current urgency level
 * @returns The escalated urgency level
 */
export function escalateUrgency(currentUrgency: Urgency): Urgency {
  switch (currentUrgency) {
    case "low":
      return "medium";
    case "medium":
      return "high";
    case "high":
      return "high";
    default:
      return "high";
  }
}
