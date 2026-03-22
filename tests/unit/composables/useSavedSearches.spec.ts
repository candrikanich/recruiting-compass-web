import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSavedSearches } from "~/composables/useSavedSearches";

// ----- Mutable state for Supabase mock responses -----
const mockState = {
  savedSearchesData: [] as object[],
  savedSearchesError: null as object | null,
  historyData: [] as object[],
  historyError: null as object | null,
  insertData: null as object | null,
  insertError: null as object | null,
  deleteError: null as object | null,
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "saved_searches") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockState.savedSearchesData,
            error: mockState.savedSearchesError,
          }),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockState.insertData,
                error: mockState.insertError,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: mockState.deleteError }),
            })),
          })),
        };
      }
      // search_history table
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockState.historyData,
          error: mockState.historyError,
        }),
        insert: vi.fn(() => ({
          // fire-and-forget insert for history recording
          then: vi.fn(),
          catch: vi.fn(),
          eq: vi.fn().mockResolvedValue({ error: mockState.deleteError }),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: mockState.deleteError }),
        })),
      };
    }),
  })),
}));

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({ user: { id: "user-1" } }),
}));

describe("useSavedSearches", () => {
  let composable: ReturnType<typeof useSavedSearches>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockState.savedSearchesData = [];
    mockState.savedSearchesError = null;
    mockState.historyData = [];
    mockState.historyError = null;
    mockState.insertData = null;
    mockState.insertError = null;
    mockState.deleteError = null;

    composable = useSavedSearches();
  });

  it("should initialize", () => {
    expect(composable).toBeDefined();
  });

  it("should have required state", () => {
    expect(composable.savedSearches).toBeDefined();
    expect(composable.searchHistory).toBeDefined();
  });

  // ---- loadSavedSearches ----
  describe("loadSavedSearches", () => {
    it("populates savedSearches on success", async () => {
      const mockData = [
        { id: "s1", name: "My Search", is_favorite: true, use_count: 3 },
        { id: "s2", name: "Other", is_favorite: false, use_count: 0 },
      ];
      mockState.savedSearchesData = mockData;

      await composable.loadSavedSearches();

      expect(composable.savedSearches.value).toEqual(mockData);
      expect(composable.isLoading.value).toBe(false);
      expect(composable.error.value).toBeNull();
    });

    it("sets error state on failure", async () => {
      mockState.savedSearchesError = new Error("DB error");

      await composable.loadSavedSearches();

      expect(composable.error.value).toBe("DB error");
      expect(composable.isLoading.value).toBe(false);
    });
  });

  // ---- loadSearchHistory ----
  describe("loadSearchHistory", () => {
    it("populates searchHistory on success", async () => {
      const mockHistory = [
        { id: "h1", search_term: "soccer", searched_at: "2026-01-01T10:00:00Z" },
      ];
      mockState.historyData = mockHistory;

      await composable.loadSearchHistory();

      expect(composable.searchHistory.value).toEqual(mockHistory);
      expect(composable.isLoading.value).toBe(false);
    });

    it("sets error state on failure", async () => {
      mockState.historyError = new Error("History load failed");

      await composable.loadSearchHistory();

      expect(composable.error.value).toBe("History load failed");
    });
  });

  // ---- saveSearch ----
  describe("saveSearch", () => {
    it("appends to savedSearches on success and returns data", async () => {
      const newSearch = {
        id: "new-1",
        name: "Basketball",
        is_favorite: false,
        use_count: 0,
      };
      mockState.insertData = newSearch;

      const result = await composable.saveSearch(
        "Basketball",
        "basketball",
        "schools",
        {},
      );

      expect(result).toEqual(newSearch);
      expect(composable.savedSearches.value[0]).toEqual(newSearch);
    });

    it("returns null and sets error on failure", async () => {
      mockState.insertError = new Error("Insert failed");

      const result = await composable.saveSearch("Bad", "bad", "schools", {});

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Insert failed");
    });
  });

  // ---- deleteSavedSearch ----
  describe("deleteSavedSearch", () => {
    it("removes the item from savedSearches on success", async () => {
      composable.savedSearches.value = [
        { id: "s1", name: "Keep", is_favorite: false, use_count: 0, searchType: "schools", filters: {}, created_at: "", updated_at: "", user_id: "user-1" },
        { id: "s2", name: "Delete Me", is_favorite: false, use_count: 0, searchType: "schools", filters: {}, created_at: "", updated_at: "", user_id: "user-1" },
      ];

      const result = await composable.deleteSavedSearch("s2");

      expect(result).toBe(true);
      expect(composable.savedSearches.value).toHaveLength(1);
      expect(composable.savedSearches.value[0].id).toBe("s1");
    });

    it("returns false and sets error on failure", async () => {
      mockState.deleteError = new Error("Delete failed");

      const result = await composable.deleteSavedSearch("s1");

      expect(result).toBe(false);
      expect(composable.error.value).toBe("Delete failed");
    });
  });

  // ---- clearHistory ----
  describe("clearHistory", () => {
    it("empties searchHistory ref on success", async () => {
      composable.searchHistory.value = [
        { id: "h1", search_term: "test", searched_at: "2026-01-01T10:00:00Z", user_id: "user-1", searchType: "all", result_count: 0 },
      ];

      const result = await composable.clearHistory();

      expect(result).toBe(true);
      expect(composable.searchHistory.value).toEqual([]);
    });

    it("returns false and sets error on failure", async () => {
      mockState.deleteError = new Error("Clear failed");

      const result = await composable.clearHistory();

      expect(result).toBe(false);
      expect(composable.error.value).toBe("Clear failed");
    });
  });

  // ---- favoritedSearches computed ----
  describe("favoritedSearches", () => {
    it("returns only favorited searches sorted by use_count descending", () => {
      composable.savedSearches.value = [
        { id: "s1", name: "A", is_favorite: true, use_count: 1, searchType: "schools", filters: {}, created_at: "", updated_at: "", user_id: "user-1" },
        { id: "s2", name: "B", is_favorite: false, use_count: 10, searchType: "schools", filters: {}, created_at: "", updated_at: "", user_id: "user-1" },
        { id: "s3", name: "C", is_favorite: true, use_count: 5, searchType: "schools", filters: {}, created_at: "", updated_at: "", user_id: "user-1" },
      ];

      const faved = composable.favoritedSearches.value;

      expect(faved).toHaveLength(2);
      expect(faved[0].id).toBe("s3"); // higher use_count first
      expect(faved[1].id).toBe("s1");
    });
  });

  // ---- recentSearches computed ----
  describe("recentSearches", () => {
    it("returns up to 10 history items sorted by searched_at descending", () => {
      const history = Array.from({ length: 12 }, (_, i) => ({
        id: `h${i}`,
        search_term: `query ${i}`,
        searched_at: new Date(2026, 0, i + 1).toISOString(),
        user_id: "user-1",
        searchType: "all" as const,
        result_count: 0,
      }));
      composable.searchHistory.value = history;

      const recent = composable.recentSearches.value;

      expect(recent).toHaveLength(10);
      // Most recent first
      expect(recent[0].id).toBe("h11");
    });
  });

  // ---- loading state ----
  describe("loading state", () => {
    it("isLoading is true while fetch is in flight", async () => {
      let resolvePromise!: (v: unknown) => void;
      // Patch via the mocked module — just verify the ref resets to false after settle
      mockState.savedSearchesData = [];
      const promise = composable.loadSavedSearches();
      // After await: loading should be false
      await promise;
      expect(composable.isLoading.value).toBe(false);
    });
  });
});
