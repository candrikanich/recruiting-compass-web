// tests/unit/composables/useSchoolStats.spec.ts
import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useSchoolStats } from "~/composables/useSchoolStats";
import type { School, Interaction, Event } from "~/types/models";

const noInteractions = () => ref<Interaction[]>([]);
const noEvents = () => ref<Event[]>([]);

const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString();
};
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString();
};

describe("useSchoolStats", () => {
  it("calculates total schools correctly", () => {
    const schools = ref<School[]>([
      { id: "1", name: "School 1", family_unit_id: "f1" } as School,
      { id: "2", name: "School 2", family_unit_id: "f1" } as School,
    ]);

    const { stats } = useSchoolStats(schools, noInteractions(), noEvents());

    expect(stats.value[0].label).toBe("Total Schools");
    expect(stats.value[0].value).toBe(2);
  });

  it("counts favorites accurately", () => {
    const schools = ref<School[]>([
      {
        id: "1",
        name: "School 1",
        is_favorite: true,
        family_unit_id: "f1",
      } as School,
      {
        id: "2",
        name: "School 2",
        is_favorite: false,
        family_unit_id: "f1",
      } as School,
      {
        id: "3",
        name: "School 3",
        is_favorite: true,
        family_unit_id: "f1",
      } as School,
    ]);

    const { stats } = useSchoolStats(schools, noInteractions(), noEvents());

    expect(stats.value[1].label).toBe("Favorites");
    expect(stats.value[1].value).toBe(2);
  });

  describe("Visited (real visits, not status)", () => {
    const schools = () =>
      ref<School[]>([
        {
          id: "1",
          name: "S1",
          status: "official_visit_scheduled",
          family_unit_id: "f1",
        } as School,
        {
          id: "2",
          name: "S2",
          status: "committed",
          family_unit_id: "f1",
        } as School,
        {
          id: "3",
          name: "S3",
          status: "interested",
          family_unit_id: "f1",
        } as School,
      ]);

    it("does NOT count status alone", () => {
      const { stats } = useSchoolStats(schools(), noInteractions(), noEvents());
      expect(stats.value[2].label).toBe("Visited");
      expect(stats.value[2].value).toBe(0);
    });

    it("counts a school with a visit-type interaction", () => {
      const interactions = ref<Interaction[]>([
        { id: "i1", school_id: "2", type: "in_person_visit" } as Interaction,
      ]);
      const { stats } = useSchoolStats(schools(), interactions, noEvents());
      expect(stats.value[2].value).toBe(1);
    });

    it("counts official/unofficial visit interactions but not virtual meetings", () => {
      const interactions = ref<Interaction[]>([
        { id: "i1", school_id: "1", type: "official_visit" } as Interaction,
        { id: "i2", school_id: "2", type: "unofficial_visit" } as Interaction,
        { id: "i3", school_id: "3", type: "virtual_meeting" } as Interaction,
      ]);
      const { stats } = useSchoolStats(schools(), interactions, noEvents());
      expect(stats.value[2].value).toBe(2);
    });

    it("counts a past-dated visit event but not a future one", () => {
      const events = ref<Event[]>([
        {
          id: "e1",
          school_id: "1",
          type: "official_visit",
          start_date: yesterday(),
        } as Event,
        {
          id: "e2",
          school_id: "2",
          type: "unofficial_visit",
          start_date: tomorrow(),
        } as Event,
      ]);
      const { stats } = useSchoolStats(schools(), noInteractions(), events);
      expect(stats.value[2].value).toBe(1);
    });

    it("dedupes a school with both an interaction and an event", () => {
      const interactions = ref<Interaction[]>([
        { id: "i1", school_id: "1", type: "in_person_visit" } as Interaction,
      ]);
      const events = ref<Event[]>([
        {
          id: "e1",
          school_id: "1",
          type: "official_visit",
          start_date: yesterday(),
        } as Event,
      ]);
      const { stats } = useSchoolStats(schools(), interactions, events);
      expect(stats.value[2].value).toBe(1);
    });
  });

  it("counts contacted schools by logged interactions, not status", () => {
    const schools = ref<School[]>([
      // Has an interaction → counts, regardless of funnel stage.
      {
        id: "1",
        name: "S1",
        status: "committed",
        family_unit_id: "f1",
      } as School,
      // Sits at `contacted` status but has NO interaction → does NOT count.
      {
        id: "2",
        name: "S2",
        status: "contacted",
        family_unit_id: "f1",
      } as School,
    ]);
    const interactions = ref<Interaction[]>([
      { id: "i1", school_id: "1", type: "email" } as Interaction,
    ]);
    const { stats } = useSchoolStats(schools, interactions, noEvents());
    expect(stats.value[3].label).toBe("Contacted");
    expect(stats.value[3].value).toBe(1);
  });

  it("handles empty schools array", () => {
    const schools = ref<School[]>([]);
    const { stats } = useSchoolStats(schools, noInteractions(), noEvents());
    expect(stats.value[0].value).toBe(0);
    expect(stats.value[1].value).toBe(0);
    expect(stats.value[2].value).toBe(0);
  });
});
