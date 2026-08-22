import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useCoachPageFilters } from "~/composables/useCoachPageFilters";
import type { Coach, School } from "~/types/models";

const makeCoach = (overrides: Partial<Coach>): Coach =>
  ({
    id: overrides.id ?? "c1",
    first_name: "Test",
    last_name: "Coach",
    role: "head",
    school_id: "s1",
    last_contact_date: null,
    ...overrides,
  }) as Coach;

const daysAgoISO = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

describe("useCoachPageFilters — lastContact filter", () => {
  const schools = ref<School[]>([]);
  const sortBy = ref("name");

  it("excludes never-contacted coaches (null date) when filter active — iOS parity", () => {
    const coaches = ref<Coach[]>([
      makeCoach({ id: "recent", last_contact_date: daysAgoISO(2) }),
      makeCoach({ id: "old", last_contact_date: daysAgoISO(30) }),
      makeCoach({ id: "never", last_contact_date: null }),
    ]);

    const { filteredCoaches, handleFilterUpdate } = useCoachPageFilters(
      coaches,
      schools,
      sortBy,
    );

    handleFilterUpdate("lastContact", "7");

    const ids = filteredCoaches.value.map((c) => c.id);
    expect(ids).toEqual(["recent"]);
    expect(ids).not.toContain("never");
    expect(ids).not.toContain("old");
  });

  it("includes all coaches (incl. null dates) when filter inactive", () => {
    const coaches = ref<Coach[]>([
      makeCoach({ id: "a", last_contact_date: daysAgoISO(2) }),
      makeCoach({ id: "b", last_contact_date: null }),
    ]);

    const { filteredCoaches } = useCoachPageFilters(coaches, schools, sortBy);

    expect(filteredCoaches.value.map((c) => c.id).sort()).toEqual(["a", "b"]);
  });
});
