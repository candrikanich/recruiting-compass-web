import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSuggestions } from "~/composables/useSuggestions";
import type { Suggestion } from "~/types/timeline";

const { mockFetchAuth } = vi.hoisted(() => ({
  mockFetchAuth: vi.fn(),
}));

// Mock useAuthFetch composable
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({
    $fetchAuth: mockFetchAuth,
  }),
}));

describe("useSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchSuggestions", () => {
    it("should fetch suggestions for dashboard location", async () => {
      const mockSuggestions: Suggestion[] = [
        {
          id: "sug-1",
          athlete_id: "athlete-1",
          rule_type: "missing-video",
          urgency: "medium",
          message: "Add a video",
          action_type: "add_video",
          related_school_id: null,
          related_task_id: null,
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
          pending_surface: false,
          surfaced_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockFetchAuth.mockResolvedValue({
        suggestions: mockSuggestions,
        pendingCount: 5,
      });

      const { suggestions, loading, fetchSuggestions } = useSuggestions();

      expect(loading.value).toBe(false);
      expect(suggestions.value).toEqual([]);

      await fetchSuggestions("dashboard");

      expect(suggestions.value).toEqual(mockSuggestions);
      expect(mockFetchAuth).toHaveBeenCalledWith(
        expect.stringContaining("/api/suggestions?location=dashboard"),
      );
    });

    it("should fetch suggestions for school_detail location with schoolId", async () => {
      const mockSuggestions: Suggestion[] = [];

      mockFetchAuth.mockResolvedValue({
        suggestions: mockSuggestions,
        pendingCount: 0,
      });

      const { fetchSuggestions } = useSuggestions();

      await fetchSuggestions("school_detail", "school-123");

      expect(mockFetchAuth).toHaveBeenCalledWith(
        expect.stringContaining("schoolId=school-123"),
      );
    });

    it("should update error state on fetch failure", async () => {
      const error = new Error("Network error");
      mockFetchAuth.mockRejectedValue(error);

      const { error: errorState, fetchSuggestions } = useSuggestions();

      await fetchSuggestions("dashboard");

      expect(errorState.value).toBe("Network error");
    });

    it("should set loading state during fetch", async () => {
      let resolveFunc: () => void = () => {};
      mockFetchAuth.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFunc = () => resolve({ suggestions: [], pendingCount: 0 });
          }),
      );

      const { loading, fetchSuggestions } = useSuggestions();

      const fetchPromise = fetchSuggestions("dashboard");
      expect(loading.value).toBe(true);

      resolveFunc();
      await fetchPromise;

      expect(loading.value).toBe(false);
    });

    it("should update pendingCount from response", async () => {
      mockFetchAuth.mockResolvedValue({
        suggestions: [],
        pendingCount: 10,
      });

      const { pendingCount, fetchSuggestions } = useSuggestions();

      await fetchSuggestions("dashboard");

      expect(pendingCount.value).toBe(10);
    });
  });

  describe("dismissSuggestion", () => {
    it("should dismiss suggestion and remove from list", async () => {
      const suggestion: Suggestion = {
        id: "sug-1",
        athlete_id: "athlete-1",
        rule_type: "missing-video",
        urgency: "medium",
        message: "Add a video",
        action_type: "add_video",
        related_school_id: null,
        related_task_id: null,
        dismissed: false,
        dismissed_at: null,
        completed: false,
        completed_at: null,
        pending_surface: false,
        surfaced_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockFetchAuth.mockResolvedValue({});

      const { suggestions, dismissSuggestion } = useSuggestions();
      suggestions.value = [suggestion];

      await dismissSuggestion("sug-1");

      expect(suggestions.value).toEqual([]);
      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/suggestions/sug-1/dismiss",
        { method: "PATCH" },
      );
    });

    it("should set error state on dismiss failure", async () => {
      const error = new Error("Dismiss failed");
      mockFetchAuth.mockRejectedValue(error);

      const { error: errorState, dismissSuggestion } = useSuggestions();

      await dismissSuggestion("sug-1");

      expect(errorState.value).toContain("Dismiss failed");
    });
  });

  describe("completeSuggestion", () => {
    it("should mark suggestion as complete and remove from list", async () => {
      const suggestion: Suggestion = {
        id: "sug-1",
        athlete_id: "athlete-1",
        rule_type: "missing-video",
        urgency: "medium",
        message: "Add a video",
        action_type: "add_video",
        related_school_id: null,
        related_task_id: null,
        dismissed: false,
        dismissed_at: null,
        completed: false,
        completed_at: null,
        pending_surface: false,
        surfaced_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockFetchAuth.mockResolvedValue({});

      const { suggestions, completeSuggestion } = useSuggestions();
      suggestions.value = [suggestion];

      await completeSuggestion("sug-1");

      expect(suggestions.value).toEqual([]);
      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/suggestions/sug-1/complete",
        { method: "PATCH" },
      );
    });
  });

  describe("surfaceMoreSuggestions", () => {
    it("should surface more and refetch", async () => {
      mockFetchAuth.mockResolvedValue({
        suggestions: [],
        pendingCount: 0,
      });

      const { surfaceMoreSuggestions } = useSuggestions();

      await surfaceMoreSuggestions();

      expect(mockFetchAuth).toHaveBeenCalledWith("/api/suggestions/surface", {
        method: "POST",
      });

      // Should call fetch again
      expect(mockFetchAuth.mock.calls.length).toBeGreaterThan(1);
    });
  });

  describe("computed properties", () => {
    it("should return first 3 suggestions for dashboard", () => {
      const { suggestions, dashboardSuggestions } = useSuggestions();

      const mockSuggestions = Array(5)
        .fill(null)
        .map((_, i) => ({
          id: `sug-${i}`,
          athlete_id: "athlete-1",
          rule_type: "test",
          urgency: "medium" as const,
          message: "Test",
          action_type: "log_interaction",
          related_school_id: null,
          related_task_id: null,
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
          pending_surface: false,
          surfaced_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

      suggestions.value = mockSuggestions;

      expect(dashboardSuggestions.value.length).toBe(3);
      expect(dashboardSuggestions.value[0].id).toBe("sug-0");
      expect(dashboardSuggestions.value[2].id).toBe("sug-2");
    });

    it("should filter high urgency suggestions", () => {
      const { suggestions, highUrgencySuggestions } = useSuggestions();

      const mockSuggestions: Suggestion[] = [
        {
          id: "sug-1",
          athlete_id: "athlete-1",
          rule_type: "test",
          urgency: "high",
          message: "Test",
          action_type: "log_interaction",
          related_school_id: null,
          related_task_id: null,
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
          pending_surface: false,
          surfaced_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "sug-2",
          athlete_id: "athlete-1",
          rule_type: "test",
          urgency: "medium",
          message: "Test",
          action_type: "log_interaction",
          related_school_id: null,
          related_task_id: null,
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
          pending_surface: false,
          surfaced_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      suggestions.value = mockSuggestions;

      expect(highUrgencySuggestions.value.length).toBe(1);
      expect(highUrgencySuggestions.value[0].urgency).toBe("high");
    });

    it("should calculate moreCount correctly", () => {
      const { pendingCount, moreCount, suggestions } = useSuggestions();

      pendingCount.value = 10;
      suggestions.value = Array(3)
        .fill(null)
        .map((_, i) => ({
          id: `sug-${i}`,
          athlete_id: "athlete-1",
          rule_type: "test",
          urgency: "medium" as const,
          message: "Test",
          action_type: "log_interaction",
          related_school_id: null,
          related_task_id: null,
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
          pending_surface: false,
          surfaced_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

      expect(moreCount.value).toBe(7); // 10 - 3
    });

    it("should never return negative moreCount", () => {
      const { pendingCount, moreCount, suggestions } = useSuggestions();

      pendingCount.value = 2;
      suggestions.value = Array(5)
        .fill(null)
        .map((_, i) => ({
          id: `sug-${i}`,
          athlete_id: "athlete-1",
          rule_type: "test",
          urgency: "medium" as const,
          message: "Test",
          action_type: "log_interaction",
          related_school_id: null,
          related_task_id: null,
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
          pending_surface: false,
          surfaced_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

      expect(moreCount.value).toBe(0);
    });
  });
});
