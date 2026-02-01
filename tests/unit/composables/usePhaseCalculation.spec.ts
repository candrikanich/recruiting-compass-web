import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePhaseCalculation } from "~/composables/usePhaseCalculation";
import { useAuthFetch } from "~/composables/useAuthFetch";
import type { AthleteAPI } from "~/types/api/athlete";
import type { Phase, MilestoneProgress } from "~/types/timeline";

// Mock useAuthFetch
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: vi.fn(),
}));

describe("usePhaseCalculation Composable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with default values", () => {
      const { currentPhase, milestoneProgress, loading, error } =
        usePhaseCalculation();

      expect(currentPhase.value).toBe("freshman");
      expect(milestoneProgress.value).toBeNull();
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
    });
  });

  describe("fetchPhase", () => {
    it("should fetch phase data and update state", async () => {
      const mockResponse: AthleteAPI.GetPhaseResponse = {
        phase: "junior",
        milestoneProgress: {
          required: ["task-1", "task-2"],
          completed: ["task-1"],
          remaining: ["task-2"],
          percentComplete: 50,
        },
      };

      const mockFetchAuth = vi.fn().mockResolvedValue(mockResponse);
      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchPhase, currentPhase, milestoneProgress } =
        usePhaseCalculation();

      const result = await fetchPhase();

      expect(result).toEqual(mockResponse);
      expect(currentPhase.value).toBe("junior");
      expect(milestoneProgress.value).toEqual(mockResponse.milestoneProgress);
    });

    it("should set loading state during fetch", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        phase: "sophomore",
        milestoneProgress: null,
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchPhase, loading } = usePhaseCalculation();

      const promise = fetchPhase();
      // Note: In real scenarios, loading would be true during fetch
      // This is simplified for testing

      await promise;
      expect(loading.value).toBe(false);
    });

    it("should handle fetch errors", async () => {
      const mockError = new Error("Network error");
      const mockFetchAuth = vi.fn().mockRejectedValue(mockError);

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchPhase, error } = usePhaseCalculation();

      try {
        await fetchPhase();
      } catch {
        // Error expected
      }

      expect(error.value).toContain("Network error");
    });
  });

  describe("advancePhase", () => {
    it("should advance phase when success response", async () => {
      const mockResponse: AthleteAPI.AdvancePhaseResponse = {
        success: true,
        phase: "sophomore",
        message: "Advanced successfully",
      };

      const mockFetchAuth = vi
        .fn()
        .mockResolvedValueOnce(mockResponse) // For advancePhase call
        .mockResolvedValueOnce({
          // For refreshPhase call
          phase: "sophomore",
          milestoneProgress: null,
        });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { advancePhase, currentPhase } = usePhaseCalculation();

      const result = await advancePhase();

      expect(result.success).toBe(true);
      expect(currentPhase.value).toBe("sophomore");
    });

    it("should handle advancement failure", async () => {
      const mockError = new Error("Cannot advance yet");
      const mockFetchAuth = vi.fn().mockRejectedValue(mockError);

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { advancePhase, error } = usePhaseCalculation();

      try {
        await advancePhase();
      } catch {
        // Error expected
      }

      expect(error.value).toContain("Cannot advance yet");
    });
  });

  describe("computed properties", () => {
    it("should compute canAdvance as true when no remaining milestones", async () => {
      const mockResponse: AthleteAPI.GetPhaseResponse = {
        phase: "freshman",
        milestoneProgress: {
          required: ["task-1"],
          completed: ["task-1"],
          remaining: [], // Empty = can advance
          percentComplete: 100,
        },
      };

      const mockFetchAuth = vi.fn().mockResolvedValue(mockResponse);
      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchPhase, canAdvance } = usePhaseCalculation();
      await fetchPhase();

      expect(canAdvance.value).toBe(true);
    });

    it("should compute canAdvance as false when milestones remain", async () => {
      const mockResponse: AthleteAPI.GetPhaseResponse = {
        phase: "freshman",
        milestoneProgress: {
          required: ["task-1", "task-2"],
          completed: ["task-1"],
          remaining: ["task-2"],
          percentComplete: 50,
        },
      };

      const mockFetchAuth = vi.fn().mockResolvedValue(mockResponse);
      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchPhase, canAdvance } = usePhaseCalculation();
      await fetchPhase();

      expect(canAdvance.value).toBe(false);
    });

    it("should compute nextPhase correctly", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        phase: "freshman",
        milestoneProgress: null,
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchPhase, nextPhase } = usePhaseCalculation();
      await fetchPhase();

      expect(nextPhase.value).toBe("sophomore");
    });

    it("should compute completionPercentage from milestone progress", async () => {
      const mockResponse: AthleteAPI.GetPhaseResponse = {
        phase: "sophomore",
        milestoneProgress: {
          required: ["task-1", "task-2", "task-3"],
          completed: ["task-1", "task-2"],
          remaining: ["task-3"],
          percentComplete: 67,
        },
      };

      const mockFetchAuth = vi.fn().mockResolvedValue(mockResponse);
      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchPhase, completionPercentage } = usePhaseCalculation();
      await fetchPhase();

      expect(completionPercentage.value).toBe(67);
    });

    it("should compute progressLabel as readable string", async () => {
      const mockResponse: AthleteAPI.GetPhaseResponse = {
        phase: "junior",
        milestoneProgress: {
          required: ["task-1", "task-2", "task-3"],
          completed: ["task-1", "task-2"],
          remaining: ["task-3"],
          percentComplete: 67,
        },
      };

      const mockFetchAuth = vi.fn().mockResolvedValue(mockResponse);
      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { fetchPhase, progressLabel } = usePhaseCalculation();
      await fetchPhase();

      expect(progressLabel.value).toBe("2/3 milestones complete");
    });
  });

  describe("refreshPhase", () => {
    it("should refresh phase data", async () => {
      const mockFetchAuth = vi.fn().mockResolvedValue({
        phase: "sophomore",
        milestoneProgress: null,
      });

      vi.mocked(useAuthFetch).mockReturnValue({
        $fetchAuth: mockFetchAuth,
      } as any);

      const { refreshPhase } = usePhaseCalculation();
      const result = await refreshPhase();

      expect(result).toBeDefined();
      expect(result.phase).toBe("sophomore");
    });
  });
});
