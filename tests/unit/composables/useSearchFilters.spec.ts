import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { warn: vi.fn(), error: vi.fn() },
}));

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => mockLogger,
}));

import { useSearchFilters } from "~/composables/useSearchFilters";

describe("composables/useSearchFilters (deprecated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("instantiates without throwing despite deprecation warning", () => {
    expect(() => useSearchFilters()).not.toThrow();
  });

  describe("initial state", () => {
    it("has empty schools filters", () => {
      const { filters } = useSearchFilters();
      expect(filters.value.schools.division).toBe("");
      expect(filters.value.schools.state).toBe("");
      expect(filters.value.schools.verified).toBe(false);
    });

    it("has empty coaches filters", () => {
      const { filters } = useSearchFilters();
      expect(filters.value.coaches.sport).toBe("");
      expect(filters.value.coaches.responseRate).toBe(0);
      expect(filters.value.coaches.verified).toBe(false);
    });

    it("has empty interactions filters", () => {
      const { filters } = useSearchFilters();
      expect(filters.value.interactions.sentiment).toBe("");
      expect(filters.value.interactions.direction).toBe("");
      expect(filters.value.interactions.dateFrom).toBe("");
      expect(filters.value.interactions.dateTo).toBe("");
    });

    it("has default metrics filters", () => {
      const { filters } = useSearchFilters();
      expect(filters.value.metrics.metricType).toBe("");
      expect(filters.value.metrics.minValue).toBe(0);
      expect(filters.value.metrics.maxValue).toBe(100);
    });
  });

  describe("isFiltering", () => {
    it("is true by default because maxValue starts at 100 (non-zero/non-default)", () => {
      // The isFiltering computed returns true when any value !== "" && !== 0 && !== false && !== null.
      // metrics.maxValue defaults to 100, which satisfies all conditions, so isFiltering is true.
      const { isFiltering } = useSearchFilters();
      expect(isFiltering.value).toBe(true);
    });

    it("is true when a string filter is set", () => {
      const { isFiltering, applyFilter } = useSearchFilters();
      applyFilter("schools", "division", "D1");
      expect(isFiltering.value).toBe(true);
    });

    it("is true when a boolean filter is set to true", () => {
      const { isFiltering, applyFilter } = useSearchFilters();
      applyFilter("schools", "verified", true);
      expect(isFiltering.value).toBe(true);
    });

    it("is true when a numeric filter is set above 0", () => {
      const { isFiltering, applyFilter } = useSearchFilters();
      applyFilter("coaches", "responseRate", 75);
      expect(isFiltering.value).toBe(true);
    });
  });

  describe("applyFilter", () => {
    it("updates the correct schools filter field", () => {
      const { filters, applyFilter } = useSearchFilters();
      applyFilter("schools", "division", "D2");
      expect(filters.value.schools.division).toBe("D2");
    });

    it("updates the correct coaches filter field", () => {
      const { filters, applyFilter } = useSearchFilters();
      applyFilter("coaches", "sport", "Basketball");
      expect(filters.value.coaches.sport).toBe("Basketball");
    });

    it("updates the correct interactions filter field", () => {
      const { filters, applyFilter } = useSearchFilters();
      applyFilter("interactions", "sentiment", "positive");
      expect(filters.value.interactions.sentiment).toBe("positive");
    });

    it("updates the correct metrics filter field", () => {
      const { filters, applyFilter } = useSearchFilters();
      applyFilter("metrics", "metricType", "gpa");
      expect(filters.value.metrics.metricType).toBe("gpa");
    });

    it("ignores unknown category gracefully", () => {
      const { filters, applyFilter } = useSearchFilters();
      expect(() => applyFilter("unknown", "field", "value")).not.toThrow();
      expect(filters.value.schools.division).toBe("");
    });
  });

  describe("clearFilters", () => {
    it("resets all filters to their defaults", () => {
      const { filters, applyFilter, clearFilters } = useSearchFilters();
      applyFilter("schools", "division", "D1");
      applyFilter("coaches", "sport", "Soccer");
      applyFilter("interactions", "sentiment", "positive");
      applyFilter("metrics", "metricType", "gpa");
      clearFilters();
      expect(filters.value.schools.division).toBe("");
      expect(filters.value.coaches.sport).toBe("");
      expect(filters.value.interactions.sentiment).toBe("");
      expect(filters.value.metrics.metricType).toBe("");
    });

    it("resets maxValue to 100 after clearFilters", () => {
      const { filters, applyFilter, clearFilters } = useSearchFilters();
      applyFilter("metrics", "maxValue", 50);
      clearFilters();
      expect(filters.value.metrics.maxValue).toBe(100);
    });

    it("isFiltering remains true after clearing because maxValue resets to 100", () => {
      // After clearFilters, metrics.maxValue = 100 which is still a non-default value
      // in the isFiltering check (100 !== 0), so isFiltering stays true.
      const { isFiltering, applyFilter, clearFilters } = useSearchFilters();
      applyFilter("schools", "state", "CA");
      expect(isFiltering.value).toBe(true);
      clearFilters();
      expect(isFiltering.value).toBe(true);
    });
  });

  describe("getFilterValue", () => {
    it("returns the current value for an existing filter", () => {
      const { getFilterValue, applyFilter } = useSearchFilters();
      applyFilter("schools", "state", "TX");
      expect(getFilterValue("schools", "state")).toBe("TX");
    });

    it("returns the default value before any filter is applied", () => {
      const { getFilterValue } = useSearchFilters();
      expect(getFilterValue("coaches", "sport")).toBe("");
    });

    it("returns null for an unknown category", () => {
      const { getFilterValue } = useSearchFilters();
      expect(getFilterValue("unknown", "field")).toBeNull();
    });
  });

  describe("isFilterActive", () => {
    it("returns false when filter is at default empty string", () => {
      const { isFilterActive } = useSearchFilters();
      expect(isFilterActive("schools", "division")).toBe(false);
    });

    it("returns false when filter is at default zero", () => {
      const { isFilterActive } = useSearchFilters();
      expect(isFilterActive("coaches", "responseRate")).toBe(false);
    });

    it("returns true when a string filter has a value", () => {
      const { isFilterActive, applyFilter } = useSearchFilters();
      applyFilter("schools", "division", "D1");
      expect(isFilterActive("schools", "division")).toBe(true);
    });

    it("returns true when a boolean filter is true", () => {
      const { isFilterActive, applyFilter } = useSearchFilters();
      applyFilter("coaches", "verified", true);
      expect(isFilterActive("coaches", "verified")).toBe(true);
    });

    it("returns false for an unknown category", () => {
      const { isFilterActive } = useSearchFilters();
      expect(isFilterActive("unknown", "field")).toBe(false);
    });
  });
});
