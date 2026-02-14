import { describe, it, expect, vi, beforeEach } from "vitest";
import { useFitScoreRecalculation } from "~/composables/useFitScoreRecalculation";

// Mock useSupabase composable
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: "mock-token-123",
            user: { id: "user-123" },
          },
        },
        error: null,
      }),
    },
  }),
}));

// Mock $fetch (Nuxt's fetch utility)
const mockFetch = vi.fn(async (url: string, options?: any) => {
  if (url === "/api/athlete/fit-scores/recalculate-all") {
    if (options?.method === "POST") {
      return {
        success: true,
        updated: 5,
        failed: 0,
        message: "Updated fit scores for 5 schools",
      };
    }
  }
  throw new Error("Not found");
});

vi.stubGlobal("$fetch", mockFetch);

// Mock the native fetch function
vi.stubGlobal(
  "fetch",
  vi.fn(async (url: string, options?: RequestInit) => {
    if (url === "/api/athlete/fit-scores/recalculate-all") {
      if (options?.method === "POST") {
        return new Response(
          JSON.stringify({
            success: true,
            updated: 5,
            failed: 0,
            message: "Updated fit scores for 5 schools",
          }),
          { status: 200, statusText: "OK" },
        );
      }
    }
    return new Response(null, { status: 404, statusText: "Not Found" });
  }),
);

describe("useFitScoreRecalculation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset $fetch mock to default behavior
    mockFetch.mockImplementation(async (url: string, options?: any) => {
      if (url === "/api/athlete/fit-scores/recalculate-all") {
        if (options?.method === "POST") {
          return {
            success: true,
            updated: 5,
            failed: 0,
            message: "Updated fit scores for 5 schools",
          };
        }
      }
      throw new Error("Not found");
    });
  });

  it("should initialize with loading false and no error", () => {
    const { loading, error } = useFitScoreRecalculation();
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it("should call API endpoint on recalculateAllFitScores", async () => {
    const { recalculateAllFitScores } = useFitScoreRecalculation();
    const fetchSpy = vi.mocked(global.$fetch as any);

    await recalculateAllFitScores();

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/athlete/fit-scores/recalculate-all",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer mock-token-123",
        },
      },
    );
  });

  it("should set loading state during recalculation", async () => {
    const { recalculateAllFitScores, loading } = useFitScoreRecalculation();

    const promise = recalculateAllFitScores();
    expect(loading.value).toBe(true);

    await promise;
    expect(loading.value).toBe(false);
  });

  it("should return successful response", async () => {
    const { recalculateAllFitScores } = useFitScoreRecalculation();

    const response = await recalculateAllFitScores();

    expect(response.success).toBe(true);
    expect(response.updated).toBe(5);
    expect(response.failed).toBe(0);
    expect(response.message).toBe("Updated fit scores for 5 schools");
  });

  it("should handle API errors gracefully", async () => {
    const { recalculateAllFitScores, error } = useFitScoreRecalculation();

    const fetchSpy = vi.mocked(global.$fetch as any);
    fetchSpy.mockRejectedValueOnce(new Error("Network error"));

    try {
      await recalculateAllFitScores();
    } catch (err) {
      // Error message is set from the thrown error
      expect(error.value).toBeTruthy();
    }
  });

  it("should set error state on failure", async () => {
    const { recalculateAllFitScores, error } = useFitScoreRecalculation();

    const fetchSpy = vi.mocked(global.$fetch as any);
    fetchSpy.mockRejectedValueOnce(new Error("API Error"));

    try {
      await recalculateAllFitScores();
    } catch {
      expect(error.value).toBeTruthy();
    }
  });

  it("should handle unsuccessful response from API", async () => {
    const { recalculateAllFitScores, error } = useFitScoreRecalculation();

    const fetchSpy = vi.mocked(global.$fetch as any);
    fetchSpy.mockResolvedValueOnce({
      success: false,
      message: "Recalculation failed",
    });

    try {
      await recalculateAllFitScores();
    } catch (err) {
      expect(error.value).toContain("Recalculation failed");
    }
  });

  it("should clear error on successful recalculation", async () => {
    const { recalculateAllFitScores, error } = useFitScoreRecalculation();

    const fetchSpy = vi.mocked(global.$fetch as any);

    // Trigger error first
    fetchSpy.mockRejectedValueOnce(new Error("Network error"));
    try {
      await recalculateAllFitScores();
    } catch {
      // Expected
    }

    expect(error.value).toBeTruthy();

    // Reset mock and succeed
    fetchSpy.mockResolvedValueOnce({
      success: true,
      updated: 5,
      failed: 0,
      message: "Updated fit scores for 5 schools",
    });

    await recalculateAllFitScores();

    expect(error.value).toBeNull();
  });

  it("should handle missing success field in response", async () => {
    const { recalculateAllFitScores, error } = useFitScoreRecalculation();

    const fetchSpy = vi.mocked(global.$fetch as any);
    fetchSpy.mockResolvedValueOnce({
      message: "Recalculation failed",
    });

    try {
      await recalculateAllFitScores();
    } catch (err) {
      expect(error.value).toContain("Recalculation failed");
    }
  });
});
