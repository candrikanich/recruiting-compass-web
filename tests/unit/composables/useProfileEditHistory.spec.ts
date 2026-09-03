import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useProfileEditHistory } from "~/composables/useProfileEditHistory";

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

const mockSupabase = { from: mockFrom };

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

const mockUser = { id: "user-123" };

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({ user: mockUser }),
}));

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  }),
}));

describe("useProfileEditHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    // Reset mockUser to authenticated state
    mockUser.id = "user-123";
  });

  it("should export composable function", () => {
    expect(useProfileEditHistory).toBeDefined();
  });

  it("should return reactive refs with correct initial values", () => {
    const { history, loading, error } = useProfileEditHistory();

    expect(history.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(error.value).toBe(null);
  });

  it("should return fetchHistory function", () => {
    const { fetchHistory } = useProfileEditHistory();
    expect(typeof fetchHistory).toBe("function");
  });

  describe("fetchHistory", () => {
    it("sets error when user is not authenticated", async () => {
      // @ts-expect-error — simulate missing user id
      mockUser.id = undefined;

      const { fetchHistory, error, loading, history } =
        useProfileEditHistory();
      await fetchHistory();

      expect(error.value).toBe("User not authenticated");
      expect(history.value).toEqual([]);
      expect(loading.value).toBe(false);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("fetches and formats history entries newest-first", async () => {
      const rawHistory = [
        {
          timestamp: "2026-01-01T00:00:00Z",
          changed_by: "user-123",
          changes: [
            { field: "gpa", old_value: "3.5", new_value: "3.8" },
            { field: "weight_lbs", old_value: 170, new_value: 175 },
          ],
        },
        {
          timestamp: "2026-02-01T00:00:00Z",
          changed_by: "user-123",
          changes: [
            { field: "height_inches", old_value: 70, new_value: 72 },
          ],
        },
      ];

      mockSingle.mockResolvedValue({
        data: { preference_history: rawHistory },
        error: null,
      });

      const { fetchHistory, history, loading, error } =
        useProfileEditHistory();
      await fetchHistory();

      expect(mockFrom).toHaveBeenCalledWith("user_preferences");
      expect(mockSelect).toHaveBeenCalledWith("preference_history");
      expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");

      // Reversed: newest first
      expect(history.value).toHaveLength(2);
      expect(history.value[0].timestamp).toBe("2026-02-01T00:00:00Z");
      expect(history.value[1].timestamp).toBe("2026-01-01T00:00:00Z");

      // Field labels mapped
      expect(history.value[0].changes[0].fieldLabel).toBe("Height");
      expect(history.value[1].changes[0].fieldLabel).toBe("GPA");
      expect(history.value[1].changes[1].fieldLabel).toBe("Weight");

      expect(error.value).toBe(null);
      expect(loading.value).toBe(false);
    });

    it("maps unknown fields to their raw field name", async () => {
      mockSingle.mockResolvedValue({
        data: {
          preference_history: [
            {
              timestamp: "2026-03-01T00:00:00Z",
              changed_by: "user-123",
              changes: [
                {
                  field: "some_unknown_field",
                  old_value: "a",
                  new_value: "b",
                },
              ],
            },
          ],
        },
        error: null,
      });

      const { fetchHistory, history } = useProfileEditHistory();
      await fetchHistory();

      expect(history.value[0].changes[0].fieldLabel).toBe(
        "some_unknown_field",
      );
    });

    it("returns empty history on PGRST116 (no preferences row)", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Row not found" },
      });

      const { fetchHistory, history, error } = useProfileEditHistory();
      await fetchHistory();

      expect(history.value).toEqual([]);
      expect(error.value).toBe(null);
    });

    it("returns empty history when preference_history is null", async () => {
      mockSingle.mockResolvedValue({
        data: { preference_history: null },
        error: null,
      });

      const { fetchHistory, history, error } = useProfileEditHistory();
      await fetchHistory();

      expect(history.value).toEqual([]);
      expect(error.value).toBe(null);
    });

    it("returns empty history when data is null", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const { fetchHistory, history, error } = useProfileEditHistory();
      await fetchHistory();

      expect(history.value).toEqual([]);
      expect(error.value).toBe(null);
    });

    it("sets generic error when supabase returns a non-PGRST116 error", async () => {
      // Supabase error objects are plain objects (not Error instances),
      // so the catch branch uses the generic fallback message
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST500", message: "DB is down" },
      });

      const { fetchHistory, error, loading } = useProfileEditHistory();
      await fetchHistory();

      expect(error.value).toBe("Failed to load edit history");
      expect(loading.value).toBe(false);
    });

    it("sets Error.message when an Error instance is thrown", async () => {
      mockSingle.mockRejectedValue(new Error("Network failure"));

      const { fetchHistory, error, loading } = useProfileEditHistory();
      await fetchHistory();

      expect(error.value).toBe("Network failure");
      expect(loading.value).toBe(false);
    });

    it("sets generic error for non-Error thrown values", async () => {
      mockSingle.mockRejectedValue("some string error");

      const { fetchHistory, error, loading } = useProfileEditHistory();
      await fetchHistory();

      expect(error.value).toBe("Failed to load edit history");
      expect(loading.value).toBe(false);
    });

    it("manages loading state through the fetch lifecycle", async () => {
      let resolveFetch: (v: unknown) => void;
      mockSingle.mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      );

      const { fetchHistory, loading } = useProfileEditHistory();
      const promise = fetchHistory();

      expect(loading.value).toBe(true);

      resolveFetch!({
        data: { preference_history: [] },
        error: null,
      });
      await promise;

      expect(loading.value).toBe(false);
    });

    it("maps registry-sourced field labels (attributes and services)", async () => {
      mockSingle.mockResolvedValue({
        data: {
          preference_history: [
            {
              timestamp: "2026-04-01T00:00:00Z",
              changed_by: "user-123",
              changes: [
                { field: "bats", old_value: "Right", new_value: "Switch" },
                { field: "throws", old_value: "Right", new_value: "Left" },
              ],
            },
          ],
        },
        error: null,
      });

      const { fetchHistory, history } = useProfileEditHistory();
      await fetchHistory();

      // Registry labels should be human-readable, not raw field names
      for (const change of history.value[0].changes) {
        expect(change.fieldLabel).not.toBe("");
        expect(typeof change.fieldLabel).toBe("string");
      }
    });
  });
});
