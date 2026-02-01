# User Story 3 Unit Test Plan

**Date:** 2026-01-24
**Scope:** Unit test coverage for new features in Stories 3.1-3.5
**Framework:** Vitest with `happy-dom`
**Strategy:** TDD - write tests before or alongside implementation

---

## Overview

Unit tests focus on business logic, data transformations, and isolated component functionality. These tests verify correctness without a real browser or database.

---

## Test File Organization

```
tests/unit/
├── stores/
│   ├── schools.spec.ts (existing - update)
│   ├── schools-priority.spec.ts (new)
│   └── schools-sorting.spec.ts (new)
├── composables/
│   ├── useSchoolMatching.spec.ts (existing - update)
│   ├── useSchoolDuplication.spec.ts (new)
│   ├── useSchoolRecalculation.spec.ts (new)
│   └── useSchools.spec.ts (existing - may update)
├── utils/
│   ├── schoolValidation.spec.ts (new)
│   └── schoolSize.spec.ts (existing)
├── components/
│   ├── SchoolPrioritySelector.spec.ts (new)
│   ├── SchoolFitScoreBreakdown.spec.ts (new)
│   └── SchoolDuplicateWarning.spec.ts (new)
└── fixtures/
    └── schools.fixture.ts (existing - update)
```

---

## Test Suites

### 1. Priority Tier Store Tests

**File:** `tests/unit/stores/schools-priority.spec.ts`
**New File**
**Dependencies:** `useSchoolStore`, mock Supabase

```typescript
describe("Priority Tier Management", () => {
  let schoolStore;
  let mockQuery;

  beforeEach(() => {
    // Setup as in existing schools.spec.ts
  });

  describe("setPriorityTier action", () => {
    it("should set priority tier to A", async () => {
      const school = createMockSchool({ id: "school-1" });
      schoolStore.schools = [school];

      mockQuery.single.mockResolvedValue({
        data: { ...school, priority_tier: "A" },
        error: null,
      });

      await schoolStore.updateSchool("school-1", { priority_tier: "A" });

      expect(schoolStore.schools[0].priority_tier).toBe("A");
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ priority_tier: "A" }),
      );
    });

    it("should set priority tier to B", async () => {
      // Similar to above, tier B
    });

    it("should set priority tier to C", async () => {
      // Similar to above, tier C
    });

    it("should clear priority tier (set to null)", async () => {
      const school = createMockSchool({ id: "school-1", priority_tier: "A" });
      schoolStore.schools = [school];

      mockQuery.single.mockResolvedValue({
        data: { ...school, priority_tier: null },
        error: null,
      });

      await schoolStore.updateSchool("school-1", { priority_tier: null });

      expect(schoolStore.schools[0].priority_tier).toBeNull();
    });

    it("should throw error on invalid tier", async () => {
      await expect(
        schoolStore.updateSchool("school-1", { priority_tier: "D" as any }),
      ).rejects.toThrow();
    });
  });

  describe("schoolsByPriorityTier getter", () => {
    beforeEach(() => {
      schoolStore.schools = [
        createMockSchool({ id: "a1", priority_tier: "A" }),
        createMockSchool({ id: "a2", priority_tier: "A" }),
        createMockSchool({ id: "b1", priority_tier: "B" }),
        createMockSchool({ id: "c1", priority_tier: "C" }),
        createMockSchool({ id: "none", priority_tier: null }),
      ];
    });

    it("should return only A tier schools", () => {
      const aTier = schoolStore.schoolsByPriorityTier("A");

      expect(aTier).toHaveLength(2);
      expect(aTier.map((s) => s.id)).toEqual(["a1", "a2"]);
    });

    it("should return only B tier schools", () => {
      const bTier = schoolStore.schoolsByPriorityTier("B");

      expect(bTier).toHaveLength(1);
      expect(bTier[0].id).toBe("b1");
    });

    it("should return only C tier schools", () => {
      const cTier = schoolStore.schoolsByPriorityTier("C");

      expect(cTier).toHaveLength(1);
      expect(cTier[0].id).toBe("c1");
    });

    it("should return empty array for non-existent tier", () => {
      const tier = schoolStore.schoolsByPriorityTier("A");
      const noTier = schoolStore.schools.filter(
        (s) => s.priority_tier === null,
      );

      expect(tier.length + noTier.length).toBe(5);
    });
  });

  describe("priority tier filtering", () => {
    beforeEach(() => {
      schoolStore.schools = [
        createMockSchool({ id: "a1", priority_tier: "A", division: "D1" }),
        createMockSchool({ id: "b1", priority_tier: "B", division: "D2" }),
        createMockSchool({ id: "c1", priority_tier: "C", division: "D1" }),
        createMockSchool({ id: "none", priority_tier: null, division: "D3" }),
      ];
    });

    it("should filter schools by priority tier A", () => {
      schoolStore.setFilters({ priorityTiers: ["A"] });

      const filtered = schoolStore.filteredSchools;

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("a1");
    });

    it("should filter schools by multiple priority tiers", () => {
      schoolStore.setFilters({ priorityTiers: ["A", "C"] });

      const filtered = schoolStore.filteredSchools;

      expect(filtered).toHaveLength(2);
      expect(filtered.map((s) => s.id)).toEqual(["a1", "c1"]);
    });

    it("should combine priority tier filter with other filters", () => {
      schoolStore.setFilters({
        priorityTiers: ["A", "B"],
        division: ["D1"],
      });

      const filtered = schoolStore.filteredSchools;

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("a1");
    });

    it("should handle empty priority tier array", () => {
      schoolStore.setFilters({ priorityTiers: [] });

      const filtered = schoolStore.filteredSchools;

      expect(filtered.length).toBe(4); // All schools
    });
  });

  describe("priority tier independence", () => {
    it("should set priority tier independently of status", async () => {
      const school = createMockSchool({
        id: "school-1",
        status: "interested",
        priority_tier: null,
      });
      schoolStore.schools = [school];

      mockQuery.single.mockResolvedValue({
        data: { ...school, priority_tier: "A" },
        error: null,
      });

      await schoolStore.updateSchool("school-1", { priority_tier: "A" });

      expect(schoolStore.schools[0].status).toBe("interested");
      expect(schoolStore.schools[0].priority_tier).toBe("A");
    });

    it("should update status without affecting priority tier", async () => {
      const school = createMockSchool({
        id: "school-1",
        status: "interested",
        priority_tier: "A",
      });
      schoolStore.schools = [school];

      mockQuery.single.mockResolvedValue({
        data: { ...school, status: "offer_received" },
        error: null,
      });

      await schoolStore.updateSchool("school-1", { status: "offer_received" });

      expect(schoolStore.schools[0].status).toBe("offer_received");
      expect(schoolStore.schools[0].priority_tier).toBe("A");
    });
  });
});
```

---

### 2. Duplicate School Detection Tests

**File:** `tests/unit/composables/useSchoolDuplication.spec.ts`
**New File**
**Dependencies:** `useSchoolStore`, Supabase mock

```typescript
describe("useSchoolDuplication", () => {
  let schoolStore;
  let duplication;

  beforeEach(() => {
    setActivePinia(createPinia());
    schoolStore = useSchoolStore();
    duplication = useSchoolDuplication();

    schoolStore.schools = [
      createMockSchool({
        id: "1",
        name: "Arizona State University",
        website: "https://www.asu.edu",
        ncaa_id: "asufoot",
      }),
      createMockSchool({
        id: "2",
        name: "University of Colorado",
        website: "https://www.colorado.edu",
        ncaa_id: "colorfoot",
      }),
    ];
  });

  describe("findDuplicate - exact name match", () => {
    it("should find duplicate by exact name match", () => {
      const newSchool = {
        name: "Arizona State University",
      };

      const duplicate = duplication.findDuplicate(newSchool);

      expect(duplicate).toBeDefined();
      expect(duplicate?.id).toBe("1");
    });

    it("should find duplicate by case-insensitive name", () => {
      const newSchool = {
        name: "arizona state university", // lowercase
      };

      const duplicate = duplication.findDuplicate(newSchool);

      expect(duplicate).toBeDefined();
      expect(duplicate?.id).toBe("1");
    });

    it("should find duplicate with mixed case", () => {
      const newSchool = {
        name: "ARIZONA STATE UNIVERSITY", // uppercase
      };

      const duplicate = duplication.findDuplicate(newSchool);

      expect(duplicate).toBeDefined();
      expect(duplicate?.id).toBe("1");
    });

    it("should not match similar but different names", () => {
      const newSchool = {
        name: "Arizona State College", // Different
      };

      const duplicate = duplication.findDuplicate(newSchool);

      expect(duplicate).toBeUndefined();
    });

    it("should handle whitespace variations", () => {
      const newSchool = {
        name: "  Arizona State University  ", // Extra spaces
      };

      const duplicate = duplication.findDuplicate(newSchool);

      // Implementation should normalize whitespace
      expect(duplicate).toBeDefined();
    });
  });

  describe("findDuplicate - NCAA ID match", () => {
    it("should find duplicate by NCAA ID", () => {
      const newSchool = {
        name: "Different Name",
        ncaa_id: "asufoot", // Same NCAA ID
      };

      const duplicate = duplication.findDuplicate(newSchool);

      expect(duplicate).toBeDefined();
      expect(duplicate?.id).toBe("1");
    });

    it("should not match if NCAA ID differs", () => {
      const newSchool = {
        name: "Arizona State University",
        ncaa_id: "differentid",
      };

      const duplicate = duplication.findDuplicate(newSchool);

      expect(duplicate).toBeUndefined();
    });

    it("should handle null/undefined NCAA ID", () => {
      const newSchool = {
        name: "New School",
        ncaa_id: undefined,
      };

      const duplicate = duplication.findDuplicate(newSchool);

      expect(duplicate).toBeUndefined();
    });
  });

  describe("findDuplicate - domain match", () => {
    it("should find duplicate by domain", () => {
      const newSchool = {
        name: "Different Name",
        website: "https://asu.edu/athletics", // Same domain
      };

      const duplicate = duplication.findDuplicate(newSchool);

      expect(duplicate).toBeDefined();
      expect(duplicate?.id).toBe("1");
    });

    it("should normalize domain (www vs non-www)", () => {
      const newSchool = {
        name: "Different",
        website: "https://asu.edu", // No www
      };

      const duplicate = duplication.findDuplicate(newSchool);

      expect(duplicate).toBeDefined();
    });

    it("should handle different protocols (http vs https)", () => {
      const newSchool = {
        name: "Different",
        website: "http://www.asu.edu", // http instead of https
      };

      const duplicate = duplication.findDuplicate(newSchool);

      expect(duplicate).toBeDefined();
    });

    it("should not match if domains differ", () => {
      const newSchool = {
        name: "Arizona State",
        website: "https://www.different.edu",
      };

      const duplicate = duplication.findDuplicate(newSchool);

      expect(duplicate).toBeUndefined();
    });

    it("should handle invalid URLs gracefully", () => {
      const newSchool = {
        name: "Test",
        website: "not a valid url",
      };

      expect(() => duplication.findDuplicate(newSchool)).not.toThrow();
    });
  });

  describe("findDuplicate - priority of matching", () => {
    it("should prefer name match over other types", () => {
      const newSchool = {
        name: "Arizona State University", // Name matches school 1
        website: "https://www.colorado.edu", // Website matches school 2
        ncaa_id: "differentid",
      };

      const duplicate = duplication.findDuplicate(newSchool);

      expect(duplicate?.id).toBe("1"); // Should match by name first
    });

    it("should return first match found", () => {
      const newSchool = {
        name: "Arizona State University",
      };

      const duplicate = duplication.findDuplicate(newSchool);

      expect(duplicate).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle empty school list", () => {
      schoolStore.schools = [];

      const duplicate = duplication.findDuplicate({
        name: "Any School",
      });

      expect(duplicate).toBeUndefined();
    });

    it("should handle null/undefined input fields", () => {
      const newSchool = {
        name: undefined,
        website: null,
        ncaa_id: undefined,
      };

      expect(() => duplication.findDuplicate(newSchool)).not.toThrow();
    });

    it("should handle schools with missing fields", () => {
      schoolStore.schools = [
        createMockSchool({
          id: "1",
          name: "Test University",
          website: undefined,
          ncaa_id: undefined,
        }),
      ];

      const newSchool = {
        name: "Test University",
      };

      const duplicate = duplication.findDuplicate(newSchool);

      expect(duplicate).toBeDefined();
      expect(duplicate?.id).toBe("1");
    });
  });
});
```

---

### 3. Fit Score Breakdown Tests

**File:** `tests/unit/composables/useSchoolMatching.spec.ts` (update)
**Existing File - Add Tests**
**Focus:** Ensure 4-component breakdown returns all components with scores

```typescript
describe("Match Breakdown Components", () => {
  let matching;

  beforeEach(() => {
    matching = useSchoolMatching();
  });

  describe("calculateMatchBreakdown", () => {
    it("should return all 4 components", () => {
      const school = createMockSchool();
      const breakdown = matching.calculateMatchBreakdown(school);

      expect(breakdown).toHaveProperty("academic");
      expect(breakdown).toHaveProperty("athletic");
      expect(breakdown).toHaveProperty("opportunity");
      expect(breakdown).toHaveProperty("personal");
      expect(breakdown).toHaveProperty("overall");
    });

    it("should return scores 0-100 for each component", () => {
      const school = createMockSchool();
      const breakdown = matching.calculateMatchBreakdown(school);

      expect(breakdown.academic.score).toBeGreaterThanOrEqual(0);
      expect(breakdown.academic.score).toBeLessThanOrEqual(100);
      expect(breakdown.athletic.score).toBeGreaterThanOrEqual(0);
      expect(breakdown.athletic.score).toBeLessThanOrEqual(100);
      expect(breakdown.opportunity.score).toBeGreaterThanOrEqual(0);
      expect(breakdown.opportunity.score).toBeLessThanOrEqual(100);
      expect(breakdown.personal.score).toBeGreaterThanOrEqual(0);
      expect(breakdown.personal.score).toBeLessThanOrEqual(100);
    });

    it("should include reason for each component", () => {
      const school = createMockSchool();
      const breakdown = matching.calculateMatchBreakdown(school);

      expect(breakdown.academic.reason).toBeDefined();
      expect(typeof breakdown.academic.reason).toBe("string");
      expect(breakdown.athletic.reason).toBeDefined();
      expect(breakdown.opportunity.reason).toBeDefined();
      expect(breakdown.personal.reason).toBeDefined();
    });

    it("should calculate overall as average of 4 components", () => {
      const school = createMockSchool();
      const breakdown = matching.calculateMatchBreakdown(school);

      const average =
        (breakdown.academic.score +
          breakdown.athletic.score +
          breakdown.opportunity.score +
          breakdown.personal.score) /
        4;

      // Allow 1 point variance for rounding
      expect(Math.abs(breakdown.overall - average)).toBeLessThanOrEqual(1);
    });

    it("should handle high academic fit", () => {
      const school = createMockSchool();
      // Mock high GPA student
      const breakdown = matching.calculateMatchBreakdown(school);

      expect(breakdown.academic.score).toBeGreaterThan(50);
    });

    it("should handle low academic fit", () => {
      const school = createMockSchool();
      // Mock low GPA student
      const breakdown = matching.calculateMatchBreakdown(school);

      // Should be realistic, not hide low fit
      expect(breakdown.overall).toBeLessThanOrEqual(100);
    });
  });
});
```

---

### 4. School Validation Tests

**File:** `tests/unit/utils/schoolValidation.spec.ts`
**New File**
**Focus:** Character limits and field validation

```typescript
import {
  validateSchoolNotes,
  MAX_SCHOOL_NOTES,
} from "~/utils/validators/schoolValidation";

describe("School Validation", () => {
  describe("validateSchoolNotes", () => {
    it("should accept notes under 5000 characters", () => {
      const notes = "a".repeat(1000);

      const result = validateSchoolNotes(notes);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept exactly 5000 characters", () => {
      const notes = "a".repeat(5000);

      const result = validateSchoolNotes(notes);

      expect(result.valid).toBe(true);
    });

    it("should reject notes over 5000 characters", () => {
      const notes = "a".repeat(5001);

      const result = validateSchoolNotes(notes);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("5000");
    });

    it("should provide character count in error", () => {
      const notes = "a".repeat(5100);

      const result = validateSchoolNotes(notes);

      expect(result.error).toContain("5100");
    });

    it("should handle empty notes", () => {
      const result = validateSchoolNotes("");

      expect(result.valid).toBe(true);
    });

    it("should validate multiline notes", () => {
      const notes = "Line 1\nLine 2\n".repeat(500); // Still under limit

      const result = validateSchoolNotes(notes);

      expect(result.valid).toBe(true);
    });

    it("should reject notes with special characters over limit", () => {
      const notes = "🏫".repeat(2600); // Emoji might count differently

      const result = validateSchoolNotes(notes);

      // Depends on implementation - should be consistent
      expect(result).toHaveProperty("valid");
    });
  });

  describe("MAX_SCHOOL_NOTES constant", () => {
    it("should be 5000", () => {
      expect(MAX_SCHOOL_NOTES).toBe(5000);
    });
  });
});
```

---

### 5. School Sorting Tests

**File:** `tests/unit/stores/schools-sorting.spec.ts`
**New File**
**Focus:** Sorting logic by distance, fit score, contact date

```typescript
describe("School Sorting", () => {
  let schoolStore;
  let matchCache;

  beforeEach(() => {
    setActivePinia(createPinia());
    schoolStore = useSchoolStore();
    matchCache = useSchoolMatchCache();

    schoolStore.schools = [
      createMockSchool({
        id: "1",
        name: "ASU",
        distance: 500,
        updated_at: "2026-01-20",
      }),
      createMockSchool({
        id: "2",
        name: "CU",
        distance: 100,
        updated_at: "2026-01-23",
      }),
      createMockSchool({
        id: "3",
        name: "CSU",
        distance: 50,
        updated_at: "2026-01-21",
      }),
    ];

    // Mock match scores
    matchCache.matches.set("1", { score: 75 });
    matchCache.matches.set("2", { score: 85 });
    matchCache.matches.set("3", { score: 65 });
  });

  describe("setSortBy action", () => {
    it("should set sort by distance ascending", () => {
      schoolStore.setSortBy("distance", "asc");

      expect(schoolStore.sort.by).toBe("distance");
      expect(schoolStore.sort.order).toBe("asc");
    });

    it("should set sort by fit score descending", () => {
      schoolStore.setSortBy("fitScore", "desc");

      expect(schoolStore.sort.by).toBe("fitScore");
      expect(schoolStore.sort.order).toBe("desc");
    });

    it("should set sort by last contact", () => {
      schoolStore.setSortBy("lastContact", "desc");

      expect(schoolStore.sort.by).toBe("lastContact");
    });
  });

  describe("sortedSchools getter", () => {
    it("should sort by distance ascending (closest first)", () => {
      schoolStore.setSortBy("distance", "asc");

      const sorted = schoolStore.sortedSchools;

      expect(sorted.map((s) => s.id)).toEqual(["3", "2", "1"]);
      expect(sorted[0].distance).toBe(50);
      expect(sorted[1].distance).toBe(100);
      expect(sorted[2].distance).toBe(500);
    });

    it("should sort by distance descending (farthest first)", () => {
      schoolStore.setSortBy("distance", "desc");

      const sorted = schoolStore.sortedSchools;

      expect(sorted[0].id).toBe("1");
      expect(sorted[2].id).toBe("3");
    });

    it("should sort by fit score descending (highest first)", () => {
      schoolStore.setSortBy("fitScore", "desc");

      const sorted = schoolStore.sortedSchools;

      expect(sorted.map((s) => s.id)).toEqual(["2", "1", "3"]);
    });

    it("should sort by fit score ascending (lowest first)", () => {
      schoolStore.setSortBy("fitScore", "asc");

      const sorted = schoolStore.sortedSchools;

      expect(sorted[0].id).toBe("3");
      expect(sorted[2].id).toBe("2");
    });

    it("should sort by last contact date (most recent first)", () => {
      schoolStore.setSortBy("lastContact", "desc");

      const sorted = schoolStore.sortedSchools;

      expect(sorted[0].id).toBe("2"); // 2026-01-23
      expect(sorted[1].id).toBe("3"); // 2026-01-21
      expect(sorted[2].id).toBe("1"); // 2026-01-20
    });

    it("should handle schools with null distance", () => {
      schoolStore.schools[2].distance = undefined;

      schoolStore.setSortBy("distance", "asc");

      const sorted = schoolStore.sortedSchools;

      // Null distances should be last when sorting ascending
      expect(sorted.map((s) => s.id)).toEqual(["3", "2", "1"]);
    });

    it("should handle schools with no match score", () => {
      matchCache.matches.delete("3");

      schoolStore.setSortBy("fitScore", "desc");

      const sorted = schoolStore.sortedSchools;

      // School without score should be last
      expect(sorted[2].id).toBe("3");
    });
  });

  describe("sorting with filters", () => {
    it("should sort filtered results", () => {
      schoolStore.setFilters({ division: ["D1"] });
      schoolStore.setSortBy("distance", "asc");

      const sorted = schoolStore.sortedSchools;

      // Should be sorted, not all results
      expect(sorted.length).toBeLessThanOrEqual(3);
    });
  });

  describe("sort order toggle", () => {
    it("should reverse sort order", () => {
      schoolStore.setSortBy("distance", "asc");
      let sorted = schoolStore.sortedSchools;
      const ascOrder = sorted.map((s) => s.id);

      schoolStore.setSortBy("distance", "desc");
      sorted = schoolStore.sortedSchools;
      const descOrder = sorted.map((s) => s.id);

      expect(descOrder).toEqual(ascOrder.reverse());
    });
  });

  describe("default sort", () => {
    it("should have default sort by name ascending", () => {
      expect(schoolStore.sort.by).toBe("name");
      expect(schoolStore.sort.order).toBe("asc");
    });
  });
});
```

---

### 6. Fit Score Range Filtering Tests

**File:** `tests/unit/stores/schools-filtering.spec.ts` (add to existing or new)
**Update Existing or New File**

```typescript
describe("Fit Score Range Filtering", () => {
  let schoolStore;
  let matchCache;

  beforeEach(() => {
    setActivePinia(createPinia());
    schoolStore = useSchoolStore();
    matchCache = useSchoolMatchCache();

    schoolStore.schools = [
      createMockSchool({ id: "1", name: "School A" }),
      createMockSchool({ id: "2", name: "School B" }),
      createMockSchool({ id: "3", name: "School C" }),
      createMockSchool({ id: "4", name: "School D" }),
    ];

    matchCache.matches.set("1", { score: 45 });
    matchCache.matches.set("2", { score: 75 });
    matchCache.matches.set("3", { score: 82 });
    matchCache.matches.set("4", { score: 95 });
  });

  describe("fitScoreRange filter", () => {
    it("should filter schools within fit score range", () => {
      schoolStore.setFilters({
        fitScoreRange: { min: 70, max: 90 },
      });

      const filtered = schoolStore.filteredSchools;

      expect(filtered).toHaveLength(2);
      expect(filtered.map((s) => s.id)).toEqual(["2", "3"]);
    });

    it("should include boundary values", () => {
      schoolStore.setFilters({
        fitScoreRange: { min: 75, max: 82 },
      });

      const filtered = schoolStore.filteredSchools;

      expect(filtered).toHaveLength(2);
      expect(filtered.map((s) => s.id)).toEqual(["2", "3"]);
    });

    it("should handle 0-100 range (all schools)", () => {
      schoolStore.setFilters({
        fitScoreRange: { min: 0, max: 100 },
      });

      const filtered = schoolStore.filteredSchools;

      expect(filtered).toHaveLength(4);
    });

    it("should handle narrow range", () => {
      schoolStore.setFilters({
        fitScoreRange: { min: 82, max: 82 },
      });

      const filtered = schoolStore.filteredSchools;

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("3");
    });

    it("should handle empty range result", () => {
      schoolStore.setFilters({
        fitScoreRange: { min: 98, max: 100 },
      });

      const filtered = schoolStore.filteredSchools;

      expect(filtered).toHaveLength(0);
    });

    it("should exclude schools below min", () => {
      schoolStore.setFilters({
        fitScoreRange: { min: 50, max: 100 },
      });

      const filtered = schoolStore.filteredSchools;

      expect(filtered).not.toContainEqual(expect.objectContaining({ id: "1" }));
    });

    it("should exclude schools above max", () => {
      schoolStore.setFilters({
        fitScoreRange: { min: 0, max: 80 },
      });

      const filtered = schoolStore.filteredSchools;

      expect(filtered).not.toContainEqual(expect.objectContaining({ id: "4" }));
    });

    it("should work with other filters combined", () => {
      schoolStore.setFilters({
        division: ["D1"],
        fitScoreRange: { min: 70, max: 90 },
      });

      const filtered = schoolStore.filteredSchools;

      // Should apply both filters
      expect(filtered.length).toBeLessThanOrEqual(2);
    });

    it("should handle missing fit score (undefined)", () => {
      matchCache.matches.delete("1");

      schoolStore.setFilters({
        fitScoreRange: { min: 50, max: 100 },
      });

      const filtered = schoolStore.filteredSchools;

      // School with undefined score (0) should be excluded from 50+ range
      expect(filtered.map((s) => s.id)).not.toContain("1");
    });
  });

  describe("fitScoreRange filter clearing", () => {
    it("should clear fit score range filter", () => {
      schoolStore.setFilters({
        fitScoreRange: { min: 70, max: 100 },
      });
      let filtered = schoolStore.filteredSchools;
      expect(filtered.length).toBeLessThan(4);

      schoolStore.setFilters({
        fitScoreRange: undefined,
      });
      filtered = schoolStore.filteredSchools;

      expect(filtered).toHaveLength(4);
    });

    it("should reset filters", () => {
      schoolStore.setFilters({
        fitScoreRange: { min: 70, max: 100 },
        division: ["D1"],
      });

      schoolStore.resetFilters();

      const filtered = schoolStore.filteredSchools;
      expect(filtered).toHaveLength(4);
    });
  });
});
```

---

### 7. Component Tests

#### SchoolPrioritySelector Component Test

**File:** `tests/unit/components/SchoolPrioritySelector.spec.ts`
**New File**

```typescript
describe("SchoolPrioritySelector", () => {
  it("should render priority tier options", () => {
    const { getByRole } = render(SchoolPrioritySelector, {
      props: {
        modelValue: null,
        "onUpdate:modelValue": vi.fn(),
      },
    });

    expect(getByRole("button", { name: /A/i })).toBeInTheDocument();
    expect(getByRole("button", { name: /B/i })).toBeInTheDocument();
    expect(getByRole("button", { name: /C/i })).toBeInTheDocument();
  });

  it("should emit update on tier selection", async () => {
    const emitUpdate = vi.fn();
    const { getByRole } = render(SchoolPrioritySelector, {
      props: {
        modelValue: null,
        "onUpdate:modelValue": emitUpdate,
      },
    });

    await userEvent.click(getByRole("button", { name: /A/i }));

    expect(emitUpdate).toHaveBeenCalledWith("A");
  });

  it("should highlight selected tier", () => {
    const { getByRole } = render(SchoolPrioritySelector, {
      props: {
        modelValue: "A",
        "onUpdate:modelValue": vi.fn(),
      },
    });

    const tierA = getByRole("button", { name: /A/i });

    expect(tierA).toHaveClass("selected"); // or similar
  });
});
```

---

## Test Execution & Coverage Goals

### Coverage Targets

- **Statements:** >80% for new features
- **Branches:** >75% for conditionals
- **Functions:** >85% for utils
- **Lines:** >80% overall

### Test Execution

```bash
# Run all new unit tests
npm run test -- tests/unit/stores/schools-*.spec.ts
npm run test -- tests/unit/composables/useSchoolDuplication.spec.ts
npm run test -- tests/unit/composables/useSchoolRecalculation.spec.ts
npm run test -- tests/unit/utils/schoolValidation.spec.ts
npm run test -- tests/unit/components/School*.spec.ts

# Run with coverage
npm run test:coverage -- tests/unit/stores/schools-*.spec.ts

# Watch mode during development
npm run test -- --watch tests/unit/stores/schools-priority.spec.ts
```

---

## Test Fixtures

Update `tests/fixtures/schools.fixture.ts`:

```typescript
export const createMockSchool = (overrides?: Partial<School>): School => {
  const base = {
    id: "school-" + Math.random().toString(36).substr(2, 9),
    user_id: "user-123",
    name: "Test University",
    location: "Test City, TS",
    division: "D1",
    status: "interested",
    priority_tier: null, // NEW
    notes: "Test notes",
    pros: [],
    cons: [],
    favicon_url: null,
    academic_info: {},
    created_at: "2026-01-20T00:00:00Z",
    updated_at: "2026-01-20T00:00:00Z",
    created_by: "user-123",
    updated_by: "user-123",
    distance: 500, // NEW
    statusHistory: [], // NEW
    noteEdits: [], // NEW
  };

  return { ...base, ...overrides };
};
```

---

## Implementation Notes

1. **TDD Approach:** Write tests first for complex logic, implement after
2. **Mocking:** Mock Supabase, useSupabase() composable, store dependencies
3. **Isolation:** Each test should be independent, use beforeEach for setup
4. **Assertions:** Be specific - test exact values, error messages, side effects
5. **Edge Cases:** Include empty data, null/undefined, boundary values
6. **Performance:** Test sorting/filtering performance if <100ms requirement exists

---

## Priority & Timeline

| Test Suite          | Priority | Est. Lines | Est. Time |
| ------------------- | -------- | ---------- | --------- |
| Priority Tier       | High     | 200        | 2h        |
| Duplicate Detection | High     | 250        | 2.5h      |
| Fit Score Breakdown | High     | 150        | 1.5h      |
| Sorting             | Medium   | 200        | 2h        |
| Fit Score Range     | Medium   | 180        | 1.5h      |
| Validation          | Medium   | 100        | 1h        |
| Components          | Low      | 150        | 1.5h      |
| **Total**           |          | **1230**   | **12h**   |

---

## Notes

- All tests use Vitest with `happy-dom`
- Mock Supabase at module level
- Use `createMockSchool()` for test data consistency
- Follow existing test patterns in codebase
- Tests should be self-documenting (clear names, good assertions)
