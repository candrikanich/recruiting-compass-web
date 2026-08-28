import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import RecommendedSchools from "~/components/School/RecommendedSchools.vue";
import type { SchoolRecommendation } from "~/types/schoolRecommendations";

const item: SchoolRecommendation = {
  catalogKey: "ohio state university",
  name: "Ohio State University",
  division: "D1",
  conference: "Big Ten",
  state: "OH",
  website: "osu.edu",
  athleticsUrl: null,
  score: 70,
  reasons: ["In OH", "Matches academic range"],
};

describe("RecommendedSchools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const stubs = {
    DesignSystemBadge: {
      template: "<span><slot /></span>",
    },
    DesignSystemButton: {
      props: ["loading", "disabled"],
      template:
        '<button :disabled="disabled || loading" @click="$emit(\'click\', $event)"><slot /></button>',
    },
  };

  it("renders recommended school names and reasons", () => {
    const wrapper = mount(RecommendedSchools, {
      props: { items: [item] },
      global: { stubs },
    });
    expect(wrapper.get('[data-testid="recommended-schools"]').text()).toContain(
      "Ohio State University",
    );
    expect(wrapper.text()).toContain("In OH");
    expect(wrapper.text()).toContain("Add to list");
  });

  it("emits add and dismiss for the school", async () => {
    const wrapper = mount(RecommendedSchools, {
      props: { items: [item] },
      global: { stubs },
    });
    const buttons = wrapper.findAll("button");
    await buttons[0]?.trigger("click");
    await buttons[1]?.trigger("click");
    expect(wrapper.emitted("add")?.[0]?.[0]).toEqual(item);
    expect(wrapper.emitted("dismiss")?.[0]?.[0]).toEqual(item);
  });

  it("shows a loading status while recommendations fetch", () => {
    const wrapper = mount(RecommendedSchools, {
      props: { items: [], loading: true },
      global: { stubs },
    });
    expect(wrapper.get("[role='status']").text()).toContain(
      "Finding schools for you",
    );
  });

  it("surfaces an error", () => {
    const wrapper = mount(RecommendedSchools, {
      props: { items: [], error: "Could not load recommended schools." },
      global: { stubs },
    });
    expect(wrapper.get("[role='alert']").text()).toContain(
      "Could not load recommended schools.",
    );
  });
});
