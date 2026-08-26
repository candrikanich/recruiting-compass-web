import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CoachDetailHeader from "~/components/Coach/detail/CoachDetailHeader.vue";
import type { Coach } from "~/types/models";

const baseCoach: Coach = {
  id: "coach-1",
  school_id: "school-1",
  role: "head",
  first_name: "Jamie",
  last_name: "Rivera",
  email: null,
  phone: null,
  twitter_handle: null,
  instagram_handle: null,
  notes: null,
  tags: [],
  source: null,
  last_contact_date: null,
};

describe("CoachDetailHeader", () => {
  it("renders the coach name and a role · school subtitle", () => {
    const w = mount(CoachDetailHeader, {
      props: { coach: baseCoach, schoolName: "Wake Forest University" },
    });
    expect(w.text()).toContain("Jamie Rivera");
    expect(w.text()).toContain("Head Coach · Wake Forest University");
  });

  it("emits edit when Edit Profile is clicked", async () => {
    const w = mount(CoachDetailHeader, { props: { coach: baseCoach } });
    await w.get('[data-testid="coach-header-edit"]').trigger("click");
    expect(w.emitted("edit")).toBeTruthy();
  });

  it("emits delete when Delete Coach is clicked", async () => {
    const w = mount(CoachDetailHeader, { props: { coach: baseCoach } });
    await w.get('[data-testid="coach-header-delete"]').trigger("click");
    expect(w.emitted("delete")).toBeTruthy();
  });
});
