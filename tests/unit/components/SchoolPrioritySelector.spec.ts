import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SchoolPrioritySelector from "~/components/SchoolPrioritySelector.vue";

describe("SchoolPrioritySelector", () => {
  it("should render priority tier buttons", () => {
    const wrapper = mount(SchoolPrioritySelector, {
      props: { modelValue: null },
    });

    expect(wrapper.find('[data-testid="priority-tier-a"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="priority-tier-b"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="priority-tier-c"]').exists()).toBe(true);
  });

  it("should emit update when tier A is clicked", async () => {
    const wrapper = mount(SchoolPrioritySelector, {
      props: { modelValue: null },
    });

    await wrapper.find('[data-testid="priority-tier-a"]').trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["A"]);
  });

  it("should emit update when tier B is clicked", async () => {
    const wrapper = mount(SchoolPrioritySelector, {
      props: { modelValue: null },
    });

    await wrapper.find('[data-testid="priority-tier-b"]').trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["B"]);
  });

  it("should emit update when tier C is clicked", async () => {
    const wrapper = mount(SchoolPrioritySelector, {
      props: { modelValue: null },
    });

    await wrapper.find('[data-testid="priority-tier-c"]').trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["C"]);
  });

  it("should highlight selected tier", () => {
    const wrapper = mount(SchoolPrioritySelector, {
      props: { modelValue: "A" },
    });

    const tierAButton = wrapper.find('[data-testid="priority-tier-a"]');
    expect(tierAButton.classes()).toContain("bg-blue-600");
    expect(tierAButton.classes()).toContain("text-white");
  });

  it("should not highlight unselected tiers", () => {
    const wrapper = mount(SchoolPrioritySelector, {
      props: { modelValue: "A" },
    });

    const tierBButton = wrapper.find('[data-testid="priority-tier-b"]');
    expect(tierBButton.classes()).toContain("bg-gray-200");
    expect(tierBButton.classes()).not.toContain("bg-blue-600");
  });

  it("should show clear button when tier is selected", () => {
    const wrapper = mount(SchoolPrioritySelector, {
      props: { modelValue: "A" },
    });

    expect(wrapper.find('[data-testid="priority-tier-clear"]').exists()).toBe(
      true,
    );
  });

  it("should not show clear button when no tier is selected", () => {
    const wrapper = mount(SchoolPrioritySelector, {
      props: { modelValue: null },
    });

    expect(wrapper.find('[data-testid="priority-tier-clear"]').exists()).toBe(
      false,
    );
  });

  it("should emit null when clear button is clicked", async () => {
    const wrapper = mount(SchoolPrioritySelector, {
      props: { modelValue: "A" },
    });

    await wrapper.find('[data-testid="priority-tier-clear"]').trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([null]);
  });

  it("should toggle tier off when clicking selected tier", async () => {
    const wrapper = mount(SchoolPrioritySelector, {
      props: { modelValue: "A" },
    });

    await wrapper.find('[data-testid="priority-tier-a"]').trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([null]);
  });

  it("should display tier label when selected", () => {
    const wrapper = mount(SchoolPrioritySelector, {
      props: { modelValue: "A" },
    });

    expect(wrapper.text()).toContain("Top Choice");
  });

  it("should display correct label for B tier", () => {
    const wrapper = mount(SchoolPrioritySelector, {
      props: { modelValue: "B" },
    });

    expect(wrapper.text()).toContain("Strong Interest");
  });

  it("should display correct label for C tier", () => {
    const wrapper = mount(SchoolPrioritySelector, {
      props: { modelValue: "C" },
    });

    expect(wrapper.text()).toContain("Fallback");
  });

  it("should not display label when no tier is selected", () => {
    const wrapper = mount(SchoolPrioritySelector, {
      props: { modelValue: null },
    });

    expect(wrapper.text()).not.toContain("Top Choice");
    expect(wrapper.text()).not.toContain("Strong Interest");
    expect(wrapper.text()).not.toContain("Fallback");
  });

  it("should respond to prop changes", async () => {
    const wrapper = mount(SchoolPrioritySelector, {
      props: { modelValue: "A" },
    });

    expect(wrapper.find('[data-testid="priority-tier-a"]').classes()).toContain(
      "bg-blue-600",
    );

    await wrapper.setProps({ modelValue: "B" });

    expect(wrapper.find('[data-testid="priority-tier-b"]').classes()).toContain(
      "bg-blue-600",
    );
    expect(
      wrapper.find('[data-testid="priority-tier-a"]').classes(),
    ).not.toContain("bg-blue-600");
  });
});
