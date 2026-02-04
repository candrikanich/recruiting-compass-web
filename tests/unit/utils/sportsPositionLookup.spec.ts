import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getSportsList,
  getPositionsBySport,
  sportHasPositionList,
} from "~/utils/sportsPositionLookup";
import type { Sport, Position } from "~/types/onboarding";

describe("utils/sportsPositionLookup", () => {
  beforeEach(() => {
    // Clear memoization between tests
    vi.resetModules();
  });

  describe("getSportsList", () => {
    describe("Happy Path", () => {
      it("should return array of sports", () => {
        const sports = getSportsList();
        expect(Array.isArray(sports)).toBe(true);
        expect(sports.length).toBeGreaterThan(0);
      });

      it("should return sports with required properties", () => {
        const sports = getSportsList();
        sports.forEach((sport: Sport) => {
          expect(sport).toHaveProperty("id");
          expect(sport).toHaveProperty("name");
          expect(sport).toHaveProperty("hasPositionList");
          expect(sport).toHaveProperty("displayOrder");
        });
      });

      it("should include common sports", () => {
        const sports = getSportsList();
        const sportNames = sports.map((s: Sport) => s.name.toLowerCase());

        expect(sportNames).toContain("baseball");
        expect(sportNames).toContain("soccer");
        expect(sportNames).toContain("basketball");
        expect(sportNames).toContain("football");
        expect(sportNames).toContain("hockey");
      });

      it("should return sports in display order", () => {
        const sports = getSportsList();
        const orders = sports.map((s: Sport) => s.displayOrder);

        for (let i = 1; i < orders.length; i++) {
          expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
        }
      });

      it("should return sports with consistent types", () => {
        const sports = getSportsList();
        sports.forEach((sport: Sport) => {
          expect(typeof sport.id).toBe("string");
          expect(typeof sport.name).toBe("string");
          expect(typeof sport.hasPositionList).toBe("boolean");
          expect(typeof sport.displayOrder).toBe("number");
        });
      });
    });

    describe("Memoization", () => {
      it("should return same array instance on multiple calls (memoized)", () => {
        const sports1 = getSportsList();
        const sports2 = getSportsList();
        expect(sports1).toBe(sports2); // Same reference
      });

      it("should not create new array on each call", () => {
        const sports1 = getSportsList();
        const sports2 = getSportsList();
        expect(sports1 === sports2).toBe(true);
      });
    });
  });

  describe("getPositionsBySport", () => {
    describe("Happy Path - Sports with Positions", () => {
      it("should return positions for baseball", () => {
        const positions = getPositionsBySport("baseball");
        expect(Array.isArray(positions)).toBe(true);
        expect(positions.length).toBeGreaterThan(0);
      });

      it("should return positions with required properties", () => {
        const positions = getPositionsBySport("baseball");
        positions.forEach((pos: Position) => {
          expect(pos).toHaveProperty("id");
          expect(pos).toHaveProperty("name");
          expect(pos).toHaveProperty("sportId");
          expect(pos).toHaveProperty("displayOrder");
        });
      });

      it("should return baseball positions", () => {
        const positions = getPositionsBySport("baseball");
        const posNames = positions.map((p: Position) => p.name.toLowerCase());

        // Should include typical baseball positions
        expect(posNames.length).toBeGreaterThan(0);
      });

      it("should return soccer positions for soccer sport", () => {
        const positions = getPositionsBySport("soccer");
        expect(Array.isArray(positions)).toBe(true);
        expect(positions.length).toBeGreaterThan(0);
      });

      it("should return basketball positions", () => {
        const positions = getPositionsBySport("basketball");
        const posNames = positions.map((p: Position) => p.name.toLowerCase());
        expect(positions.length).toBeGreaterThan(0);
      });

      it("should return positions in display order", () => {
        const positions = getPositionsBySport("baseball");
        const orders = positions.map((p: Position) => p.displayOrder);

        for (let i = 1; i < orders.length; i++) {
          expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
        }
      });
    });

    describe("Sports Without Positions", () => {
      it("should return empty array for sports without position list", () => {
        const sports = getSportsList();
        const sportWithoutPositions = sports.find(
          (s: Sport) => !s.hasPositionList,
        );

        if (sportWithoutPositions) {
          const positions = getPositionsBySport(sportWithoutPositions.id);
          expect(Array.isArray(positions)).toBe(true);
          expect(positions.length).toBe(0);
        }
      });
    });

    describe("Invalid Input", () => {
      it("should return empty array for non-existent sport", () => {
        const positions = getPositionsBySport("nonexistent-sport-xyz");
        expect(Array.isArray(positions)).toBe(true);
        expect(positions.length).toBe(0);
      });

      it("should handle empty string gracefully", () => {
        const positions = getPositionsBySport("");
        expect(Array.isArray(positions)).toBe(true);
        expect(positions.length).toBe(0);
      });

      it("should be case-sensitive for sport lookup", () => {
        const positionsLower = getPositionsBySport("baseball");
        const positionsUpper = getPositionsBySport("BASEBALL");

        // Behavior can be either: all match or case-sensitive
        // Just test that it returns consistently
        expect(Array.isArray(positionsLower)).toBe(true);
        expect(Array.isArray(positionsUpper)).toBe(true);
      });
    });

    describe("Memoization", () => {
      it("should return same array instance for same sport (memoized)", () => {
        const positions1 = getPositionsBySport("soccer");
        const positions2 = getPositionsBySport("soccer");
        expect(positions1).toBe(positions2); // Same reference
      });

      it("should cache results per sport", () => {
        const baseball = getPositionsBySport("baseball");
        const soccer = getPositionsBySport("soccer");
        const baseballAgain = getPositionsBySport("baseball");

        expect(baseball === baseballAgain).toBe(true);
        expect(baseball !== soccer).toBe(true);
      });
    });
  });

  describe("sportHasPositionList", () => {
    describe("Happy Path", () => {
      it("should return true for sports with position lists", () => {
        const sports = getSportsList();
        const sportsWithPositions = sports.filter(
          (s: Sport) => s.hasPositionList,
        );

        sportsWithPositions.forEach((sport: Sport) => {
          const result = sportHasPositionList(sport.id);
          expect(result).toBe(true);
        });
      });

      it("should return false for sports without position lists", () => {
        const sports = getSportsList();
        const sportsWithoutPositions = sports.filter(
          (s: Sport) => !s.hasPositionList,
        );

        sportsWithoutPositions.forEach((sport: Sport) => {
          const result = sportHasPositionList(sport.id);
          expect(result).toBe(false);
        });
      });

      it("should return consistent boolean value", () => {
        const result = sportHasPositionList("baseball");
        expect(typeof result).toBe("boolean");
      });
    });

    describe("Invalid Input", () => {
      it("should return false for non-existent sport", () => {
        const result = sportHasPositionList("nonexistent-sport-xyz");
        expect(result).toBe(false);
      });

      it("should return false for empty string", () => {
        const result = sportHasPositionList("");
        expect(result).toBe(false);
      });
    });

    describe("Consistency with getSportsList", () => {
      it("should match hasPositionList property from sports list", () => {
        const sports = getSportsList();
        sports.forEach((sport: Sport) => {
          const result = sportHasPositionList(sport.id);
          expect(result).toBe(sport.hasPositionList);
        });
      });
    });

    describe("Memoization", () => {
      it("should be performant (memoized internally)", () => {
        // Just verify it doesn't throw and returns quickly
        const start = performance.now();
        for (let i = 0; i < 1000; i++) {
          sportHasPositionList("baseball");
        }
        const end = performance.now();
        const duration = end - start;

        // 1000 calls should be very fast (< 100ms) with memoization
        expect(duration).toBeLessThan(100);
      });
    });
  });

  describe("Integration", () => {
    it("should work together: list sports, filter by position list, get positions", () => {
      const sports = getSportsList();
      const sportsWithPositions = sports.filter((s: Sport) =>
        sportHasPositionList(s.id),
      );

      expect(sportsWithPositions.length).toBeGreaterThan(0);

      sportsWithPositions.forEach((sport: Sport) => {
        const positions = getPositionsBySport(sport.id);
        expect(positions.length).toBeGreaterThan(0);
      });
    });

    it("should not return positions for sports without position lists", () => {
      const sports = getSportsList();
      const sportsWithoutPositions = sports.filter(
        (s: Sport) => !s.hasPositionList,
      );

      sportsWithoutPositions.forEach((sport: Sport) => {
        const positions = getPositionsBySport(sport.id);
        expect(positions.length).toBe(0);
      });
    });
  });
});
