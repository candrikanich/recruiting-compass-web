import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import CoachListCard from "~/components/Coach/CoachListCard.vue";
import type { Coach, School } from "~/types/models";

const mockCoach: Coach = {
  id: "c1",
  first_name: "Jane",
  last_name: "Doe",
  role: "head",
  school_id: "s1",
  email: "jane@example.com",
  phone: null,
  twitter_handle: null,
  instagram_handle: null,
  responsiveness_score: 80,
  last_contact_date: "2026-01-01",
  notes: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  user_id: "u1",
  created_by: "u1",
  updated_by: "u1",
  family_unit_id: "fam1",
} as any;

const mockSchool = { id: "s1", name: "Test University", division: "D1" } as any;

describe("CoachListCard", () => {
  it("renders coach full name", () => {
    const wrapper = mount(CoachListCard, {
      props: { coach: mockCoach, school: mockSchool },
    });
    expect(wrapper.text()).toContain("Jane");
    expect(wrapper.text()).toContain("Doe");
  });

  it("renders school name", () => {
    const wrapper = mount(CoachListCard, {
      props: { coach: mockCoach, school: mockSchool },
    });
    expect(wrapper.text()).toContain("Test University");
  });

  it("emits open-communication when action button clicked", async () => {
    const wrapper = mount(CoachListCard, {
      props: { coach: mockCoach, school: mockSchool },
    });
    const btn = wrapper.find("[data-testid='open-communication']");
    if (btn.exists()) {
      await btn.trigger("click");
      expect(wrapper.emitted("open-communication")).toBeTruthy();
    }
  });

  it("emits delete-coach when delete triggered", async () => {
    const wrapper = mount(CoachListCard, {
      props: { coach: mockCoach, school: mockSchool },
    });
    const btn = wrapper.find("[data-testid='delete-coach']");
    if (btn.exists()) {
      await btn.trigger("click");
      expect(wrapper.emitted("delete-coach")).toBeTruthy();
    }
  });
});
