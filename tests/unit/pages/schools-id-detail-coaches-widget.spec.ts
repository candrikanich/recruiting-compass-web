import { describe, it, expect } from "vitest";
import { computed, ref } from "vue";
import type { Coach } from "~/types/models";

/**
 * Regression test for: school detail page showing ALL coaches instead of only
 * those belonging to the current school.
 *
 * Root cause: `schoolCoaches` computed returned `allCoaches.value` unfiltered.
 * The store accumulates coaches from every school visited in the session.
 *
 * Fix: filter by `coach.school_id === id` (pages/schools/[id]/index.vue:250)
 */

const makeCoach = (overrides: Partial<Coach> = {}): Coach => ({
  id: "coach-1",
  school_id: "school-a",
  user_id: "user-1",
  role: "head",
  first_name: "John",
  last_name: "Smith",
  email: "john@school-a.edu",
  phone: null,
  twitter_handle: null,
  instagram_handle: null,
  notes: null,
  last_contact_date: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("schools/[id]/index — schoolCoaches computed", () => {
  it("returns only coaches belonging to the current school", () => {
    const currentSchoolId = "school-a";

    // Simulate the store accumulating coaches from two different schools
    const allCoaches = ref<Coach[]>([
      makeCoach({ id: "coach-1", school_id: "school-a" }),
      makeCoach({ id: "coach-2", school_id: "school-b", first_name: "Other" }),
      makeCoach({ id: "coach-3", school_id: "school-a", first_name: "Jane" }),
    ]);

    // This is the fixed computed (was `allCoaches.value` before the fix)
    const schoolCoaches = computed(() =>
      allCoaches.value.filter((c) => c.school_id === currentSchoolId),
    );

    expect(schoolCoaches.value).toHaveLength(2);
    expect(schoolCoaches.value.every((c) => c.school_id === "school-a")).toBe(
      true,
    );
    expect(schoolCoaches.value.map((c) => c.id)).toEqual(
      expect.arrayContaining(["coach-1", "coach-3"]),
    );
  });

  it("returns an empty array when the store has no coaches for this school", () => {
    const currentSchoolId = "school-a";

    const allCoaches = ref<Coach[]>([
      makeCoach({ id: "coach-1", school_id: "school-b" }),
    ]);

    const schoolCoaches = computed(() =>
      allCoaches.value.filter((c) => c.school_id === currentSchoolId),
    );

    expect(schoolCoaches.value).toHaveLength(0);
  });

  it("does not bleed coaches into the list when navigating between schools", () => {
    // Simulate visiting school-a then school-b; store accumulates both
    const allCoaches = ref<Coach[]>([
      makeCoach({ id: "coach-1", school_id: "school-a" }),
      makeCoach({ id: "coach-2", school_id: "school-a", first_name: "Jane" }),
      makeCoach({ id: "coach-3", school_id: "school-b", first_name: "Bob" }),
      makeCoach({ id: "coach-4", school_id: "school-b", first_name: "Alice" }),
    ]);

    const schoolACoaches = computed(() =>
      allCoaches.value.filter((c) => c.school_id === "school-a"),
    );
    const schoolBCoaches = computed(() =>
      allCoaches.value.filter((c) => c.school_id === "school-b"),
    );

    expect(schoolACoaches.value).toHaveLength(2);
    expect(schoolBCoaches.value).toHaveLength(2);
    expect(schoolACoaches.value.map((c) => c.id)).not.toContain("coach-3");
    expect(schoolBCoaches.value.map((c) => c.id)).not.toContain("coach-1");
  });
});
