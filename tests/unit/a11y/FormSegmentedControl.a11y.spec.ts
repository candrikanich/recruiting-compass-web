import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import FormSegmentedControl from "~/components/DesignSystem/Form/FormSegmentedControl.vue";

const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

const fieldErrorStub = {
  template: '<div :id="id" role="alert">{{ error }}</div>',
  props: ["error", "id"],
};

const OPTIONS = [
  { value: "", label: "Both" },
  { value: "outbound", label: "Sent" },
  { value: "inbound", label: "Received" },
];

const mountControl = (props: Record<string, unknown> = {}) =>
  mount(FormSegmentedControl, {
    props: { modelValue: "", label: "Direction", options: OPTIONS, ...props },
    attachTo: document.body,
    global: { stubs: { DesignSystemFieldError: fieldErrorStub } },
  });

describe("FormSegmentedControl accessibility", () => {
  it("has no violations in default state", async () => {
    const wrapper = mountControl();
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations();
    wrapper.unmount();
  });

  it("has no violations when required", async () => {
    const wrapper = mountControl({ required: true });
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations();
    wrapper.unmount();
  });

  it("has no violations when showing an error", async () => {
    const wrapper = mountControl({ error: "Pick a direction" });
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations();
    wrapper.unmount();
  });
});
