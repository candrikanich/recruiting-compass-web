import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ParentNoAthleteEmptyState from "~/components/Dashboard/ParentNoAthleteEmptyState.vue";

const nuxtLinkStub = { template: '<a :href="to"><slot /></a>', props: ["to"] };

describe("ParentNoAthleteEmptyState", () => {
  it("renders the heading", () => {
    const wrapper = mount(ParentNoAthleteEmptyState, {
      global: { stubs: { NuxtLink: nuxtLinkStub } },
    });
    expect(wrapper.text()).toContain("Your athlete isn't connected yet");
  });

  it("renders the explanation", () => {
    const wrapper = mount(ParentNoAthleteEmptyState, {
      global: { stubs: { NuxtLink: nuxtLinkStub } },
    });
    expect(wrapper.text()).toContain("Once they accept your invite");
  });

  it("has an Invite Athlete link to family management", () => {
    const wrapper = mount(ParentNoAthleteEmptyState, {
      global: { stubs: { NuxtLink: nuxtLinkStub } },
    });
    const link = wrapper.find("a");
    expect(link.attributes("href")).toBe("/settings/family-management");
    expect(link.text()).toContain("Invite Athlete");
  });
});
