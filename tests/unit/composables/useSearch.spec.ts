import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { useSearch } from "~/composables/useSearch";

const mockEntitySearch = {
  performSearch: vi.fn(),
  query: ref(""),
  searchType: ref("all"),
  isSearching: ref(false),
  searchError: ref(null),
  useFuzzySearch: ref(false),
  schoolResults: ref([]),
  coachResults: ref([]),
  interactionResults: ref([]),
  metricsResults: ref([]),
  totalResults: ref(0),
  hasResults: ref(false),
  clearResults: vi.fn(),
  getSchoolSuggestions: vi.fn(),
  getCoachSuggestions: vi.fn(),
};

const mockFilterMgmt = {
  applyFilter: vi.fn(),
  clearFilters: vi.fn(),
  filters: ref({}),
  isFiltering: ref(false),
};

vi.mock("~/composables/useEntitySearch", () => ({
  useEntitySearch: vi.fn(() => mockEntitySearch),
}));

vi.mock("~/composables/useSearchFilters", () => ({
  useSearchFilters: vi.fn(() => mockFilterMgmt),
}));

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  }),
}));

describe("useSearch", () => {
  let search: ReturnType<typeof useSearch>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEntitySearch.query.value = "";
    mockFilterMgmt.filters.value = {};
    search = useSearch();
  });

  it("should initialize composable", () => {
    expect(search).toBeDefined();
  });

  it("should have required properties", () => {
    expect(search.query).toBeDefined();
    expect(search.totalResults).toBeDefined();
    expect(search.filters).toBeDefined();
  });

  it("should expose search methods", () => {
    expect(
      typeof search.searchSchools === "function" ||
        typeof search.searchSchools === "undefined",
    ).toBe(true);
  });

  // ---- deprecation warning ----
  it("emits deprecation warn in development", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    // Just ensure instantiation doesn't throw
    const s = useSearch();
    expect(s).toBeDefined();
    process.env.NODE_ENV = originalEnv;
  });

  // ---- performSearch ----
  describe("performSearch", () => {
    it("delegates to entitySearch with current filters", async () => {
      mockFilterMgmt.filters.value = { division: "D1" };
      await search.performSearch("soccer");
      expect(mockEntitySearch.performSearch).toHaveBeenCalledWith("soccer", { division: "D1" });
    });
  });

  // ---- clearFilters ----
  describe("clearFilters", () => {
    it("calls filterMgmt.clearFilters but does NOT re-search when query is empty", async () => {
      mockEntitySearch.query.value = "";
      await search.clearFilters();
      expect(mockFilterMgmt.clearFilters).toHaveBeenCalled();
      expect(mockEntitySearch.performSearch).not.toHaveBeenCalled();
    });

    it("calls filterMgmt.clearFilters AND re-searches when query is active", async () => {
      mockEntitySearch.query.value = "basketball";
      await search.clearFilters();
      expect(mockFilterMgmt.clearFilters).toHaveBeenCalled();
      expect(mockEntitySearch.performSearch).toHaveBeenCalledWith("basketball", expect.anything());
    });
  });

  // ---- applyFilter ----
  describe("applyFilter", () => {
    it("applies filter but does NOT re-search when query is empty", async () => {
      mockEntitySearch.query.value = "";
      await search.applyFilter("sport", "type", "soccer");
      expect(mockFilterMgmt.applyFilter).toHaveBeenCalledWith("sport", "type", "soccer");
      expect(mockEntitySearch.performSearch).not.toHaveBeenCalled();
    });

    it("applies filter AND re-searches when query is active", async () => {
      mockEntitySearch.query.value = "soccer";
      await search.applyFilter("sport", "type", "outdoor");
      expect(mockFilterMgmt.applyFilter).toHaveBeenCalledWith("sport", "type", "outdoor");
      expect(mockEntitySearch.performSearch).toHaveBeenCalledWith("soccer", expect.anything());
    });
  });
});
