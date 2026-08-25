import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import CoachChannelActions from "~/components/Coach/detail/CoachChannelActions.vue";
import type { Coach } from "~/types/models";

const mockCoach: Coach = {
  id: "coach-1",
  role: "head",
  first_name: "Jane",
  last_name: "Smith",
  school_id: "school-1",
  email: "jane@example.com",
  phone: "555-1234",
  twitter_handle: "janesmith",
  instagram_handle: "jane.smith",
  notes: null,
  tags: [],
  source: null,
  last_contact_date: null,
};

describe("CoachChannelActions", () => {
  beforeEach(() => {
    vi.stubGlobal("open", vi.fn());
  });

  it("emits logInteraction when Log Interaction is clicked", async () => {
    const w = mount(CoachChannelActions, { props: { coach: mockCoach } });

    await w.get('[data-action="log-interaction"]').trigger("click");

    expect(w.emitted("logInteraction")).toBeTruthy();
  });

  it("emits openSocial with 'twitter' when the Twitter button is activated", async () => {
    const w = mount(CoachChannelActions, { props: { coach: mockCoach } });

    await w.get('[data-action="twitter"]').trigger("click");

    expect(w.emitted("openSocial")?.[0]).toEqual(["twitter"]);
  });

  it("emits openSocial with 'instagram' when the Instagram button is activated", async () => {
    const w = mount(CoachChannelActions, { props: { coach: mockCoach } });

    await w.get('[data-action="instagram"]').trigger("click");

    expect(w.emitted("openSocial")?.[0]).toEqual(["instagram"]);
  });
});
