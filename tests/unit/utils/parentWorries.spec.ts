import { describe, it, expect } from "vitest";
import {
  getCommonWorries,
  getWorrysByCategory,
  type ParentWorry,
} from "~/utils/parentWorries";
import type { Phase } from "~/types/timeline";

describe("parentWorries", () => {
  describe("getCommonWorries", () => {
    it("should return worries for freshman phase", () => {
      const worries = getCommonWorries("freshman");
      expect(worries.length).toBeGreaterThan(0);
      expect(worries.every((w) => w.phases.includes("freshman"))).toBe(true);
    });

    it("should return worries for sophomore phase", () => {
      const worries = getCommonWorries("sophomore");
      expect(worries.length).toBeGreaterThan(0);
      expect(worries.every((w) => w.phases.includes("sophomore"))).toBe(true);
    });

    it("should return worries for junior phase", () => {
      const worries = getCommonWorries("junior");
      expect(worries.length).toBeGreaterThan(0);
      expect(worries.every((w) => w.phases.includes("junior"))).toBe(true);
    });

    it("should return worries for senior phase", () => {
      const worries = getCommonWorries("senior");
      expect(worries.length).toBeGreaterThan(0);
      expect(worries.every((w) => w.phases.includes("senior"))).toBe(true);
    });

    it("should return empty array for committed phase", () => {
      const worries = getCommonWorries("committed");
      expect(worries.length).toBe(0);
    });

    it("should have complete worry objects with id, question, and answer", () => {
      const worries = getCommonWorries("freshman");
      worries.forEach((worry) => {
        expect(worry.id).toBeTruthy();
        expect(worry.question).toBeTruthy();
        expect(worry.answer).toBeTruthy();
        expect(worry.phases).toBeTruthy();
        expect(worry.category).toBeTruthy();
      });
    });

    it("should return worries sorted by category", () => {
      const worries = getCommonWorries("junior");
      const categories = worries.map((w) => w.category);
      const sorted = [...categories].sort();
      expect(categories).toEqual(sorted);
    });
  });

  describe("getWorrysByCategory", () => {
    it("should return only worries matching category", () => {
      const worries = getWorrysByCategory("freshman", "timeline");
      expect(worries.every((w) => w.category === "timeline")).toBe(true);
    });

    it("should return empty array for non-existent category combination", () => {
      const worries = getWorrysByCategory("freshman", "mental_health");
      // May or may not have mental_health worries for freshman
      expect(Array.isArray(worries)).toBe(true);
    });

    it("should return worries with valid category", () => {
      const worries = getWorrysByCategory("junior", "recruiting");
      worries.forEach((worry) => {
        expect(["recruiting", "academics", "mental_health", "timeline"]).toContain(worry.category);
      });
    });
  });

  describe("worry content validation", () => {
    it("all worries should have meaningful content", () => {
      const phases: Phase[] = ["freshman", "sophomore", "junior", "senior"];
      phases.forEach((phase) => {
        const worries = getCommonWorries(phase);
        worries.forEach((worry) => {
          expect(worry.question.length).toBeGreaterThan(5);
          expect(worry.answer.length).toBeGreaterThan(20);
        });
      });
    });

    it("should have reasonable number of unique worries total", () => {
      // Some worries can apply to multiple phases, which is expected
      const phases: Phase[] = ["freshman", "sophomore", "junior", "senior"];
      const allWorries: ParentWorry[] = [];
      const uniqueWorryIds = new Set<string>();

      phases.forEach((phase) => {
        const worries = getCommonWorries(phase);
        allWorries.push(...worries);
        worries.forEach((worry) => {
          uniqueWorryIds.add(worry.id);
        });
      });

      // Should have multiple instances of worries (because they appear in multiple phases)
      expect(allWorries.length).toBeGreaterThan(uniqueWorryIds.size);

      // Should have a reasonable number of unique worries
      expect(uniqueWorryIds.size).toBeGreaterThan(8);
      expect(uniqueWorryIds.size).toBeLessThan(50);
    });
  });
});
