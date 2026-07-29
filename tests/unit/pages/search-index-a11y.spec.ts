import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref, computed } from "vue";
import SearchPage from "~/pages/search/index.vue";

const searchState = {
  query: ref(""),
  searchType: ref<"all" | "schools" | "coaches" | "interactions" | "metrics">(
    "all",
  ),
  isSearching: ref(false),
  searchError: ref<string | null>(null),
  filters: ref({}),
  isFiltering: ref(false),
  schoolResults: ref<any[]>([]),
  coachResults: ref<any[]>([]),
  interactionResults: ref<any[]>([]),
  metricsResults: ref<any[]>([]),
};

vi.mock("~/composables/useSearchConsolidated", () => ({
  useSearchConsolidated: () => ({
    ...searchState,
    totalResults: computed(
      () =>
        searchState.schoolResults.value.length +
        searchState.coachResults.value.length +
        searchState.interactionResults.value.length +
        searchState.metricsResults.value.length,
    ),
    hasResults: computed(
      () =>
        searchState.schoolResults.value.length +
          searchState.coachResults.value.length +
          searchState.interactionResults.value.length +
          searchState.metricsResults.value.length >
        0,
    ),
    performSearch: vi.fn().mockResolvedValue(undefined),
    clearFilters: vi.fn(),
    applyFilter: vi.fn(),
    getSchoolSuggestions: vi.fn(),
    getCoachSuggestions: vi.fn(),
  }),
}));

vi.mock("~/composables/useSavedSearches", () => ({
  useSavedSearches: () => ({
    recordSearch: vi.fn().mockResolvedValue(undefined),
    incrementUseCount: vi.fn().mockResolvedValue(undefined),
  }),
}));

const pushMock = vi.fn();
vi.mock("vue-router", async () => {
  const actual = await vi.importActual<any>("vue-router");
  return { ...actual, useRouter: () => ({ push: pushMock }) };
});

const mountPage = () =>
  mount(SearchPage, {
    global: {
      stubs: {
        PageHeader: true,
        SaveSearchDialog: true,
        SearchInput: true,
        SavedSearchesList: true,
        SearchHistoryList: true,
        AdvancedFilters: true,
        SearchResultsSection: { template: "<div><slot /></div>" },
        SchoolCard: true,
        CoachCard: true,
        InteractionCard: true,
        MetricRow: true,
      },
    },
  });

describe("pages/search/index.vue - accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    searchState.query.value = "";
    searchState.searchType.value = "all";
    searchState.isSearching.value = false;
    searchState.searchError.value = null;
    searchState.schoolResults.value = [];
    searchState.coachResults.value = [];
    searchState.interactionResults.value = [];
    searchState.metricsResults.value = [];
  });

  describe("search type tabs", () => {
    it("marks only the active tab with aria-current", async () => {
      const wrapper = mountPage();
      const tabs = wrapper.find("nav").findAll("button");

      expect(tabs.length).toBe(5);
      expect(tabs[0].attributes("aria-current")).toBe("true");
      expect(tabs[1].attributes("aria-current")).toBeUndefined();
    });

    it("moves aria-current when a different tab is selected", async () => {
      const wrapper = mountPage();
      const tabs = () => wrapper.find("nav").findAll("button");

      await tabs()[2].trigger("click");

      expect(tabs()[0].attributes("aria-current")).toBeUndefined();
      expect(tabs()[2].attributes("aria-current")).toBe("true");
    });

    it("gives the tab list an accessible name", () => {
      const wrapper = mountPage();

      expect(wrapper.find("nav").attributes("aria-label")).toBe(
        "Search result types",
      );
    });
  });

  describe("results live region", () => {
    it("is not rendered until a query is entered", () => {
      const wrapper = mountPage();

      expect(
        wrapper.find('[data-testid="search-results-status"]').exists(),
      ).toBe(false);
    });

    it("is a polite status region once a query is entered", async () => {
      searchState.query.value = "stanford";
      const wrapper = mountPage();

      const status = wrapper.find('[data-testid="search-results-status"]');
      expect(status.exists()).toBe(true);
      expect(status.attributes("role")).toBe("status");
      expect(status.attributes("aria-live")).toBe("polite");
    });

    it("announces the result count once results arrive", async () => {
      searchState.query.value = "stanford";
      const wrapper = mountPage();

      searchState.schoolResults.value = [{ id: "s-1" }, { id: "s-2" }];
      await wrapper.vm.$nextTick();

      expect(
        wrapper.find('[data-testid="search-results-status"]').text(),
      ).toContain('2 results for "stanford"');
    });

    it("uses the singular noun for a single result", async () => {
      searchState.query.value = "stanford";
      const wrapper = mountPage();

      searchState.schoolResults.value = [{ id: "s-1" }];
      await wrapper.vm.$nextTick();

      expect(
        wrapper.find('[data-testid="search-results-status"]').text(),
      ).toContain('1 result for "stanford"');
    });

    it("stays empty while a search is in flight", async () => {
      searchState.query.value = "stanford";
      searchState.isSearching.value = true;
      searchState.schoolResults.value = [{ id: "s-1" }];
      const wrapper = mountPage();

      expect(wrapper.find('[data-testid="search-results-status"]').text()).toBe(
        "",
      );
    });
  });
});
