import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCollegeAutocomplete } from "~/composables/useCollegeAutocomplete";

describe("useCollegeAutocomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not fetch when query is shorter than 3 characters", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const { searchColleges, results, error } = useCollegeAutocomplete();

    await searchColleges("ab");

    expect(global.fetch).not.toHaveBeenCalled();
    expect(results.value).toEqual([]);
    expect(error.value).toBeNull();
  });

  it("calls the internal proxy endpoint (not College Scorecard directly)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ metadata: { total: 0 }, results: [] }),
      }),
    );
    const { searchColleges } = useCollegeAutocomplete();

    await searchColleges("Florida");

    const url = vi.mocked(global.fetch).mock.calls[0][0] as string;
    expect(url).toContain("/api/colleges/search");
    expect(url).not.toContain("api.data.gov");
    expect(url).not.toContain("api_key=");
  });

  it("transforms and returns search results", async () => {
    const mockResponse = {
      metadata: { total: 2, page: 0, per_page: 10 },
      results: [
        {
          id: 1,
          "school.name": "University of Florida",
          "school.city": "Gainesville",
          "school.state": "FL",
          "school.school_url": "www.ufl.edu",
        },
        {
          id: 2,
          "school.name": "Florida State University",
          "school.city": "Tallahassee",
          "school.state": "FL",
          "school.school_url": null,
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }),
    );
    const { searchColleges, results } = useCollegeAutocomplete();

    await searchColleges("Florida");

    expect(results.value).toHaveLength(2);
    expect(results.value[0]).toMatchObject({
      id: "1",
      name: "University of Florida",
      city: "Gainesville",
      state: "FL",
      location: "Gainesville, FL",
      website: "http://www.ufl.edu",
    });
    expect(results.value[1].website).toBeNull();
  });

  it("deduplicates results by ID", async () => {
    const school = {
      id: 1,
      "school.name": "University of Florida",
      "school.city": "Gainesville",
      "school.state": "FL",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ metadata: { total: 2 }, results: [school, school] }),
      }),
    );
    const { searchColleges, results } = useCollegeAutocomplete();

    await searchColleges("Florida");

    expect(results.value).toHaveLength(1);
  });

  it("sets error on rate limit (429)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429 }),
    );
    const { searchColleges, error } = useCollegeAutocomplete();

    await searchColleges("Florida");

    expect(error.value).toContain("Too many requests");
  });

  it("sets error on other non-ok responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 502 }),
    );
    const { searchColleges, error } = useCollegeAutocomplete();

    await searchColleges("Florida");

    expect(error.value).toBeTruthy();
  });

  it("sets error when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure")),
    );
    const { searchColleges, error, results } = useCollegeAutocomplete();

    await searchColleges("Florida");

    expect(error.value).toContain("Network failure");
    expect(results.value).toEqual([]);
  });

  it("clears results before each new search", async () => {
    const { searchColleges, results } = useCollegeAutocomplete();

    // First search returns results
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            metadata: { total: 1 },
            results: [
              { id: 1, "school.name": "University of Florida", "school.city": "Gainesville", "school.state": "FL" },
            ],
          }),
      }),
    );
    await searchColleges("Florida");
    expect(results.value).toHaveLength(1);

    // Second short search clears results
    await searchColleges("Fl");
    expect(results.value).toEqual([]);
  });

  it("sets loading true during fetch and false after", async () => {
    let resolveFetch!: (value: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      ),
    );
    const { searchColleges, loading } = useCollegeAutocomplete();

    const fetchPromise = searchColleges("Florida");
    expect(loading.value).toBe(true);

    resolveFetch({
      ok: true,
      json: () => Promise.resolve({ metadata: { total: 0 }, results: [] }),
    });
    await fetchPromise;
    expect(loading.value).toBe(false);
  });

  it("formats website URLs without a protocol", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            metadata: { total: 1 },
            results: [
              {
                id: 1,
                "school.name": "Test U",
                "school.city": "City",
                "school.state": "ST",
                "school.school_url": "testuniversity.edu",
              },
            ],
          }),
      }),
    );
    const { searchColleges, results } = useCollegeAutocomplete();

    await searchColleges("Test");

    expect(results.value[0].website).toBe("http://testuniversity.edu");
  });

  it("preserves https URLs as-is", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            metadata: { total: 1 },
            results: [
              {
                id: 1,
                "school.name": "Test U",
                "school.city": "City",
                "school.state": "ST",
                "school.school_url": "https://testuniversity.edu",
              },
            ],
          }),
      }),
    );
    const { searchColleges, results } = useCollegeAutocomplete();

    await searchColleges("Test");

    expect(results.value[0].website).toBe("https://testuniversity.edu");
  });
});
