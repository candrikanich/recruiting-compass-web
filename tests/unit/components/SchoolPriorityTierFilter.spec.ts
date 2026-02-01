import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SchoolPriorityTierFilter from "~/components/SchoolPriorityTierFilter.vue";

describe("SchoolPriorityTierFilter", () => {
  it("should render all tier buttons", () => {
    const wrapper = mount(SchoolPriorityTierFilter, {
      props: { modelValue: null },
    });

    expect(wrapper.find('[data-testid="priority-filter-A"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="priority-filter-B"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="priority-filter-C"]').exists()).toBe(
      true,
    );
  });

  it("should emit update when tier A is clicked", async () => {
    const wrapper = mount(SchoolPriorityTierFilter, {
      props: { modelValue: null },
    });

    await wrapper.find('[data-testid="priority-filter-A"]').trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([["A"]]);
  });

  it("should allow selecting multiple tiers", async () => {
    const wrapper = mount(SchoolPriorityTierFilter, {
      props: { modelValue: ["A"] },
    });

    await wrapper.find('[data-testid="priority-filter-B"]').trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([["A", "B"]]);
  });

  it("should deselect tier when clicked again", async () => {
    const wrapper = mount(SchoolPriorityTierFilter, {
      props: { modelValue: ["A"] },
    });

    await wrapper.find('[data-testid="priority-filter-A"]').trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([null]);
  });

  it("should highlight selected tiers with correct colors", async () => {
    const wrapper = mount(SchoolPriorityTierFilter, {
      props: { modelValue: ["A", "B"] },
    });

    const tierABtn = wrapper.find('[data-testid="priority-filter-A"]');
    const tierBBtn = wrapper.find('[data-testid="priority-filter-B"]');
    const tierCBtn = wrapper.find('[data-testid="priority-filter-C"]');

    expect(tierABtn.classes()).toContain("bg-red-100");
    expect(tierBBtn.classes()).toContain("bg-amber-100");
    expect(tierCBtn.classes()).not.toContain("bg-slate-100");
    expect(tierCBtn.classes()).toContain("bg-slate-50");
  });

  it("should show clear button when tiers are selected", () => {
    const wrapper = mount(SchoolPriorityTierFilter, {
      props: { modelValue: ["A"] },
    });

    expect(wrapper.find('[data-testid="priority-filter-clear"]').exists()).toBe(
      true,
    );
  });

  it("should not show clear button when no tiers are selected", () => {
    const wrapper = mount(SchoolPriorityTierFilter, {
      props: { modelValue: null },
    });

    expect(wrapper.find('[data-testid="priority-filter-clear"]').exists()).toBe(
      false,
    );
  });

  it("should emit null when clear is clicked", async () => {
    const wrapper = mount(SchoolPriorityTierFilter, {
      props: { modelValue: ["A", "B"] },
    });

    await wrapper
      .find('[data-testid="priority-filter-clear"]')
      .trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([null]);
  });

  it("should display tier labels", () => {
    const wrapper = mount(SchoolPriorityTierFilter, {
      props: { modelValue: null },
    });

    expect(wrapper.text()).toContain("Top Choice");
    expect(wrapper.text()).toContain("Strong Interest");
    expect(wrapper.text()).toContain("Fallback");
  });

  it("should respond to prop changes", async () => {
    const wrapper = mount(SchoolPriorityTierFilter, {
      props: { modelValue: null },
    });

    expect(wrapper.find('[data-testid="priority-filter-clear"]').exists()).toBe(
      false,
    );

    await wrapper.setProps({ modelValue: ["B"] });

    expect(wrapper.find('[data-testid="priority-filter-clear"]').exists()).toBe(
      true,
    );
    expect(
      wrapper.find('[data-testid="priority-filter-B"]').classes(),
    ).toContain("bg-amber-100");
  });

  it("should remove only the clicked tier from selection", async () => {
    const wrapper = mount(SchoolPriorityTierFilter, {
      props: { modelValue: ["A", "B", "C"] },
    });

    await wrapper.find('[data-testid="priority-filter-B"]').trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([["A", "C"]]);
  });

  it("should maintain order when adding new tiers", async () => {
    const wrapper = mount(SchoolPriorityTierFilter, {
      props: { modelValue: ["A"] },
    });

    await wrapper.find('[data-testid="priority-filter-C"]').trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([["A", "C"]]);
  });
});
