import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HelpCallout from "~/components/Help/HelpCallout.vue";

describe("HelpCallout", () => {
  it("renders slot content", () => {
    const wrapper = mount(HelpCallout, {
      props: { type: "tip" },
      slots: { default: "You can add up to 50 schools." },
    });
    expect(wrapper.text()).toContain("You can add up to 50 schools.");
  });

  it("applies green styling for tip", () => {
    const wrapper = mount(HelpCallout, { props: { type: "tip" } });
    expect(wrapper.classes()).toContain("bg-green-50");
    expect(wrapper.classes()).toContain("border-green-200");
  });

  it("applies blue styling for info", () => {
    const wrapper = mount(HelpCallout, { props: { type: "info" } });
    expect(wrapper.classes()).toContain("bg-blue-50");
    expect(wrapper.classes()).toContain("border-blue-200");
  });

  it("applies amber styling for warning", () => {
    const wrapper = mount(HelpCallout, { props: { type: "warning" } });
    expect(wrapper.classes()).toContain("bg-amber-50");
    expect(wrapper.classes()).toContain("border-amber-200");
  });

  it("applies red styling for important", () => {
    const wrapper = mount(HelpCallout, { props: { type: "important" } });
    expect(wrapper.classes()).toContain("bg-red-50");
    expect(wrapper.classes()).toContain("border-red-200");
  });
});
