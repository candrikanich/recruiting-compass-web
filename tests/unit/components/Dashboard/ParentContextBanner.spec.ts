import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ParentContextBanner from "~/components/Dashboard/ParentContextBanner.vue";

describe("ParentContextBanner", () => {
  it("does not claim the athlete's data is read-only (family-shared profile, parents are full editors)", () => {
    const wrapper = mount(ParentContextBanner, {
      props: { isViewingAsParent: true, athleteName: "Jordan" },
    });

    expect(wrapper.text()).not.toMatch(/read-only/i);
  });

  it("stays hidden when not viewing as parent", () => {
    const wrapper = mount(ParentContextBanner, {
      props: { isViewingAsParent: false },
    });

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });
});
