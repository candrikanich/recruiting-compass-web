import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HelpBadge from "~/components/Help/HelpBadge.vue";

describe("HelpBadge", () => {
  it("renders 'New' label with blue styling", () => {
    const wrapper = mount(HelpBadge, { props: { type: "new" } });
    expect(wrapper.text()).toBe("New");
    expect(wrapper.classes()).toContain("bg-blue-100");
    expect(wrapper.classes()).toContain("text-blue-700");
  });

  it("renders 'Required' label with red styling", () => {
    const wrapper = mount(HelpBadge, { props: { type: "required" } });
    expect(wrapper.text()).toBe("Required");
    expect(wrapper.classes()).toContain("bg-red-100");
    expect(wrapper.classes()).toContain("text-red-700");
  });

  it("renders 'Optional' label with gray styling", () => {
    const wrapper = mount(HelpBadge, { props: { type: "optional" } });
    expect(wrapper.text()).toBe("Optional");
    expect(wrapper.classes()).toContain("bg-gray-100");
    expect(wrapper.classes()).toContain("text-gray-600");
  });
});
