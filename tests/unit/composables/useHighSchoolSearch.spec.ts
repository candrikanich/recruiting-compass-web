import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";

vi.mock("~/utils/debounce", () => ({
  debounce: (fn: Function) => fn,
}));

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

describe("useHighSchoolSearch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty results initially", async () => {
    const { useHighSchoolSearch } =
      await import("~/composables/useHighSchoolSearch");
    const { results, loading } = useHighSchoolSearch();
    expect(results.value).toEqual([]);
    expect(loading.value).toBe(false);
  });

  it("does not search for queries shorter than 2 chars", async () => {
    const { useHighSchoolSearch } =
      await import("~/composables/useHighSchoolSearch");
    const { search } = useHighSchoolSearch();
    await search("L");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("searches and returns results", async () => {
    const schools = [
      {
        nces_id: "1",
        name: "Lincoln High School",
        city: "Des Moines",
        state: "IA",
      },
    ];
    mockFetch.mockResolvedValue(schools);
    const { useHighSchoolSearch } =
      await import("~/composables/useHighSchoolSearch");
    const { search, results } = useHighSchoolSearch();
    await search("Lincoln");
    expect(results.value).toEqual(schools);
  });

  it("selectSchool returns name and nces_school_id", async () => {
    const { useHighSchoolSearch } =
      await import("~/composables/useHighSchoolSearch");
    const { selectSchool } = useHighSchoolSearch();
    const result = selectSchool({
      nces_id: "100001",
      name: "Lincoln High School",
      city: "Des Moines",
      state: "IA",
    });
    expect(result).toEqual({
      name: "Lincoln High School",
      nces_school_id: "100001",
    });
  });

  it("sets loading to true during search", async () => {
    let resolveFetch!: (v: unknown) => void;
    mockFetch.mockReturnValue(
      new Promise((r) => {
        resolveFetch = r;
      }),
    );
    const { useHighSchoolSearch } =
      await import("~/composables/useHighSchoolSearch");
    const { search, loading } = useHighSchoolSearch();
    const searchPromise = search("Lincoln");
    await nextTick();
    expect(loading.value).toBe(true);
    resolveFetch([]);
    await searchPromise;
    expect(loading.value).toBe(false);
  });

  it("clears results on empty search", async () => {
    mockFetch.mockResolvedValue([
      { nces_id: "1", name: "Lincoln", city: "X", state: "IA" },
    ]);
    const { useHighSchoolSearch } =
      await import("~/composables/useHighSchoolSearch");
    const { search, results } = useHighSchoolSearch();
    await search("Lincoln");
    expect(results.value).toHaveLength(1);
    await search("");
    expect(results.value).toEqual([]);
  });
});
