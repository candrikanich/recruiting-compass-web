import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  useOnboarding,
  type OnboardingAssessment,
} from "~/composables/useOnboarding";

// Mock Supabase
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(),
  })),
  useAuth: vi.fn(() => ({
    user: { value: { id: "test-user-id" } },
    session: { value: { user: { id: "test-user-id" } } },
  })),
}));

// Mock $fetch
global.$fetch = vi.fn();

describe("useOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateStartingPhase", () => {
    const { calculateStartingPhase } = useOnboarding();

    it("returns freshman for no milestones completed", () => {
      const assessment: OnboardingAssessment = {
        hasHighlightVideo: false,
        hasContactedCoaches: false,
        hasTargetSchools: false,
        hasRegisteredEligibility: false,
        hasTakenTestScores: false,
      };
      expect(calculateStartingPhase(assessment)).toBe("freshman");
    });

    it("returns sophomore when highlight video and target schools are completed", () => {
      const assessment: OnboardingAssessment = {
        hasHighlightVideo: true,
        hasContactedCoaches: false,
        hasTargetSchools: true,
        hasRegisteredEligibility: false,
        hasTakenTestScores: false,
      };
      expect(calculateStartingPhase(assessment)).toBe("sophomore");
    });

    it("returns junior when eligibility is registered", () => {
      const assessment: OnboardingAssessment = {
        hasHighlightVideo: false,
        hasContactedCoaches: false,
        hasTargetSchools: false,
        hasRegisteredEligibility: true,
        hasTakenTestScores: false,
      };
      expect(calculateStartingPhase(assessment)).toBe("junior");
    });

    it("returns junior when test scores are taken", () => {
      const assessment: OnboardingAssessment = {
        hasHighlightVideo: false,
        hasContactedCoaches: false,
        hasTargetSchools: false,
        hasRegisteredEligibility: false,
        hasTakenTestScores: true,
      };
      expect(calculateStartingPhase(assessment)).toBe("junior");
    });

    it("prioritizes junior phase when both eligibility and test scores are done", () => {
      const assessment: OnboardingAssessment = {
        hasHighlightVideo: true,
        hasContactedCoaches: true,
        hasTargetSchools: true,
        hasRegisteredEligibility: true,
        hasTakenTestScores: true,
      };
      expect(calculateStartingPhase(assessment)).toBe("junior");
    });
  });

  describe("getTasksToComplete", () => {
    const { getTasksToComplete } = useOnboarding();

    it("returns empty array when no milestones are completed", () => {
      const assessment: OnboardingAssessment = {
        hasHighlightVideo: false,
        hasContactedCoaches: false,
        hasTargetSchools: false,
        hasRegisteredEligibility: false,
        hasTakenTestScores: false,
      };
      expect(getTasksToComplete(assessment)).toEqual([]);
    });

    it("includes video task when highlight video is completed", () => {
      const assessment: OnboardingAssessment = {
        hasHighlightVideo: true,
        hasContactedCoaches: false,
        hasTargetSchools: false,
        hasRegisteredEligibility: false,
        hasTakenTestScores: false,
      };
      const tasks = getTasksToComplete(assessment);
      expect(tasks).toContain("task-10-r1");
    });

    it("includes coach contact tasks when coaches contacted", () => {
      const assessment: OnboardingAssessment = {
        hasHighlightVideo: false,
        hasContactedCoaches: true,
        hasTargetSchools: false,
        hasRegisteredEligibility: false,
        hasTakenTestScores: false,
      };
      const tasks = getTasksToComplete(assessment);
      expect(tasks).toContain("task-10-r3");
      expect(tasks).toContain("task-10-r5");
      expect(tasks).toContain("task-11-r1");
    });

    it("includes school list task when target schools identified", () => {
      const assessment: OnboardingAssessment = {
        hasHighlightVideo: false,
        hasContactedCoaches: false,
        hasTargetSchools: true,
        hasRegisteredEligibility: false,
        hasTakenTestScores: false,
      };
      const tasks = getTasksToComplete(assessment);
      expect(tasks).toContain("task-10-r3");
    });

    it("includes eligibility task when registered", () => {
      const assessment: OnboardingAssessment = {
        hasHighlightVideo: false,
        hasContactedCoaches: false,
        hasTargetSchools: false,
        hasRegisteredEligibility: true,
        hasTakenTestScores: false,
      };
      const tasks = getTasksToComplete(assessment);
      expect(tasks).toContain("task-11-a1");
    });

    it("includes test score tasks when tests taken", () => {
      const assessment: OnboardingAssessment = {
        hasHighlightVideo: false,
        hasContactedCoaches: false,
        hasTargetSchools: false,
        hasRegisteredEligibility: false,
        hasTakenTestScores: true,
      };
      const tasks = getTasksToComplete(assessment);
      expect(tasks).toContain("task-9-a1");
      expect(tasks).toContain("task-10-a2");
    });

    it("deduplicates task IDs when multiple answers map to same task", () => {
      const assessment: OnboardingAssessment = {
        hasHighlightVideo: false,
        hasContactedCoaches: true, // includes task-10-r3
        hasTargetSchools: true, // also includes task-10-r3
        hasRegisteredEligibility: false,
        hasTakenTestScores: false,
      };
      const tasks = getTasksToComplete(assessment);
      const count = tasks.filter((t) => t === "task-10-r3").length;
      expect(count).toBe(1); // Should appear only once
    });

    it("handles all milestones completed", () => {
      const assessment: OnboardingAssessment = {
        hasHighlightVideo: true,
        hasContactedCoaches: true,
        hasTargetSchools: true,
        hasRegisteredEligibility: true,
        hasTakenTestScores: true,
      };
      const tasks = getTasksToComplete(assessment);
      expect(tasks.length).toBeGreaterThan(0);
      expect(new Set(tasks).size).toBe(tasks.length); // All unique
    });
  });

  describe("checkOnboardingStatus", () => {
    it("returns false when onboarding_complete is not set", async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "No rows returned" },
            }),
          })),
        })),
      };

      // The mock is already set up at the top of the file

      const { checkOnboardingStatus } = useOnboarding();
      const result = await checkOnboardingStatus();
      expect(result).toBe(false);
    });

    it("returns true when onboarding_complete is true", async () => {
      // Mock the global useSupabase implementation
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  phase_milestone_data: {
                    onboarding_complete: true,
                  },
                },
                error: null,
              }),
            })),
          })),
        })),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "test-user" } } },
          }),
        },
      };

      // Update the mock implementation
      const { useSupabase } = await import("~/composables/useSupabase");
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const { checkOnboardingStatus } = useOnboarding();
      const result = await checkOnboardingStatus();
      expect(result).toBe(true);
    });

    it("returns false on database error", async () => {
      // Mock the global useSupabase implementation
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error("Database error"),
              }),
            })),
          })),
        })),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "test-user" } } },
          }),
        },
      };

      // Update the mock implementation
      const { useSupabase } = await import("~/composables/useSupabase");
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const { checkOnboardingStatus } = useOnboarding();
      const result = await checkOnboardingStatus();
      expect(result).toBe(false);
    });
  });

  describe("saveOnboardingStep", () => {
    it("should save onboarding step data", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "test-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      localStorage.clear();

      const { saveOnboardingStep } = useOnboarding();
      const stepData = {
        graduation_year: 2026,
        primary_sport: "soccer",
      };

      await saveOnboardingStep(2, stepData);

      // Verify localStorage was updated with step data
      const stored = localStorage.getItem("onboarding_progress_test-user");
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.current_step).toBe(2);
      expect(parsed.step_data.graduation_year).toBe(2026);
    });

    it("should handle step save errors", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockRejectedValue(new Error("Database error")),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const { saveOnboardingStep } = useOnboarding();

      await expect(saveOnboardingStep(1, { field: "value" })).rejects.toThrow();
    });
  });

  describe("getOnboardingProgress", () => {
    it("should return onboarding progress percentage", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  completed_steps: [1, 2, 3],
                },
                error: null,
              }),
            })),
          })),
        })),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "test-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const { getOnboardingProgress } = useOnboarding();
      const progress = await getOnboardingProgress();

      expect(typeof progress).toBe("number");
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });

    it("should return 0 for no steps completed", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "test-user-2" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      // Ensure localStorage has no data for this user
      localStorage.removeItem("onboarding_progress_test-user-2");

      const { getOnboardingProgress } = useOnboarding();
      const progress = await getOnboardingProgress();

      expect(progress).toBe(0);
    });
  });

  describe("completeOnboarding with graduation_year", () => {
    it("should calculate starting phase based on graduation year", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "test-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const { completeOnboarding } = useOnboarding();
      const assessment: OnboardingAssessment = {
        hasHighlightVideo: false,
        hasContactedCoaches: false,
        hasTargetSchools: false,
        hasRegisteredEligibility: false,
        hasTakenTestScores: false,
      };

      const result = await completeOnboarding(assessment);
      expect(result.phase).toBeDefined();
      expect(["freshman", "sophomore", "junior"]).toContain(result.phase);
    });
  });
});
