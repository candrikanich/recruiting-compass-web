import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetchAuth = vi.fn();

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchAuth }),
}));

import { useCollegeData } from "~/composables/useCollegeData";

const mockResponse = {
  metadata: { total: 1, page: 0, per_page: 1 },
  results: [
    {
      id: 139755,
      "school.name": "University of Florida",
      "school.city": "Gainesville",
      "school.state": "FL",
      "school.school_url": "www.ufl.edu",
      "location.lat": 29.6436,
      "location.lon": -82.3549,
      "latest.admissions.admission_rate.overall": 0.31,
      "latest.student.size": 52000,
      "latest.cost.tuition.in_state": 6380,
      "latest.cost.tuition.out_of_state": 28658,
    },
  ],
};

describe("useCollegeData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear module-level cache between tests
    useCollegeData().clearCache();
  });

  describe("fetchByName", () => {
    it("returns null for school names shorter than 3 characters", async () => {
      const { fetchByName, error } = useCollegeData();

      const result = await fetchByName("ab");

      expect(result).toBeNull();
      expect(mockFetchAuth).not.toHaveBeenCalled();
      expect(error.value).toBeTruthy();
    });

    it("calls the internal proxy endpoint (not College Scorecard directly)", async () => {
      mockFetchAuth.mockResolvedValue(mockResponse);
      const { fetchByName } = useCollegeData();

      await fetchByName("University of Florida");

      const url = mockFetchAuth.mock.calls[0][0] as string;
      expect(url).toContain("/api/colleges/search");
      expect(url).not.toContain("api.data.gov");
      expect(url).not.toContain("api_key=");
    });

    it("passes school name as q param", async () => {
      mockFetchAuth.mockResolvedValue(mockResponse);
      const { fetchByName } = useCollegeData();

      await fetchByName("University of Florida");

      const url = mockFetchAuth.mock.calls[0][0] as string;
      expect(url).toContain("q=University+of+Florida");
    });

    it("transforms and returns college data", async () => {
      mockFetchAuth.mockResolvedValue(mockResponse);
      const { fetchByName } = useCollegeData();

      const result = await fetchByName("University of Florida");

      expect(result).toMatchObject({
        id: "139755",
        name: "University of Florida",
        city: "Gainesville",
        state: "FL",
        address: "Gainesville, FL",
        website: "http://www.ufl.edu",
        latitude: 29.6436,
        longitude: -82.3549,
        admissionRate: 0.31,
        studentSize: 52000,
        tuitionInState: 6380,
        tuitionOutOfState: 28658,
      });
    });

    it("caches results and returns from cache on second call", async () => {
      mockFetchAuth.mockResolvedValue(mockResponse);
      const { fetchByName } = useCollegeData();

      await fetchByName("University of Florida");
      await fetchByName("University of Florida");

      expect(mockFetchAuth).toHaveBeenCalledTimes(1);
    });

    it("cache is case-insensitive", async () => {
      mockFetchAuth.mockResolvedValue(mockResponse);
      const { fetchByName } = useCollegeData();

      await fetchByName("University of Florida");
      await fetchByName("UNIVERSITY OF FLORIDA");

      expect(mockFetchAuth).toHaveBeenCalledTimes(1);
    });

    it("sets error when school is not found", async () => {
      mockFetchAuth.mockResolvedValue({ metadata: { total: 0 }, results: [] });
      const { fetchByName, error } = useCollegeData();

      const result = await fetchByName("Nonexistent University");

      expect(result).toBeNull();
      expect(error.value).toContain("not found");
    });

    it("sets error on non-ok response", async () => {
      mockFetchAuth.mockRejectedValue(Object.assign(new Error("Bad Gateway"), { statusCode: 502 }));
      const { fetchByName, error } = useCollegeData();

      const result = await fetchByName("University of Florida");

      expect(result).toBeNull();
      expect(error.value).toBeTruthy();
    });

    it("sets error when fetch throws", async () => {
      mockFetchAuth.mockRejectedValue(new Error("Network failure"));
      const { fetchByName, error } = useCollegeData();

      const result = await fetchByName("University of Florida");

      expect(result).toBeNull();
      // Implementation catches $fetchAuth errors in inner try/catch and sets generic error
      expect(error.value).toBeTruthy();
    });
  });

  describe("fetchById", () => {
    it("returns null for empty ID", async () => {
      const { fetchById, error } = useCollegeData();

      const result = await fetchById("");

      expect(result).toBeNull();
      expect(mockFetchAuth).not.toHaveBeenCalled();
      expect(error.value).toBeTruthy();
    });

    it("calls the internal proxy with id param", async () => {
      mockFetchAuth.mockResolvedValue(mockResponse);
      const { fetchById } = useCollegeData();

      await fetchById("139755");

      const url = mockFetchAuth.mock.calls[0][0] as string;
      expect(url).toContain("/api/colleges/search");
      expect(url).toContain("id=139755");
      expect(url).not.toContain("api.data.gov");
    });

    it("caches results by ID", async () => {
      mockFetchAuth.mockResolvedValue(mockResponse);
      const { fetchById } = useCollegeData();

      await fetchById("139755");
      await fetchById("139755");

      expect(mockFetchAuth).toHaveBeenCalledTimes(1);
    });
  });

  describe("cache management", () => {
    it("clearCache removes all entries", async () => {
      mockFetchAuth.mockResolvedValue(mockResponse);
      const { fetchByName, clearCache, isCached } = useCollegeData();

      await fetchByName("University of Florida");
      expect(isCached("university of florida")).toBe(true);

      clearCache();
      expect(isCached("university of florida")).toBe(false);
    });

    it("invalidateEntry removes a specific entry", async () => {
      mockFetchAuth.mockResolvedValue(mockResponse);
      const { fetchByName, invalidateEntry, isCached } = useCollegeData();

      await fetchByName("University of Florida");
      invalidateEntry("university of florida");

      expect(isCached("university of florida")).toBe(false);
    });
  });
});
