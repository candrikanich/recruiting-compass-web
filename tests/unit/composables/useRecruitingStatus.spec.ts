import { describe, it, expect, beforeEach, vi } from "vitest";
import { useRecruitingStatus } from "~/composables/useRecruitingStatus";
import { setActivePinia, createPinia } from "pinia";

vi.mock("~/utils/authFetch", () => ({
  fetchAuth: vi.fn(),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    user: { id: "user-123", email: "test@example.com" },
    isAuthenticated: true,
  }),
}));

import { fetchAuth } from "~/utils/authFetch";

describe("useRecruitingStatus", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with default state", () => {
      const { statusScore, statusLabel, currentPhase, loading, error } =
        useRecruitingStatus();

      expect(statusScore.value).toBe(0);
      expect(statusLabel.value).toBe("on_track");
      expect(currentPhase.value).toBe("freshman");
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
    });

    it("should initialize with empty score breakdown", () => {
      const { scoreBreakdown } = useRecruitingStatus();

      expect(scoreBreakdown.value.taskCompletionRate).toBe(0);
      expect(scoreBreakdown.value.interactionFrequencyScore).toBe(0);
      expect(scoreBreakdown.value.coachInterestScore).toBe(0);
      expect(scoreBreakdown.value.academicStandingScore).toBe(0);
    });

    it("should initialize with null milestone progress", () => {
      const { milestoneProgress } = useRecruitingStatus();

      expect(milestoneProgress.value).toBeNull();
    });
  });

  describe("Status Methods", () => {
    it("should fetch status score", async () => {
      const mockResponse = {
        score: 75,
        label: "on_track" as const,
        breakdown: {
          taskCompletionRate: 80,
          interactionFrequencyScore: 70,
          coachInterestScore: 65,
          academicStandingScore: 75,
        },
      };

      vi.mocked(fetchAuth).mockResolvedValueOnce(mockResponse);

      const { fetchStatusScore, statusScore, statusLabel } =
        useRecruitingStatus();

      const result = await fetchStatusScore();

      expect(statusScore.value).toBe(75);
      expect(statusLabel.value).toBe("on_track");
      expect(result.status_score).toBe(75);
    });

    it("should recalculate status", async () => {
      const mockResponse = {
        score: 80,
        label: "on_track" as const,
        breakdown: {
          taskCompletionRate: 85,
          interactionFrequencyScore: 80,
          coachInterestScore: 75,
          academicStandingScore: 80,
        },
      };

      vi.mocked(fetchAuth).mockResolvedValueOnce(mockResponse);

      const { recalculateStatus, statusScore } = useRecruitingStatus();

      const result = await recalculateStatus();

      expect(statusScore.value).toBe(80);
      expect(result.status_score).toBe(80);
    });

    it("should handle status fetch error", async () => {
      const error = new Error("API Error");
      vi.mocked(fetchAuth).mockRejectedValueOnce(error);

      const { fetchStatusScore, error: errorRef } = useRecruitingStatus();

      await expect(fetchStatusScore()).rejects.toThrow();
      expect(errorRef.value).toBe("API Error");
    });
  });

  describe("Phase Methods", () => {
    it("should fetch phase", async () => {
      const mockResponse = {
        phase: "sophomore" as const,
        milestoneProgress: {
          required: ["m1", "m2", "m3"],
          completed: ["m1", "m2"],
          remaining: ["m3"],
          percentComplete: 66,
        },
      };

      vi.mocked(fetchAuth).mockResolvedValueOnce(mockResponse);

      const { fetchPhase, currentPhase, milestoneProgress } =
        useRecruitingStatus();

      await fetchPhase();

      expect(currentPhase.value).toBe("sophomore");
      expect(milestoneProgress.value?.remaining).toEqual(["m3"]);
    });

    it("should advance phase", async () => {
      const mockAdvanceResponse = {
        success: true,
        phase: "sophomore" as const,
      };

      const mockFetchResponse = {
        phase: "sophomore" as const,
        milestoneProgress: {
          required: ["m1", "m2"],
          completed: ["m1", "m2"],
          remaining: [],
          percentComplete: 100,
        },
      };

      vi.mocked(fetchAuth)
        .mockResolvedValueOnce(mockAdvanceResponse)
        .mockResolvedValueOnce(mockFetchResponse);

      const { advancePhase, currentPhase } = useRecruitingStatus();

      const result = await advancePhase();

      expect(result.success).toBe(true);
      expect(currentPhase.value).toBe("sophomore");
    });

    it("should handle phase fetch error", async () => {
      vi.mocked(fetchAuth).mockRejectedValueOnce(
        new Error("Phase fetch failed"),
      );

      const { fetchPhase, error } = useRecruitingStatus();

      await expect(fetchPhase()).rejects.toThrow();
      expect(error.value).toBe("Phase fetch failed");
    });
  });

  describe("State Separation", () => {
    it("should maintain independent status and phase state", async () => {
      const mockStatusResponse = {
        score: 75,
        label: "on_track" as const,
        breakdown: {
          taskCompletionRate: 80,
          interactionFrequencyScore: 70,
          coachInterestScore: 65,
          academicStandingScore: 75,
        },
      };

      const mockPhaseResponse = {
        phase: "sophomore" as const,
        milestoneProgress: {
          required: ["m1"],
          completed: ["m1"],
          remaining: [],
          percentComplete: 100,
        },
      };

      vi.mocked(fetchAuth)
        .mockResolvedValueOnce(mockStatusResponse)
        .mockResolvedValueOnce(mockPhaseResponse);

      const { fetchStatusScore, fetchPhase, statusScore, currentPhase } =
        useRecruitingStatus();

      await fetchStatusScore();
      await fetchPhase();

      // Both should be set independently
      expect(statusScore.value).toBe(75);
      expect(currentPhase.value).toBe("sophomore");
    });
  });

  describe("Computed Properties - Status", () => {
    it("should compute status color", () => {
      const { statusLabel, statusColor } = useRecruitingStatus();

      statusLabel.value = "at_risk";

      expect(statusColor.value).toBeDefined();
    });

    it("should compute advice based on status label", () => {
      const { statusLabel, advice } = useRecruitingStatus();

      statusLabel.value = "on_track";

      expect(advice.value).toBeDefined();
    });

    it("should compute score description", () => {
      const { statusScore, scoreDescription } = useRecruitingStatus();

      statusScore.value = 80;
      expect(scoreDescription.value).toBe("Excellent");

      statusScore.value = 65;
      expect(scoreDescription.value).toBe("Good");

      statusScore.value = 55;
      expect(scoreDescription.value).toBe("Fair");

      statusScore.value = 45;
      expect(scoreDescription.value).toBe("Poor");

      statusScore.value = 30;
      expect(scoreDescription.value).toBe("Critical");
    });

    it("should compute detailed breakdown", () => {
      const { scoreBreakdown, detailedBreakdown } = useRecruitingStatus();

      scoreBreakdown.value = {
        taskCompletionRate: 80,
        interactionFrequencyScore: 75,
        coachInterestScore: 60,
        academicStandingScore: 65,
      };

      const breakdown = detailedBreakdown.value;

      expect(breakdown).toHaveLength(4);
      expect(breakdown[0].label).toBe("Task Completion");
      expect(breakdown[0].weight).toBe(35);
    });

    it("should compute weakest areas", () => {
      const { scoreBreakdown, weakestAreas } = useRecruitingStatus();

      scoreBreakdown.value = {
        taskCompletionRate: 50,
        interactionFrequencyScore: 40,
        coachInterestScore: 75,
        academicStandingScore: 80,
      };

      expect(weakestAreas.value).toContain("Interaction Frequency");
      expect(weakestAreas.value).toContain("Task Completion");
    });

    it("should compute strongest areas", () => {
      const { scoreBreakdown, strongestAreas } = useRecruitingStatus();

      scoreBreakdown.value = {
        taskCompletionRate: 80,
        interactionFrequencyScore: 85,
        coachInterestScore: 50,
        academicStandingScore: 40,
      };

      expect(strongestAreas.value).toContain("Interaction Frequency");
      expect(strongestAreas.value).toContain("Task Completion");
    });
  });

  describe("Computed Properties - Phase", () => {
    it("should determine if can advance", () => {
      const { milestoneProgress, canAdvance } = useRecruitingStatus();

      milestoneProgress.value = {
        required: ["m1"],
        completed: ["m1"],
        remaining: [],
        percentComplete: 100,
      };

      expect(canAdvance.value).toBe(true);

      milestoneProgress.value = {
        required: ["m1", "m2"],
        completed: ["m1"],
        remaining: ["m2"],
        percentComplete: 50,
      };

      expect(canAdvance.value).toBe(false);
    });

    it("should compute next phase", () => {
      const { currentPhase, nextPhase } = useRecruitingStatus();

      currentPhase.value = "freshman";
      expect(nextPhase.value).toBe("sophomore");

      currentPhase.value = "sophomore";
      expect(nextPhase.value).toBe("junior");
    });

    it("should compute remaining milestones", () => {
      const { milestoneProgress, remainingMilestones } = useRecruitingStatus();

      milestoneProgress.value = {
        required: ["m1", "m2", "m3"],
        completed: ["m1"],
        remaining: ["m2", "m3"],
        percentComplete: 33,
      };

      expect(remainingMilestones.value).toEqual(["m2", "m3"]);
    });

    it("should compute completion percentage", () => {
      const { milestoneProgress, completionPercentage } = useRecruitingStatus();

      milestoneProgress.value = {
        required: ["m1", "m2"],
        completed: ["m1"],
        remaining: ["m2"],
        percentComplete: 50,
      };

      expect(completionPercentage.value).toBe(50);
    });

    it("should compute progress label", () => {
      const { milestoneProgress, progressLabel } = useRecruitingStatus();

      milestoneProgress.value = {
        required: ["m1", "m2", "m3"],
        completed: ["m1", "m2"],
        remaining: ["m3"],
        percentComplete: 66,
      };

      expect(progressLabel.value).toBe("2/3 milestones complete");
    });
  });

  describe("Action Methods", () => {
    it("should get next actions based on status and phase", () => {
      const { statusLabel, currentPhase, getNextActions } =
        useRecruitingStatus();

      statusLabel.value = "on_track";
      currentPhase.value = "freshman";

      const actions = getNextActions();

      expect(Array.isArray(actions)).toBe(true);
    });
  });
});
