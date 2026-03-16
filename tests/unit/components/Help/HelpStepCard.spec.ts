import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HelpStepCard from "~/components/Help/HelpStepCard.vue";

describe("HelpStepCard", () => {
  it("renders step number and title", () => {
    const wrapper = mount(HelpStepCard, {
      props: { step: 2, title: "Fill in your details" },
    });
    expect(wrapper.text()).toContain("2");
    expect(wrapper.text()).toContain("Fill in your details");
  });

  it("renders slot content as description", () => {
    const wrapper = mount(HelpStepCard, {
      props: { step: 1, title: "Start here" },
      slots: { default: "Open the settings page." },
    });
    expect(wrapper.text()).toContain("Open the settings page.");
  });

  it("shows connector line when last is false (default)", () => {
    const wrapper = mount(HelpStepCard, {
      props: { step: 1, title: "First step" },
    });
    // connector div exists (v-if="!last" is true when last is undefined)
    expect(wrapper.html()).toContain("w-px");
  });

  it("hides connector line when last is true", () => {
    const wrapper = mount(HelpStepCard, {
      props: { step: 3, title: "Last step", last: true },
    });
    expect(wrapper.html()).not.toContain("w-px");
  });
});
