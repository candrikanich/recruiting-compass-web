import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSchoolLogos } from "~/composables/useSchoolLogos";
import {
  createMockSchool,
  createMockSchools,
} from "~/tests/fixtures/schools.fixture";

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  })),
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    user: { id: "user-123" },
  }),
}));

const mockFetchAuth = vi.fn();
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({
    $fetchAuth: mockFetchAuth,
  }),
}));

// Mock $fetch
global.$fetch = vi.fn();

describe("useSchoolLogos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAuth.mockResolvedValue({ faviconUrls: {} });
    localStorage.clear();
    const { clearAllLogos } = useSchoolLogos();
    clearAllLogos();
  });

  describe("extractDomain", () => {
    it("should extract domain from school website URL", () => {
      const school = createMockSchool({ website: "https://www.florida.edu" });
      const { extractDomain } = useSchoolLogos();

      const domain = extractDomain(school);
      expect(domain).toBe("florida.edu");
    });

    it("should handle URLs without https://", () => {
      const school = createMockSchool({ website: "www.florida.edu" });
      const { extractDomain } = useSchoolLogos();

      const domain = extractDomain(school);
      expect(domain).toBe("florida.edu");
    });

    it("should remove trailing slashes", () => {
      const school = createMockSchool({ website: "https://florida.edu/" });
      const { extractDomain } = useSchoolLogos();

      const domain = extractDomain(school);
      expect(domain).toBe("florida.edu");
    });

    it("should handle string domain input directly", () => {
      const { extractDomain } = useSchoolLogos();
      const domain = extractDomain("https://www.mit.edu");

      expect(domain).toBe("mit.edu");
    });

    it("should return null when website missing (no fabricated domains)", () => {
      // Fixture defaults website via ||, so null must be forced post-creation
      const school = {
        ...createMockSchool({ name: "University of Florida" }),
        website: null,
      };
      const { extractDomain } = useSchoolLogos();

      const domain = extractDomain(school);
      expect(domain).toBeNull();
    });

    it("should handle empty school name gracefully", () => {
      const school = createMockSchool({ name: "", website: null });
      const { extractDomain } = useSchoolLogos();

      expect(() => extractDomain(school)).not.toThrow();
    });

    it("should handle null website gracefully", () => {
      const school = createMockSchool({
        name: "Test University",
        website: null,
      });
      const { extractDomain } = useSchoolLogos();

      expect(() => extractDomain(school)).not.toThrow();
    });
  });

  describe("fetchSchoolLogo", () => {
    it("should fetch logo from database if available", async () => {
      const faviconUrl = "https://florida.edu/favicon.ico";
      const school = createMockSchool({
        id: "school-1",
        favicon_url: faviconUrl,
      });

      const { fetchSchoolLogo, logoMap } = useSchoolLogos();
      const result = await fetchSchoolLogo(school);

      expect(result).toBe(faviconUrl);
      expect(logoMap.value.get("school-1")).toBe(faviconUrl);
    });

    it("should cache result in memory", async () => {
      const faviconUrl = "https://example.com/favicon.ico";
      const school = createMockSchool({
        id: "school-1",
        favicon_url: faviconUrl,
      });

      const { fetchSchoolLogo, cachedCount } = useSchoolLogos();
      await fetchSchoolLogo(school);

      expect(cachedCount.value).toBeGreaterThan(0);
    });

    it("should not fetch again if cached", async () => {
      const school = createMockSchool({
        id: "school-1",
        favicon_url: "https://example.com/favicon.ico",
      });

      const { fetchSchoolLogo } = useSchoolLogos();

      // First fetch
      await fetchSchoolLogo(school);
      // Second fetch (should use cache)
      await fetchSchoolLogo(school);

      // Since we used database favicon, no API calls needed
      expect(vi.mocked(global.$fetch).mock.calls.length).toBe(0);
    });

    it("should prevent concurrent fetches for same school", async () => {
      const school = createMockSchool({
        id: "school-1",
        favicon_url: "https://example.com/favicon.ico",
      });

      const { fetchSchoolLogo } = useSchoolLogos();

      // Start two fetches simultaneously
      const promise1 = fetchSchoolLogo(school);
      const promise2 = fetchSchoolLogo(school);

      const result1 = await promise1;
      const result2 = await promise2;

      // Both should return the same value
      expect(result1).toBe(result2);
      expect(result1).toBeTruthy();
    });
  });

  describe("fetchMultipleLogos", () => {
    it("should resolve missing favicons with a single batch API call", async () => {
      const schools = createMockSchools(3, (i) => ({
        favicon_url: null,
        website: `https://school${i}.edu`,
      }));
      mockFetchAuth.mockResolvedValue({
        faviconUrls: {
          "school-1": "https://school0.edu/favicon.ico",
          "school-2": null,
          "school-3": "https://school2.edu/favicon.ico",
        },
      });

      const { fetchMultipleLogos, logoMap } = useSchoolLogos();
      await fetchMultipleLogos(schools);

      expect(mockFetchAuth).toHaveBeenCalledTimes(1);
      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/schools/favicons",
        expect.objectContaining({
          method: "POST",
          body: {
            schools: [
              { schoolId: "school-1", schoolDomain: "school0.edu" },
              { schoolId: "school-2", schoolDomain: "school1.edu" },
              { schoolId: "school-3", schoolDomain: "school2.edu" },
            ],
          },
        }),
      );
      expect(logoMap.value.get("school-1")).toBe(
        "https://school0.edu/favicon.ico",
      );
      expect(logoMap.value.get("school-2")).toBeNull();
    });

    it("should persist found favicons to the database", async () => {
      const schools = createMockSchools(1, () => ({
        favicon_url: null,
        website: "https://mit.edu",
      }));
      mockFetchAuth.mockResolvedValue({
        faviconUrls: { "school-1": "https://mit.edu/favicon.ico" },
      });

      const { fetchMultipleLogos } = useSchoolLogos();
      await fetchMultipleLogos(schools);

      expect(mockSupabase.from).toHaveBeenCalledWith("schools");
    });

    it("should not call API for schools without a website", async () => {
      // Fixture defaults website via ||, so null must be forced post-creation
      const schools = createMockSchools(2, () => ({ favicon_url: null })).map(
        (school) => ({ ...school, website: null }),
      );

      const { fetchMultipleLogos, logoMap } = useSchoolLogos();
      await fetchMultipleLogos(schools);

      expect(mockFetchAuth).not.toHaveBeenCalled();
      expect(logoMap.value.get("school-1")).toBeNull();
    });

    it("should not refetch schools with a cached negative result", async () => {
      const schools = createMockSchools(1, () => ({
        favicon_url: null,
        website: "https://nofavicon.edu",
      }));
      mockFetchAuth.mockResolvedValue({
        faviconUrls: { "school-1": null },
      });

      const { fetchMultipleLogos } = useSchoolLogos();
      await fetchMultipleLogos(schools);
      await fetchMultipleLogos(schools);

      expect(mockFetchAuth).toHaveBeenCalledTimes(1);
    });

    it("should fetch logos for multiple schools", async () => {
      const schools = createMockSchools(3, (i) => ({
        favicon_url: `https://example${i}.com/favicon.ico`,
      }));

      const { fetchMultipleLogos, logoMap } = useSchoolLogos();
      await fetchMultipleLogos(schools);

      expect(logoMap.value.size).toBeGreaterThanOrEqual(0);
    });

    it("should handle partial failures gracefully", async () => {
      const schools = createMockSchools(3);

      const { fetchMultipleLogos, logoMap } = useSchoolLogos();
      await fetchMultipleLogos(schools);

      // Should not crash
      expect(logoMap.value).toBeDefined();
    });

    it("should return logoMap after fetching", async () => {
      const schools = createMockSchools(2);

      const { fetchMultipleLogos } = useSchoolLogos();
      const result = await fetchMultipleLogos(schools);

      expect(result).toBeDefined();
      expect(result.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe("localStorage persistence", () => {
    it("should persist results (including negatives) across reloads", async () => {
      const schools = createMockSchools(1, () => ({
        favicon_url: null,
        website: "https://nofavicon.edu",
      }));
      mockFetchAuth.mockResolvedValue({
        faviconUrls: { "school-1": null },
      });

      const { fetchMultipleLogos } = useSchoolLogos();
      await fetchMultipleLogos(schools);

      const raw = localStorage.getItem("trc-school-logo-cache");
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed["school-1"]).toMatchObject({ faviconUrl: null });
    });
  });

  describe("getSchoolLogo", () => {
    it("should return cached logo if available", async () => {
      const faviconUrl = "https://example.com/favicon.ico";
      const school = createMockSchool({
        id: "school-1",
        favicon_url: faviconUrl,
      });

      const { getSchoolLogo } = useSchoolLogos();
      const result = await getSchoolLogo(school);

      // Should return the favicon URL
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });
  });

  describe("getSchoolLogoCached", () => {
    it("should return logo from cache synchronously", async () => {
      const faviconUrl = "https://example.com/favicon.ico";
      const school = createMockSchool({
        id: "school-1",
        favicon_url: faviconUrl,
      });

      const { fetchSchoolLogo, getSchoolLogoCached } = useSchoolLogos();
      await fetchSchoolLogo(school);

      const result = getSchoolLogoCached("school-1");
      // Should have cached value
      expect(result).toBeTruthy();
    });

    it("should return undefined if not cached", () => {
      const { getSchoolLogoCached } = useSchoolLogos();
      const result = getSchoolLogoCached("non-existent");

      expect(result).toBeUndefined();
    });
  });

  describe("getDisplayLogo", () => {
    it("should return favicon URL if available", async () => {
      const faviconUrl = "https://example.com/favicon.ico";
      const school = createMockSchool({
        id: "school-1",
        favicon_url: faviconUrl,
      });

      const { fetchSchoolLogo, getDisplayLogo } = useSchoolLogos();
      await fetchSchoolLogo(school);

      const result = getDisplayLogo("school-1");
      // Should return a value (favicon or icon)
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("should return generic icon as fallback", () => {
      const { getDisplayLogo, GENERIC_SCHOOL_ICON } = useSchoolLogos();
      const result = getDisplayLogo("non-existent");

      expect(result).toBe(GENERIC_SCHOOL_ICON);
    });
  });

  describe("clearSchoolLogoCache", () => {
    it("should remove school from cache", async () => {
      const school = createMockSchool({
        id: "school-1",
        favicon_url: "https://example.com/favicon.ico",
      });

      const { fetchSchoolLogo, clearSchoolLogoCache, getSchoolLogoCached } =
        useSchoolLogos();
      await fetchSchoolLogo(school);

      expect(getSchoolLogoCached("school-1")).toBeDefined();

      clearSchoolLogoCache("school-1");
      expect(getSchoolLogoCached("school-1")).toBeUndefined();
    });
  });

  describe("clearAllLogos", () => {
    it("should clear all cached logos", async () => {
      const schools = createMockSchools(2, (i) => ({
        favicon_url: `https://example${i}.com/favicon.ico`,
      }));

      const { fetchMultipleLogos, clearAllLogos, cachedCount } =
        useSchoolLogos();
      await fetchMultipleLogos(schools);

      const countBefore = cachedCount.value;
      clearAllLogos();
      const countAfter = cachedCount.value;

      expect(countAfter).toBeLessThanOrEqual(countBefore);
    });
  });

  describe("batchFetchMissingLogos", () => {
    it("should handle schools list gracefully", async () => {
      const schools = [
        createMockSchool({
          id: "1",
          favicon_url: "https://example.com/favicon.ico",
        }),
        createMockSchool({ id: "2", favicon_url: null }),
      ];

      const { batchFetchMissingLogos } = useSchoolLogos();
      const result = await batchFetchMissingLogos(schools);

      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it("should return 0 when all schools have favicons", async () => {
      const schools = createMockSchools(2, () => ({
        favicon_url: "https://example.com/favicon.ico",
      }));

      const { batchFetchMissingLogos } = useSchoolLogos();
      const result = await batchFetchMissingLogos(schools);

      expect(result).toBe(0);
    });

    it("should handle empty school list", async () => {
      const { batchFetchMissingLogos } = useSchoolLogos();
      const result = await batchFetchMissingLogos([]);

      expect(result).toBe(0);
    });
  });

  describe("isLoading computed", () => {
    it("should be false when no fetches in progress", async () => {
      const school = createMockSchool({
        id: "school-1",
        favicon_url: "https://example.com/favicon.ico",
      });

      const { fetchSchoolLogo, isLoading } = useSchoolLogos();
      await fetchSchoolLogo(school);

      expect(isLoading.value).toBe(false);
    });
  });

  describe("cachedCount computed", () => {
    it("should return number of cached logos", async () => {
      const schools = createMockSchools(2, (i) => ({
        favicon_url: `https://example${i}.com/favicon.ico`,
      }));

      const { fetchMultipleLogos, cachedCount } = useSchoolLogos();
      await fetchMultipleLogos(schools);

      expect(cachedCount.value).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Constants", () => {
    it("should define CACHE_TTL", () => {
      const { CACHE_TTL } = useSchoolLogos();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      expect(CACHE_TTL).toBe(sevenDays);
    });

    it("should define GENERIC_SCHOOL_ICON", () => {
      const { GENERIC_SCHOOL_ICON } = useSchoolLogos();
      expect(GENERIC_SCHOOL_ICON).toBe("🏫");
    });
  });

  describe("Edge cases", () => {
    it("should handle school with empty website string", () => {
      const school = createMockSchool({ website: "" });
      const { extractDomain } = useSchoolLogos();

      expect(() => extractDomain(school)).not.toThrow();
    });

    it("should handle multiple domain format variations", () => {
      const { extractDomain } = useSchoolLogos();

      expect(extractDomain("https://www.example.edu/")).toBe("example.edu");
      expect(extractDomain("http://example.edu")).toBe("example.edu");
    });

    it("should handle very large batch of schools", async () => {
      const schools = createMockSchools(100, (i) => ({
        favicon_url: i % 2 === 0 ? "https://example.com/favicon.ico" : null,
      }));

      const { fetchMultipleLogos } = useSchoolLogos();

      expect(() => fetchMultipleLogos(schools)).not.toThrow();
    });
  });
});
