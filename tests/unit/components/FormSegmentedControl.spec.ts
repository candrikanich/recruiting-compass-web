import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import FormSegmentedControl from "~/components/DesignSystem/Form/FormSegmentedControl.vue";

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
    global: { stubs: { DesignSystemFieldError: fieldErrorStub } },
  });

describe("FormSegmentedControl", () => {
  it("renders one radio per option", () => {
    const wrapper = mountControl();
    const radios = wrapper.findAll('input[type="radio"]');
    expect(radios).toHaveLength(OPTIONS.length);
  });

  it("renders each option label", () => {
    const wrapper = mountControl();
    OPTIONS.forEach((o) => expect(wrapper.text()).toContain(o.label));
  });

  it("renders the group label as a legend", () => {
    const wrapper = mountControl();
    expect(wrapper.find("legend").text()).toContain("Direction");
  });

  it("marks the segment matching modelValue as checked", () => {
    const wrapper = mountControl({ modelValue: "outbound" });
    const checked = wrapper.find('input[type="radio"]:checked')
      .element as HTMLInputElement;
    expect(checked.value).toBe("outbound");
  });

  it("emits update:modelValue with the option value when a segment is chosen", async () => {
    const wrapper = mountControl();
    const inbound = wrapper
      .findAll('input[type="radio"]')
      .find((r) => (r.element as HTMLInputElement).value === "inbound")!;
    await inbound.setValue();
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["inbound"]);
  });

  it("supports a neutral empty-value segment", async () => {
    const wrapper = mountControl({ modelValue: "outbound" });
    const both = wrapper
      .findAll('input[type="radio"]')
      .find((r) => (r.element as HTMLInputElement).value === "")!;
    await both.setValue();
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([""]);
  });

  it("disables every radio when disabled", () => {
    const wrapper = mountControl({ disabled: true });
    wrapper
      .findAll('input[type="radio"]')
      .forEach((r) =>
        expect((r.element as HTMLInputElement).disabled).toBe(true),
      );
  });

  it("groups radios under a shared name", () => {
    const wrapper = mountControl();
    const names = wrapper
      .findAll('input[type="radio"]')
      .map((r) => (r.element as HTMLInputElement).name);
    expect(new Set(names).size).toBe(1);
    expect(names[0]).toBeTruthy();
  });

  it("marks the group required when required", () => {
    const wrapper = mountControl({
      required: true,
      options: [
        { value: "outbound", label: "Sent" },
        { value: "inbound", label: "Received" },
      ],
      modelValue: "outbound",
    });
    const anyRequired = wrapper
      .findAll('input[type="radio"]')
      .some((r) => (r.element as HTMLInputElement).required);
    expect(anyRequired).toBe(true);
  });

  it("renders an error message when error is set", () => {
    const wrapper = mountControl({ error: "Pick a direction" });
    expect(wrapper.find('[role="alert"]').text()).toContain(
      "Pick a direction",
    );
  });

  it("fills width with equal segments by default (block)", () => {
    const wrapper = mountControl();
    const container = wrapper.find("fieldset > div");
    expect(container.classes()).toContain("w-full");
    expect(wrapper.find("label").classes()).toContain("flex-1");
  });

  it("sizes to content when block is false", () => {
    const wrapper = mountControl({ block: false });
    const container = wrapper.find("fieldset > div");
    expect(container.classes()).toContain("inline-flex");
    expect(container.classes()).not.toContain("w-full");
    expect(wrapper.find("label").classes()).not.toContain("flex-1");
  });

  it("keeps the legend for screen readers but hides it visually when hideLabel", () => {
    const wrapper = mountControl({ hideLabel: true });
    const legend = wrapper.find("legend");
    expect(legend.exists()).toBe(true);
    expect(legend.text()).toContain("Direction");
    expect(legend.classes()).toContain("sr-only");
  });
});
