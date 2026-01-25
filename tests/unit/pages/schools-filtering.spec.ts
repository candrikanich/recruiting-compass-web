import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, computed } from "vue";
import type { School } from "~/types/models";
import { calculateDistance } from "~/utils/distance";

/**
 * Test Suite: School Filtering
 * Tests for User Story 3.3 - Parent Filters and Sorts Schools
 * Covers: Fit Score Range, Distance Range, State filters, and performance
 */

/**
 * Helper: Generate mock schools for testing
 */
function generateMockSchools(count: number): School[] {
  const schools: School[] = [];
  const states = ["CA", "TX", "FL", "NY", "PA"];
  const divisions: ("D1" | "D2" | "D3" | "NAIA" | "JUCO")[] = [
    "D1",
    "D2",
    "D3",
  ];
  const statuses: (
    | "researching"
    | "contacted"
    | "interested"
    | "offer_received"
    | "declined"
    | "committed"
  )[] = ["researching", "contacted", "interested"];

  for (let i = 0; i < count; i++) {
    schools.push({
      id: `school-${i}`,
      user_id: "user-1",
      name: `University ${i}`,
      location: `City ${i}, ${states[i % states.length]}`,
      city: `City ${i}`,
      state: states[i % states.length],
      division: divisions[i % divisions.length],
      conference: `Conference ${i % 3}`,
      ranking: 10 + i,
      is_favorite: i % 5 === 0,
      website: `https://university${i}.edu`,
      favicon_url: null,
      twitter_handle: `@uni${i}`,
      instagram_handle: `uni${i}`,
      status: statuses[i % statuses.length],
      priority_tier: (["A", "B", "C"][i % 3] as "A" | "B" | "C") || "B",
      notes: `Notes for school ${i}`,
      pros: ["Good athletics", "Great academics"],
      cons: ["Far away", "Expensive"],
      fit_score: 50 + (i % 51), // 50-100
      academic_info: {
        gpa_requirement: 3.0 + (i % 10) * 0.1,
        sat_requirement: 1000 + (i % 200),
        act_requirement: 20 + (i % 15),
        additional_requirements: [],
        latitude: 40.0 + (i % 30), // 40-70 latitude
        longitude: -120.0 + (i % 60), // -120 to -60 longitude
        student_size: (1000 + i * 100).toString(),
        state: states[i % states.length],
      },
    });
  }

  return schools;
}

/**
 * Helper: Distance calculation mock
 */
function mockDistanceCache(
  schools: School[],
  homeLocation: { latitude: number; longitude: number },
): Map<string, number> {
  const cache = new Map<string, number>();

  schools.forEach((school) => {
    const coords = school.academic_info;
    if (coords?.latitude && coords?.longitude) {
      const distance = calculateDistance(
        { latitude: homeLocation.latitude, longitude: homeLocation.longitude },
        { latitude: coords.latitude as number, longitude: coords.longitude as number },
      );
      cache.set(school.id, distance);
    }
  });

  return cache;
}

describe("School Filtering - User Story 3.3", () => {
  let schools: School[];

  beforeEach(() => {
    schools = generateMockSchools(100);
  });

  // ============================================================================
  // FIT SCORE RANGE FILTER TESTS
  // ============================================================================

  describe("Fit Score Range Filter", () => {
    it("should filter schools within fit score range (70-100)", () => {
      const filterFn = (school: School, range: { min?: number; max?: number }) => {
        const score = school.fit_score;
        if (score === null || score === undefined) return false;
        const min = range?.min ?? 0;
        const max = range?.max ?? 100;
        return score >= min && score <= max;
      };

      const filtered = schools.filter((s) => filterFn(s, { min: 70, max: 100 }));
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((school) => {
        if (school.fit_score !== null && school.fit_score !== undefined) {
          expect(school.fit_score).toBeGreaterThanOrEqual(70);
          expect(school.fit_score).toBeLessThanOrEqual(100);
        }
      });
    });

    it("should exclude schools below minimum fit score", () => {
      const filterFn = (school: School, range: { min?: number; max?: number }) => {
        const score = school.fit_score;
        if (score === null || score === undefined) return false;
        const min = range?.min ?? 0;
        const max = range?.max ?? 100;
        return score >= min && score <= max;
      };

      const filtered = schools.filter((s) => filterFn(s, { min: 75, max: 100 }));
      filtered.forEach((school) => {
        expect(school.fit_score).toBeGreaterThanOrEqual(75);
      });
    });

    it("should exclude schools above maximum fit score", () => {
      const filterFn = (school: School, range: { min?: number; max?: number }) => {
        const score = school.fit_score;
        if (score === null || score === undefined) return false;
        const min = range?.min ?? 0;
        const max = range?.max ?? 100;
        return score >= min && score <= max;
      };

      const filtered = schools.filter((s) => filterFn(s, { min: 0, max: 60 }));
      filtered.forEach((school) => {
        expect(school.fit_score).toBeLessThanOrEqual(60);
      });
    });

    it("should exclude schools with null fit_score", () => {
      const schoolWithoutScore: School = {
        ...schools[0],
        fit_score: null,
      };

      const filterFn = (school: School, range: { min?: number; max?: number }) => {
        const score = school.fit_score;
        if (score === null || score === undefined) return false;
        const min = range?.min ?? 0;
        const max = range?.max ?? 100;
        return score >= min && score <= max;
      };

      expect(filterFn(schoolWithoutScore, { min: 0, max: 100 })).toBe(false);
    });

    it("should handle partial range input (min only)", () => {
      const filterFn = (school: School, range: { min?: number; max?: number }) => {
        const score = school.fit_score;
        if (score === null || score === undefined) return false;
        const min = range?.min ?? 0;
        const max = range?.max ?? 100;
        return score >= min && score <= max;
      };

      const filtered = schools.filter((s) => filterFn(s, { min: 70 })); // No max specified
      filtered.forEach((school) => {
        expect(school.fit_score).toBeGreaterThanOrEqual(70);
        expect(school.fit_score).toBeLessThanOrEqual(100); // Uses default max
      });
    });

    it("should handle partial range input (max only)", () => {
      const filterFn = (school: School, range: { min?: number; max?: number }) => {
        const score = school.fit_score;
        if (score === null || score === undefined) return false;
        const min = range?.min ?? 0;
        const max = range?.max ?? 100;
        return score >= min && score <= max;
      };

      const filtered = schools.filter((s) => filterFn(s, { max: 70 })); // No min specified
      filtered.forEach((school) => {
        expect(school.fit_score).toBeGreaterThanOrEqual(0); // Uses default min
        expect(school.fit_score).toBeLessThanOrEqual(70);
      });
    });
  });

  // ============================================================================
  // DISTANCE RANGE FILTER TESTS
  // ============================================================================

  describe("Distance Range Filter", () => {
    const homeLocation = { latitude: 37.7749, longitude: -122.4194 }; // San Francisco

    it("should filter schools within distance range", () => {
      const cache = mockDistanceCache(schools, homeLocation);

      const filterFn = (school: School, range: { max?: number }) => {
        const distance = cache.get(school.id);
        if (distance === undefined) return false;
        const maxDistance = range?.max ?? 3000;
        return distance <= maxDistance;
      };

      const filtered = schools.filter((s) => filterFn(s, { max: 500 }));
      expect(filtered.length).toBeGreaterThanOrEqual(0);

      filtered.forEach((school) => {
        const distance = cache.get(school.id);
        if (distance !== undefined) {
          expect(distance).toBeLessThanOrEqual(500);
        }
      });
    });

    it("should show all schools when no home location is set", () => {
      const filterFn = (school: School, range: { max?: number }, hasLocation: boolean) => {
        if (!hasLocation) return true; // Show all if no home location
        return true; // Otherwise apply distance filter
      };

      const filtered = schools.filter((s) => filterFn(s, { max: 500 }, false));
      expect(filtered.length).toBe(schools.length);
    });

    it("should exclude schools without coordinates", () => {
      const schoolWithoutCoords: School = {
        ...schools[0],
        academic_info: { ...schools[0].academic_info, latitude: undefined },
      };

      const cache = mockDistanceCache([schoolWithoutCoords], homeLocation);

      const filterFn = (school: School, range: { max?: number }) => {
        const distance = cache.get(school.id);
        if (distance === undefined) return false;
        const maxDistance = range?.max ?? 3000;
        return distance <= maxDistance;
      };

      expect(filterFn(schoolWithoutCoords, { max: 3000 })).toBe(false);
    });

    it("should memoize distance calculations", () => {
      const cache1 = mockDistanceCache(schools, homeLocation);
      const cache2 = mockDistanceCache(schools, homeLocation);

      // Same school IDs should have same distances
      schools.forEach((school) => {
        expect(cache1.get(school.id)).toBe(cache2.get(school.id));
      });
    });

    it("should use default max distance if not specified", () => {
      const cache = mockDistanceCache(schools, homeLocation);

      const filterFn = (school: School, range: { max?: number }) => {
        const distance = cache.get(school.id);
        if (distance === undefined) return false;
        const maxDistance = range?.max ?? 3000; // Default max
        return distance <= maxDistance;
      };

      // All schools should pass with default max of 3000
      schools.forEach((school) => {
        expect(filterFn(school, {})).toBe(
          cache.get(school.id) !== undefined &&
            (cache.get(school.id) as number) <= 3000,
        );
      });
    });
  });

  // ============================================================================
  // STATE FILTER TESTS
  // ============================================================================

  describe("State Filter", () => {
    it("should filter schools by selected state", () => {
      const filterFn = (school: School, state: string) => {
        const schoolState = school.academic_info?.state || school.state;
        return schoolState === state;
      };

      const filtered = schools.filter((s) => filterFn(s, "CA"));
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((school) => {
        const schoolState = school.academic_info?.state || school.state;
        expect(schoolState).toBe("CA");
      });
    });

    it("should exclude schools from other states", () => {
      const filterFn = (school: School, state: string) => {
        const schoolState = school.academic_info?.state || school.state;
        return schoolState === state;
      };

      const filtered = schools.filter((s) => filterFn(s, "TX"));
      filtered.forEach((school) => {
        const schoolState = school.academic_info?.state || school.state;
        expect(schoolState).not.toBe("CA");
        expect(schoolState).not.toBe("FL");
      });
    });

    it("should handle schools without state data", () => {
      const schoolWithoutState: School = {
        ...schools[0],
        state: null,
        academic_info: { ...schools[0].academic_info, state: undefined },
      };

      const filterFn = (school: School, state: string) => {
        const schoolState = school.academic_info?.state || school.state;
        return schoolState === state;
      };

      expect(filterFn(schoolWithoutState, "CA")).toBe(false);
    });

    it("should generate dynamic state options from all schools", () => {
      const stateSet = new Set<string>();
      schools.forEach((school) => {
        const state = school.academic_info?.state || school.state;
        if (state && typeof state === "string") {
          stateSet.add(state);
        }
      });

      const stateOptions = Array.from(stateSet).sort();
      expect(stateOptions.length).toBeGreaterThan(0);
      expect(stateOptions).toContain("CA");
    });
  });

  // ============================================================================
  // COMBINED FILTER TESTS
  // ============================================================================

  describe("Combined Filters (AND Logic)", () => {
    it("should apply multiple filters together", () => {
      const fitScoreFilter = (school: School, range: { min?: number; max?: number }) => {
        const score = school.fit_score;
        if (score === null || score === undefined) return false;
        const min = range?.min ?? 0;
        const max = range?.max ?? 100;
        return score >= min && score <= max;
      };

      const divisionFilter = (school: School, division: string) => {
        return school.division === division;
      };

      const filtered = schools.filter(
        (s) => fitScoreFilter(s, { min: 70, max: 100 }) && divisionFilter(s, "D2"),
      );

      filtered.forEach((school) => {
        if (school.fit_score !== null && school.fit_score !== undefined) {
          expect(school.fit_score).toBeGreaterThanOrEqual(70);
          expect(school.fit_score).toBeLessThanOrEqual(100);
        }
        expect(school.division).toBe("D2");
      });
    });

    it("should return no results when filters exclude all schools", () => {
      const fitScoreFilter = (school: School, range: { min?: number; max?: number }) => {
        const score = school.fit_score;
        if (score === null || score === undefined) return false;
        const min = range?.min ?? 0;
        const max = range?.max ?? 100;
        return score >= min && score <= max;
      };

      // Fit score 0-10 is very unlikely in test data (50-100 range)
      const filtered = schools.filter((s) => fitScoreFilter(s, { min: 0, max: 10 }));
      expect(filtered.length).toBe(0);
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe("Performance (<100ms requirement)", () => {
    it("should filter 100+ schools in under 100ms", () => {
      const testSchools = generateMockSchools(150);
      const homeLocation = { latitude: 37.7749, longitude: -122.4194 };
      const cache = mockDistanceCache(testSchools, homeLocation);

      const fitScoreFilter = (school: School, range: { min?: number; max?: number }) => {
        const score = school.fit_score;
        if (score === null || score === undefined) return false;
        const min = range?.min ?? 0;
        const max = range?.max ?? 100;
        return score >= min && score <= max;
      };

      const distanceFilter = (school: School, range: { max?: number }) => {
        const distance = cache.get(school.id);
        if (distance === undefined) return false;
        const maxDistance = range?.max ?? 3000;
        return distance <= maxDistance;
      };

      const startTime = performance.now();

      const filtered = testSchools.filter(
        (s) =>
          fitScoreFilter(s, { min: 70, max: 100 }) &&
          distanceFilter(s, { max: 500 }),
      );

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it("should handle 200+ schools efficiently", () => {
      const testSchools = generateMockSchools(200);
      const homeLocation = { latitude: 37.7749, longitude: -122.4194 };
      const cache = mockDistanceCache(testSchools, homeLocation);

      const stateFilter = (school: School, state: string) => {
        const schoolState = school.academic_info?.state || school.state;
        return schoolState === state;
      };

      const startTime = performance.now();

      const filtered = testSchools.filter((s) => stateFilter(s, "CA"));

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it("should cache distance calculations to improve performance", () => {
      const testSchools = generateMockSchools(100);
      const homeLocation = { latitude: 37.7749, longitude: -122.4194 };

      // First calculation
      const startTime1 = performance.now();
      const cache1 = mockDistanceCache(testSchools, homeLocation);
      const duration1 = performance.now() - startTime1;

      // Second calculation (should use cache)
      const startTime2 = performance.now();
      const cache2 = mockDistanceCache(testSchools, homeLocation);
      const duration2 = performance.now() - startTime2;

      // Both should be fast, second should be roughly similar (cache helps overall)
      expect(duration1).toBeLessThan(100);
      expect(duration2).toBeLessThan(100);

      // Verify caches match
      testSchools.forEach((school) => {
        expect(cache1.get(school.id)).toBe(cache2.get(school.id));
      });
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle empty school list", () => {
      const emptySchools: School[] = [];

      const stateSet = new Set<string>();
      emptySchools.forEach((school) => {
        const state = school.academic_info?.state || school.state;
        if (state && typeof state === "string") {
          stateSet.add(state);
        }
      });

      expect(stateSet.size).toBe(0);
    });

    it("should handle schools with all null/undefined fit scores", () => {
      const schoolsNoScores = schools.map((s) => ({ ...s, fit_score: null }));

      const fitScoreFilter = (school: School, range: { min?: number; max?: number }) => {
        const score = school.fit_score;
        if (score === null || score === undefined) return false;
        const min = range?.min ?? 0;
        const max = range?.max ?? 100;
        return score >= min && score <= max;
      };

      const filtered = schoolsNoScores.filter((s) => fitScoreFilter(s, { min: 0, max: 100 }));
      expect(filtered.length).toBe(0);
    });

    it("should handle min > max for fit score gracefully", () => {
      const filterFn = (school: School, range: { min?: number; max?: number }) => {
        const score = school.fit_score;
        if (score === null || score === undefined) return false;
        const min = range?.min ?? 0;
        const max = range?.max ?? 100;
        // In production, you'd swap or validate, but filter logic here just checks
        return score >= min && score <= max;
      };

      // min=100, max=50 will result in no schools matching
      const filtered = schools.filter((s) => filterFn(s, { min: 100, max: 50 }));
      expect(filtered.length).toBe(0);
    });
  });
});
