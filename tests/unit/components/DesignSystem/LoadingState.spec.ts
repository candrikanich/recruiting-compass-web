import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import LoadingState from "~/components/DesignSystem/LoadingState.vue";

describe("DesignSystemLoadingState", () => {
  it("announces loading politely", () => {
    const wrapper = mount(LoadingState, {
      props: { message: "Loading schools..." },
    });
    const root = wrapper.get('[role="status"]');
    expect(root.attributes("aria-live")).toBe("polite");
    expect(root.attributes("aria-busy")).toBe("true");
    expect(wrapper.text()).toContain("Loading schools...");
  });

  it("renders skeleton and shimmer variants without changing the announcement", () => {
    const skeleton = mount(LoadingState, { props: { variant: "skeleton" } });
    expect(skeleton.get('[role="status"]').text()).toContain("Loading...");

    const shimmer = mount(LoadingState, { props: { variant: "shimmer" } });
    expect(shimmer.find(".shimmer").exists()).toBe(true);
  });

  it("renders the reasoning variant with three staggered dots", () => {
    const wrapper = mount(LoadingState, {
      props: { variant: "reasoning", message: "Analyzing fit..." },
    });
    expect(wrapper.findAll(".reasoning-dot")).toHaveLength(3);
    expect(wrapper.text()).toContain("Analyzing fit...");
  });

  it("renders inline without the full-page centering wrapper", () => {
    const wrapper = mount(LoadingState, {
      props: { variant: "reasoning", inline: true },
    });
    const root = wrapper.get('[role="status"]');
    expect(root.classes()).not.toContain("py-12");
    expect(root.classes()).toContain("inline-flex");
  });
});
