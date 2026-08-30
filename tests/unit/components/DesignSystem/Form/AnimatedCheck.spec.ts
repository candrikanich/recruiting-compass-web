import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import AnimatedCheck from "~/components/DesignSystem/Form/AnimatedCheck.vue";

describe("AnimatedCheck", () => {
  it("renders a real native checkbox (a11y/form semantics preserved)", () => {
    const wrapper = mount(AnimatedCheck, { props: { modelValue: false } });
    const input = wrapper.find('input[type="checkbox"]');
    expect(input.exists()).toBe(true);
  });

  it("keeps the native input in the DOM but visually hidden (opacity-0 overlay + peer)", () => {
    const wrapper = mount(AnimatedCheck, { props: { modelValue: false } });
    const input = wrapper.find('input[type="checkbox"]');
    expect(input.classes()).toContain("opacity-0");
    expect(input.classes()).toContain("absolute");
    expect(input.classes()).toContain("inset-0");
    expect(input.classes()).toContain("peer");
  });

  it("renders the animated SVG tick", () => {
    const wrapper = mount(AnimatedCheck, { props: { modelValue: false } });
    expect(wrapper.find("svg .tick").exists()).toBe(true);
  });

  it("is checked when modelValue is true", () => {
    const wrapper = mount(AnimatedCheck, { props: { modelValue: true } });
    expect(
      (wrapper.find('input[type="checkbox"]').element as HTMLInputElement)
        .checked,
    ).toBe(true);
  });

  it("is unchecked when modelValue is false", () => {
    const wrapper = mount(AnimatedCheck, { props: { modelValue: false } });
    expect(
      (wrapper.find('input[type="checkbox"]').element as HTMLInputElement)
        .checked,
    ).toBe(false);
  });

  it("emits update:modelValue with true when checked", async () => {
    const wrapper = mount(AnimatedCheck, { props: { modelValue: false } });
    await wrapper.find('input[type="checkbox"]').setValue(true);
    expect(wrapper.emitted("update:modelValue")).toEqual([[true]]);
  });

  it("emits update:modelValue with false when unchecked", async () => {
    const wrapper = mount(AnimatedCheck, { props: { modelValue: true } });
    await wrapper.find('input[type="checkbox"]').setValue(false);
    expect(wrapper.emitted("update:modelValue")).toEqual([[false]]);
  });

  it("disables the native input when disabled", () => {
    const wrapper = mount(AnimatedCheck, {
      props: { modelValue: false, disabled: true },
    });
    expect(
      (wrapper.find('input[type="checkbox"]').element as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(wrapper.find("label").classes()).toContain("cursor-not-allowed");
  });

  it("renders slot content as the label", () => {
    const wrapper = mount(AnimatedCheck, {
      props: { modelValue: false },
      slots: { default: "Accept terms" },
    });
    expect(wrapper.text()).toContain("Accept terms");
  });

  it("forwards attrs (data-testid, aria-label) onto the native input", () => {
    const wrapper = mount(AnimatedCheck, {
      props: { modelValue: false },
      attrs: { "data-testid": "share-phone", "aria-label": "Share phone" },
    });
    const input = wrapper.find('input[type="checkbox"]');
    expect(input.attributes("data-testid")).toBe("share-phone");
    expect(input.attributes("aria-label")).toBe("Share phone");
  });

  it("still fires a caller-supplied @change handler (native event pass-through)", async () => {
    let fired = 0;
    const wrapper = mount(AnimatedCheck, {
      props: { modelValue: false },
      attrs: { onChange: () => (fired += 1) },
    });
    await wrapper.find('input[type="checkbox"]').setValue(true);
    expect(fired).toBe(1);
  });

  it("respects reduced-motion (no forced animation)", () => {
    const wrapper = mount(AnimatedCheck, { props: { modelValue: false } });
    expect(wrapper.find("svg").classes().join(" ")).toContain("motion-reduce");
  });
});
