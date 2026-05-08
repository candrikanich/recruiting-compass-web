import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import FormSelect from "~/components/DesignSystem/Form/FormSelect.vue";

const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

const fieldErrorStub = {
  template: '<div :id="id" role="alert">{{ error }}</div>',
  props: ["error", "id"],
};

const OPTIONS = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
];

describe("FormSelect accessibility", () => {
  it("has no violations in default state", async () => {
    const wrapper = mount(FormSelect, {
      props: { modelValue: "", label: "Sport", options: OPTIONS },
      attachTo: document.body,
      global: { stubs: { DesignSystemFieldError: fieldErrorStub } },
    });
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations();
    wrapper.unmount();
  });

  it("has no violations when required", async () => {
    const wrapper = mount(FormSelect, {
      props: {
        modelValue: "",
        label: "Sport",
        options: OPTIONS,
        required: true,
      },
      attachTo: document.body,
      global: { stubs: { DesignSystemFieldError: fieldErrorStub } },
    });
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations();
    wrapper.unmount();
  });

  it("has no violations when showing an error", async () => {
    const wrapper = mount(FormSelect, {
      props: {
        modelValue: "",
        label: "Sport",
        options: OPTIONS,
        error: "Please select a sport",
      },
      attachTo: document.body,
      global: { stubs: { DesignSystemFieldError: fieldErrorStub } },
    });
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations();
    wrapper.unmount();
  });
});
