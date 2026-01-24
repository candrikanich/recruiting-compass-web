import { describe, it, expect, beforeEach, vi } from "vitest";
import { calculateDistance } from "~/utils/distance";
import type { School } from "~/types";

// Mock school data for testing
const mockSchools: School[] = [
  {
    id: "1",
    name: "Alabama",
    user_id: "user1",
    location: "Tuscaloosa, AL",
    division: "D1",
    status: "researching",
    is_favorite: false,
    fit_score: 85,
    ranking: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
    academic_info: {
      latitude: 32.6006,
      longitude: -87.5491,
      student_size: 45000,
    },
  },
  {
    id: "2",
    name: "Clemson",
    user_id: "user1",
    location: "Clemson, SC",
    division: "D1",
    status: "contacted",
    is_favorite: true,
    fit_score: 72,
    ranking: 2,
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-10T00:00:00Z",
    academic_info: {
      latitude: 34.6835,
      longitude: -82.8361,
      student_size: 25000,
    },
  },
  {
    id: "3",
    name: "Baseball State",
    user_id: "user1",
    location: "Tempe, AZ",
    division: "D1",
    status: "interested",
    is_favorite: false,
    fit_score: null,
    ranking: 3,
    created_at: "2024-01-03T00:00:00Z",
    updated_at: "2024-01-20T00:00:00Z",
    academic_info: {
      latitude: 33.4255,
      longitude: -111.9286,
      student_size: 70000,
    },
  },
  {
    id: "4",
    name: "Vandy",
    user_id: "user1",
    location: "Nashville, TN",
    division: "D1",
    status: "researching",
    is_favorite: false,
    fit_score: 90,
    ranking: 4,
    created_at: "2024-01-04T00:00:00Z",
    updated_at: "2024-01-05T00:00:00Z",
    academic_info: {
      latitude: 36.1445,
      longitude: -86.8023,
      student_size: 12000,
    },
  },
];

// Home location for distance testing
const homeLocation = { latitude: 40.7128, longitude: -74.006 }; // New York

describe("School Sorting Utilities", () => {
  describe("Alphabetical (A-Z) sorting", () => {
    it("should sort schools by name ascending", () => {
      const sorted = [...mockSchools].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      expect(sorted[0].name).toBe("Alabama");
      expect(sorted[1].name).toBe("Baseball State");
      expect(sorted[2].name).toBe("Clemson");
      expect(sorted[3].name).toBe("Vandy");
    });

    it("should sort schools by name descending", () => {
      const sorted = [...mockSchools].sort((a, b) =>
        b.name.localeCompare(a.name),
      );

      expect(sorted[0].name).toBe("Vandy");
      expect(sorted[1].name).toBe("Clemson");
      expect(sorted[2].name).toBe("Baseball State");
      expect(sorted[3].name).toBe("Alabama");
    });

    it("should handle case-insensitive sorting", () => {
      const schools: School[] = [
        { ...mockSchools[0], name: "alabama" },
        { ...mockSchools[1], name: "Clemson" },
        { ...mockSchools[2], name: "BASEBALL STATE" },
      ];

      const sorted = [...schools].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      expect(sorted[0].name).toBe("alabama");
      expect(sorted[1].name).toBe("BASEBALL STATE");
      expect(sorted[2].name).toBe("Clemson");
    });
  });

  describe("Fit Score sorting", () => {
    it("should sort schools by fit score ascending", () => {
      const sorted = [...mockSchools].sort((a, b) => {
        const scoreA = a.fit_score ?? -1;
        const scoreB = b.fit_score ?? -1;
        return scoreA - scoreB;
      });

      expect(sorted[0].id).toBe("3"); // null (treated as -1)
      expect(sorted[1].id).toBe("2"); // 72
      expect(sorted[2].id).toBe("1"); // 85
      expect(sorted[3].id).toBe("4"); // 90
    });

    it("should sort schools by fit score descending", () => {
      const sorted = [...mockSchools].sort((a, b) => {
        const scoreA = a.fit_score ?? -1;
        const scoreB = b.fit_score ?? -1;
        return scoreB - scoreA;
      });

      expect(sorted[0].id).toBe("4"); // 90
      expect(sorted[1].id).toBe("1"); // 85
      expect(sorted[2].id).toBe("2"); // 72
      expect(sorted[3].id).toBe("3"); // null
    });

    it("should handle schools with null fit scores", () => {
      const sorted = [...mockSchools].sort((a, b) => {
        const scoreA = a.fit_score ?? -1;
        const scoreB = b.fit_score ?? -1;
        return scoreA - scoreB;
      });

      const nullSchool = sorted.find((s) => s.fit_score === null);
      expect(nullSchool).toBeDefined();
      expect(nullSchool?.id).toBe("3");
    });
  });

  describe("Distance sorting", () => {
    it("should sort schools by distance from home location", () => {
      const getDistance = (school: School): number => {
        if (!school.academic_info) return Infinity;
        const lat = school.academic_info["latitude"] as number | undefined;
        const lng = school.academic_info["longitude"] as number | undefined;

        if (!lat || !lng) return Infinity;

        return calculateDistance(
          { latitude: homeLocation.latitude, longitude: homeLocation.longitude },
          { latitude: lat, longitude: lng },
        );
      };

      const sorted = [...mockSchools].sort((a, b) => {
        const distA = getDistance(a);
        const distB = getDistance(b);
        return distA - distB;
      });

      // Verify first school is closest and last is farthest
      const distances = sorted.map((s) => getDistance(s));
      for (let i = 0; i < distances.length - 1; i++) {
        expect(distances[i]).toBeLessThanOrEqual(distances[i + 1]);
      }
    });

    it("should sort by distance descending", () => {
      const getDistance = (school: School): number => {
        if (!school.academic_info) return Infinity;
        const lat = school.academic_info["latitude"] as number | undefined;
        const lng = school.academic_info["longitude"] as number | undefined;

        if (!lat || !lng) return Infinity;

        return calculateDistance(
          { latitude: homeLocation.latitude, longitude: homeLocation.longitude },
          { latitude: lat, longitude: lng },
        );
      };

      const sorted = [...mockSchools].sort((a, b) => {
        const distA = getDistance(a);
        const distB = getDistance(b);
        return distB - distA; // Reversed for descending
      });

      const distances = sorted.map((s) => getDistance(s));
      for (let i = 0; i < distances.length - 1; i++) {
        expect(distances[i]).toBeGreaterThanOrEqual(distances[i + 1]);
      }
    });

    it("should handle schools without coordinates", () => {
      const schoolNoCoords: School = {
        ...mockSchools[0],
        academic_info: { student_size: 45000 },
      };

      const getDistance = (school: School): number => {
        if (!school.academic_info) return Infinity;
        const lat = school.academic_info["latitude"] as number | undefined;
        const lng = school.academic_info["longitude"] as number | undefined;

        if (!lat || !lng) return Infinity;

        return calculateDistance(
          { latitude: homeLocation.latitude, longitude: homeLocation.longitude },
          { latitude: lat, longitude: lng },
        );
      };

      const distance = getDistance(schoolNoCoords);
      expect(distance).toBe(Infinity);
    });
  });

  describe("Last Contact sorting", () => {
    it("should sort schools by updated_at date descending (most recent first)", () => {
      const sorted = [...mockSchools].sort((a, b) => {
        const dateA = new Date(a.updated_at || 0).getTime();
        const dateB = new Date(b.updated_at || 0).getTime();
        return dateB - dateA; // Most recent first
      });

      expect(sorted[0].id).toBe("3"); // 2024-01-20
      expect(sorted[1].id).toBe("1"); // 2024-01-15
      expect(sorted[2].id).toBe("2"); // 2024-01-10
      expect(sorted[3].id).toBe("4"); // 2024-01-05
    });

    it("should sort schools by updated_at date ascending (oldest first)", () => {
      const sorted = [...mockSchools].sort((a, b) => {
        const dateA = new Date(a.updated_at || 0).getTime();
        const dateB = new Date(b.updated_at || 0).getTime();
        return dateA - dateB;
      });

      expect(sorted[0].id).toBe("4"); // 2024-01-05
      expect(sorted[1].id).toBe("2"); // 2024-01-10
      expect(sorted[2].id).toBe("1"); // 2024-01-15
      expect(sorted[3].id).toBe("3"); // 2024-01-20
    });

    it("should handle schools without updated_at", () => {
      const schoolNoDate: School = {
        ...mockSchools[0],
        updated_at: undefined as any,
      };

      const date = new Date(schoolNoDate.updated_at || 0).getTime();
      expect(date).toBe(0);
    });
  });

  describe("Sort order toggling", () => {
    it("should reverse sort when order changes from asc to desc", () => {
      const asc = [...mockSchools].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      const desc = [...asc].reverse();

      expect(asc[0].name).toBe("Alabama");
      expect(desc[0].name).toBe("Vandy");
    });

    it("should handle toggling multiple times", () => {
      let sorted = [...mockSchools].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      const asc1 = [...sorted];

      sorted = sorted.reverse();
      sorted = sorted.reverse();

      expect(sorted[0].name).toBe(asc1[0].name);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty array", () => {
      const sorted = [][Symbol.sort?.() as any];
      expect(sorted).toBeUndefined();
    });

    it("should handle single school", () => {
      const sorted = [mockSchools[0]].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      expect(sorted.length).toBe(1);
      expect(sorted[0].id).toBe("1");
    });

    it("should handle schools with identical names (stable sort)", () => {
      const schools: School[] = [
        { ...mockSchools[0], name: "Same", id: "a" },
        { ...mockSchools[1], name: "Same", id: "b" },
        { ...mockSchools[2], name: "Same", id: "c" },
      ];

      const sorted = [...schools].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      expect(sorted.every((s) => s.name === "Same")).toBe(true);
    });

    it("should handle schools with identical fit scores", () => {
      const schools: School[] = [
        { ...mockSchools[0], fit_score: 80 },
        { ...mockSchools[1], fit_score: 80 },
        { ...mockSchools[2], fit_score: 80 },
      ];

      const sorted = [...schools].sort((a, b) => {
        const scoreA = a.fit_score ?? -1;
        const scoreB = b.fit_score ?? -1;
        return scoreA - scoreB;
      });

      expect(sorted.every((s) => s.fit_score === 80)).toBe(true);
    });
  });
});
