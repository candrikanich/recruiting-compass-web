import { describe, it, expect } from "vitest";
import {
  shouldReEvaluateDismissedSuggestion,
  escalateUrgency,
} from "~/server/utils/rules/ruleEngineHelpers";
import type { Suggestion } from "~/types/timeline";

describe("ruleEngineHelpers", () => {
  describe("shouldReEvaluateDismissedSuggestion", () => {
    it("returns false if suggestion is not dismissed", () => {
      const suggestion = createSuggestion({ dismissed: false });
      expect(shouldReEvaluateDismissedSuggestion(suggestion)).toBe(false);
    });

    it("returns false if dismissed less than 14 days ago", () => {
      const dismissedDate = new Date();
      dismissedDate.setDate(dismissedDate.getDate() - 7);
      const suggestion = createSuggestion({
        dismissed: true,
        dismissed_at: dismissedDate.toISOString(),
      });
      expect(shouldReEvaluateDismissedSuggestion(suggestion)).toBe(false);
    });

    it("returns true if dismissed exactly 14 days ago", () => {
      const dismissedDate = new Date();
      dismissedDate.setDate(dismissedDate.getDate() - 14);
      const suggestion = createSuggestion({
        dismissed: true,
        dismissed_at: dismissedDate.toISOString(),
      });
      expect(shouldReEvaluateDismissedSuggestion(suggestion)).toBe(true);
    });

    it("returns true if dismissed more than 14 days ago", () => {
      const dismissedDate = new Date();
      dismissedDate.setDate(dismissedDate.getDate() - 21);
      const suggestion = createSuggestion({
        dismissed: true,
        dismissed_at: dismissedDate.toISOString(),
      });
      expect(shouldReEvaluateDismissedSuggestion(suggestion)).toBe(true);
    });

    it("returns false if completed (never re-evaluate completed)", () => {
      const dismissedDate = new Date();
      dismissedDate.setDate(dismissedDate.getDate() - 21);
      const suggestion = createSuggestion({
        dismissed: true,
        completed: true,
        dismissed_at: dismissedDate.toISOString(),
      });
      expect(shouldReEvaluateDismissedSuggestion(suggestion)).toBe(false);
    });

    it("returns false if dismissed_at is null", () => {
      const suggestion = createSuggestion({
        dismissed: true,
        dismissed_at: null,
      });
      expect(shouldReEvaluateDismissedSuggestion(suggestion)).toBe(false);
    });

    it("returns false if reappeared is already true", () => {
      const dismissedDate = new Date();
      dismissedDate.setDate(dismissedDate.getDate() - 21);
      const suggestion = createSuggestion({
        dismissed: true,
        reappeared: true,
        dismissed_at: dismissedDate.toISOString(),
      });
      expect(shouldReEvaluateDismissedSuggestion(suggestion)).toBe(false);
    });
  });

  describe("escalateUrgency", () => {
    it("escalates low to medium", () => {
      expect(escalateUrgency("low")).toBe("medium");
    });

    it("escalates medium to high", () => {
      expect(escalateUrgency("medium")).toBe("high");
    });

    it("keeps high at high", () => {
      expect(escalateUrgency("high")).toBe("high");
    });

    it("handles invalid urgency by defaulting to high", () => {
      expect(escalateUrgency("invalid" as any)).toBe("high");
    });
  });
});

// Helper function to create test suggestion with defaults
function createSuggestion(overrides: Partial<Suggestion>): Suggestion {
  return {
    id: "test-id",
    athlete_id: "athlete-id",
    rule_type: "interaction-gap",
    urgency: "medium",
    message: "Test suggestion",
    action_type: null,
    related_school_id: null,
    related_task_id: null,
    dismissed: false,
    dismissed_at: null,
    completed: false,
    completed_at: null,
    pending_surface: false,
    surfaced_at: null,
    condition_snapshot: null,
    reappeared: false,
    previous_suggestion_id: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}
