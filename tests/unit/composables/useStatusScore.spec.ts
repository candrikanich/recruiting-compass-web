import { describe, it, expect, beforeEach, vi } from "vitest";
import { useStatusScore } from "~/composables/useStatusScore";
import { useAuthFetch } from "~/composables/useAuthFetch";
import type { AthleteAPI } from "~/types/api/athlete";

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: vi.fn(),
}));

describe("useStatusScore Composable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with default values", () => {
      const {
        statusScore,
        statusLabel,
        scoreBreakdown,
        loading,
        error,
        lastCalculated,
      } = useStatusScore();

      expect(statusScore.value).toBe(0);
      expect(statusLabel.value).toBe("on_track");
      expect(scoreBreakdown.value).toEqual({
        taskCompletionRate: 0,
        interactionFrequencyScore: 0,
        coachInterestScore: 0,
        academicStandingScore: 0,
      });
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
      expect(lastCalculated.value).toBeNull();
    });

    it("should return all expected methods and computed properties", () => {
      const composable = useStatusScore();

      expect(composable.fetchStatusScore).toBeDefined();
      expect(composable.recalculateStatus).toBeDefined();
      expect(composable.getNextActions).toBeDefined();
      expect(composable.statusColor).toBeDefined();
      expect(composable.advice).toBeDefined();
      expect(composable.scoreDescription).toBeDefined();
      expect(composable.detailedBreakdown).toBeDefined();
      expect(composable.weakestAreas).toBeDefined();
      expect(composable.strongestAreas).toBeDefined();
    });
  });

  describe("fetchStatusScore", () => {
    it("should fetch and update status score successfully", async () => {
      const mockResponse = {
        score: 72,
        label: "slightly_behind" as const,
        breakdown: {
          taskCompletionRate: 75,
          interactionFrequencyScore: 60,
          coachInterestScore: 70,
          academicStandingScore: 80,
        },
      };

      const mockFetchAuth = vi.fn().mockResolvedValue(mockResponse);
      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, statusScore, statusLabel } = useStatusScore();

      const result = await fetchStatusScore();

      // Result is transformed to API format with status_score/status_label
      expect(result.status_score).toBe(72);
      expect(result.status_label).toBe("slightly_behind");
      expect(statusScore.value).toBe(72);
      expect(statusLabel.value).toBe("slightly_behind");
    });

    it("should update score breakdown on fetch", async () => {
      const mockResponse = {
        score: 75,
        label: "on_track" as const,
        breakdown: {
          taskCompletionRate: 80,
          interactionFrequencyScore: 70,
          coachInterestScore: 75,
          academicStandingScore: 70,
        },
      };

      const mockFetchAuth = vi.fn().mockResolvedValue(mockResponse);
      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, scoreBreakdown } = useStatusScore();

      await fetchStatusScore();

      expect(scoreBreakdown.value).toEqual({
        taskCompletionRate: 80,
        interactionFrequencyScore: 70,
        coachInterestScore: 75,
        academicStandingScore: 70,
      });
    });

    it("should set loading state during fetch", async () => {
      const mockFetchAuth = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  status_score: 72,
                  status_label: "slightly_behind",
                }),
              10
            )
          )
      );

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, loading } = useStatusScore();

      const promise = fetchStatusScore();
      await promise;

      expect(loading.value).toBe(false);
    });

    it("should update lastCalculated timestamp", async () => {
      const mockFetchAuth = vi
        .fn()
        .mockResolvedValue({
          status_score: 72,
          status_label: "slightly_behind",
        });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, lastCalculated } = useStatusScore();

      await fetchStatusScore();

      expect(lastCalculated.value).not.toBeNull();
      expect(typeof lastCalculated.value).toBe("string");
    });

    it("should handle fetch errors", async () => {
      const mockError = new Error("Failed to fetch status score");
      const mockFetchAuth = vi.fn().mockRejectedValue(mockError);

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, error, loading } = useStatusScore();

      try {
        await fetchStatusScore();
      } catch {
        // Error expected
      }

      expect(error.value).toContain("Failed to fetch status score");
      expect(loading.value).toBe(false);
    });

    it("should handle null response gracefully", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue(null);

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, statusScore, statusLabel } = useStatusScore();

      await fetchStatusScore();

      expect(statusScore.value).toBe(0);
      expect(statusLabel.value).toBe("on_track");
    });
  });

  describe("recalculateStatus", () => {
    it("should recalculate status successfully", async () => {
      const mockResponse = {
        score: 82,
        label: "on_track" as const,
        breakdown: {
          taskCompletionRate: 85,
          interactionFrequencyScore: 80,
          coachInterestScore: 80,
          academicStandingScore: 85,
        },
      };

      const mockFetchAuth = vi.fn().mockResolvedValue(mockResponse);
      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { recalculateStatus, statusScore } = useStatusScore();

      const result = await recalculateStatus();

      expect(result.status_score).toBe(82);
      expect(result.status_label).toBe("on_track");
      expect(statusScore.value).toBe(82);
    });

    it("should call POST endpoint with correct URL", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        score: 72,
        label: "slightly_behind",
        breakdown: {
          taskCompletionRate: 0,
          interactionFrequencyScore: 0,
          coachInterestScore: 0,
          academicStandingScore: 0,
        },
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { recalculateStatus } = useStatusScore();

      await recalculateStatus();

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/athlete/status/recalculate",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should handle recalculation errors", async () => {
      const mockError = new Error("Failed to recalculate status");
      const mockFetchAuth = vi.fn().mockRejectedValue(mockError);

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { recalculateStatus, error } = useStatusScore();

      try {
        await recalculateStatus();
      } catch {
        // Error expected
      }

      expect(error.value).toContain("Failed to recalculate status");
    });
  });

  describe("statusColor computed property", () => {
    it("should return green for on_track", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        score: 75,
        label: "on_track",
        breakdown: {
          taskCompletionRate: 0,
          interactionFrequencyScore: 0,
          coachInterestScore: 0,
          academicStandingScore: 0,
        },
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, statusColor } = useStatusScore();

      await fetchStatusScore();

      expect(statusColor.value).toBe("green");
    });

    it("should return yellow for slightly_behind", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        score: 60,
        label: "slightly_behind",
        breakdown: {
          taskCompletionRate: 0,
          interactionFrequencyScore: 0,
          coachInterestScore: 0,
          academicStandingScore: 0,
        },
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, statusColor } = useStatusScore();

      await fetchStatusScore();

      expect(statusColor.value).toBe("yellow");
    });

    it("should return red for at_risk", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        score: 30,
        label: "at_risk",
        breakdown: {
          taskCompletionRate: 0,
          interactionFrequencyScore: 0,
          coachInterestScore: 0,
          academicStandingScore: 0,
        },
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, statusColor } = useStatusScore();

      await fetchStatusScore();

      expect(statusColor.value).toBe("red");
    });
  });

  describe("advice computed property", () => {
    it("should return on_track advice", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        score: 75,
        label: "on_track",
        breakdown: {
          taskCompletionRate: 0,
          interactionFrequencyScore: 0,
          coachInterestScore: 0,
          academicStandingScore: 0,
        },
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, advice } = useStatusScore();

      await fetchStatusScore();

      expect(advice.value).toContain("momentum");
    });

    it("should return slightly_behind advice", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        score: 60,
        label: "slightly_behind",
        breakdown: {
          taskCompletionRate: 0,
          interactionFrequencyScore: 0,
          coachInterestScore: 0,
          academicStandingScore: 0,
        },
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, advice } = useStatusScore();

      await fetchStatusScore();

      expect(advice.value).toContain("behind");
    });

    it("should return at_risk advice", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        score: 30,
        label: "at_risk",
        breakdown: {
          taskCompletionRate: 0,
          interactionFrequencyScore: 0,
          coachInterestScore: 0,
          academicStandingScore: 0,
        },
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, advice } = useStatusScore();

      await fetchStatusScore();

      expect(advice.value).toContain("at risk");
    });
  });

  describe("scoreDescription computed property", () => {
    it("should return Excellent for score >= 75", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        score: 80,
        label: "on_track",
        breakdown: {
          taskCompletionRate: 80,
          interactionFrequencyScore: 80,
          coachInterestScore: 80,
          academicStandingScore: 80,
        },
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, scoreDescription } = useStatusScore();

      await fetchStatusScore();

      expect(scoreDescription.value).toBe("Excellent");
    });

    it("should return Good for score 60-74", () => {
      const { statusScore, scoreDescription } = useStatusScore();

      statusScore.value = 65;

      expect(scoreDescription.value).toBe("Good");
    });

    it("should return Fair for score 50-59", () => {
      const { statusScore, scoreDescription } = useStatusScore();

      statusScore.value = 55;

      expect(scoreDescription.value).toBe("Fair");
    });

    it("should return Poor for score 40-49", () => {
      const { statusScore, scoreDescription } = useStatusScore();

      statusScore.value = 45;

      expect(scoreDescription.value).toBe("Poor");
    });

    it("should return Critical for score < 40", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        status_score: 25,
        status_label: "at_risk",
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, scoreDescription } = useStatusScore();

      await fetchStatusScore();

      expect(scoreDescription.value).toBe("Critical");
    });
  });

  describe("detailedBreakdown computed property", () => {
    it("should return array with 4 items", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        score: 72,
        label: "slightly_behind",
        breakdown: {
          taskCompletionRate: 75,
          interactionFrequencyScore: 60,
          coachInterestScore: 70,
          academicStandingScore: 80,
        },
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, detailedBreakdown } = useStatusScore();

      await fetchStatusScore();

      expect(detailedBreakdown.value).toHaveLength(4);
    });

    it("should include correct labels", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        score: 72,
        label: "slightly_behind",
        breakdown: {
          taskCompletionRate: 75,
          interactionFrequencyScore: 60,
          coachInterestScore: 70,
          academicStandingScore: 80,
        },
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, detailedBreakdown } = useStatusScore();

      await fetchStatusScore();

      const labels = detailedBreakdown.value.map((item) => item.label);

      expect(labels).toContain("Task Completion");
      expect(labels).toContain("Interaction Frequency");
      expect(labels).toContain("Coach Interest");
      expect(labels).toContain("Academic Standing");
    });

    it("should include correct weights", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        score: 72,
        label: "slightly_behind",
        breakdown: {
          taskCompletionRate: 75,
          interactionFrequencyScore: 60,
          coachInterestScore: 70,
          academicStandingScore: 80,
        },
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, detailedBreakdown } = useStatusScore();

      await fetchStatusScore();

      expect(detailedBreakdown.value[0].weight).toBe(35); // Task Completion
      expect(detailedBreakdown.value[1].weight).toBe(25); // Interaction Frequency
      expect(detailedBreakdown.value[2].weight).toBe(25); // Coach Interest
      expect(detailedBreakdown.value[3].weight).toBe(15); // Academic Standing
    });

    it("should mark scores >= 70 as good for task and interaction, >= 60 for coach interest and academic", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        score: 72,
        label: "slightly_behind",
        breakdown: {
          taskCompletionRate: 75,
          interactionFrequencyScore: 70,
          coachInterestScore: 60,
          academicStandingScore: 60,
        },
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, detailedBreakdown } = useStatusScore();

      await fetchStatusScore();

      expect(detailedBreakdown.value[0].status).toBe("good"); // 75 >= 70
      expect(detailedBreakdown.value[1].status).toBe("good"); // 70 >= 70
      expect(detailedBreakdown.value[2].status).toBe("good"); // 60 >= 60
      expect(detailedBreakdown.value[3].status).toBe("good"); // 60 >= 60
    });
  });

  describe("weakestAreas computed property", () => {
    it("should identify bottom 2 areas", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        status_score: 50,
        status_label: "slightly_behind",
        taskCompletionRate: 30,
        interactionFrequencyScore: 40,
        coachInterestScore: 70,
        academicStandingScore: 75,
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, weakestAreas } = useStatusScore();

      await fetchStatusScore();

      expect(weakestAreas.value).toHaveLength(2);
      expect(weakestAreas.value).toContain("Task Completion");
      expect(weakestAreas.value).toContain("Interaction Frequency");
    });

    it("should return only bottom 2 weak areas even if more exist", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        score: 60,
        label: "slightly_behind",
        breakdown: {
          taskCompletionRate: 30,
          interactionFrequencyScore: 40,
          coachInterestScore: 50,
          academicStandingScore: 55,
        },
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, weakestAreas } = useStatusScore();

      await fetchStatusScore();

      // All 4 are weak, but only top 2 weakest should be returned
      expect(weakestAreas.value).toHaveLength(2);
    });
  });

  describe("strongestAreas computed property", () => {
    it("should identify top 2 strong areas when multiple good areas exist", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        score: 75,
        label: "on_track",
        breakdown: {
          taskCompletionRate: 90,
          interactionFrequencyScore: 85,
          coachInterestScore: 70,
          academicStandingScore: 65,
        },
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, strongestAreas } = useStatusScore();

      await fetchStatusScore();

      expect(strongestAreas.value).toHaveLength(2);
      expect(strongestAreas.value).toContain("Task Completion");
      expect(strongestAreas.value).toContain("Interaction Frequency");
    });

    it("should return empty array when no strong areas", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        status_score: 30,
        status_label: "at_risk",
        taskCompletionRate: 20,
        interactionFrequencyScore: 25,
        coachInterestScore: 30,
        academicStandingScore: 35,
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchStatusScore, strongestAreas } = useStatusScore();

      await fetchStatusScore();

      expect(strongestAreas.value).toHaveLength(0);
    });
  });

  describe("getNextActions method", () => {
    it("should return next actions for given phase", async () => {
      const { getNextActions } = useStatusScore();

      const actions = getNextActions("junior");

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
    });

    it("should return different actions for different phases", () => {
      const { getNextActions } = useStatusScore();

      const freshmanActions = getNextActions("freshman");
      const juniorActions = getNextActions("junior");

      expect(freshmanActions).not.toEqual(juniorActions);
    });

    it("should return actions for all phases", () => {
      const { getNextActions } = useStatusScore();
      const phases = ["freshman", "sophomore", "junior", "senior", "committed"] as const;

      phases.forEach((phase) => {
        const actions = getNextActions(phase);

        expect(Array.isArray(actions)).toBe(true);
        expect(actions.length).toBeGreaterThan(0);
      });
    });
  });
});
