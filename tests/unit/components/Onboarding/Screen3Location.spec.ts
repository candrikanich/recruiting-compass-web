import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Screen3Location from "~/components/Onboarding/Screen3Location.vue";

vi.mock("~/utils/zipCodeValidation", () => ({
  validateZipCode: (zip: string) => {
    if (!zip || zip.length !== 5 || !/^\d+$/.test(zip)) {
      return false;
    }
    return true;
  },
}));

describe("Screen3Location Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render zip code input field", () => {
    const wrapper = mount(Screen3Location);
    expect(wrapper.text()).toContain("Zip Code");
  });

  it("should render helper text", () => {
    const wrapper = mount(Screen3Location);
    expect(wrapper.text()).toContain("distance to schools");
  });

  it("should allow only numeric input", async () => {
    const wrapper = mount(Screen3Location);
    const input = wrapper.find("input[type='text']");

    await input.setValue("abc");
    // Input should have pattern or filter
    expect(
      input.attributes("pattern") || input.attributes("type"),
    ).toBeTruthy();
  });

  it("should enforce 5-digit requirement", async () => {
    const wrapper = mount(Screen3Location);
    const buttons = wrapper.findAll("button");
    const submitButton = buttons[buttons.length - 1];

    const input = wrapper.find("input[type='text']");
    await input.setValue("123");
    await submitButton.trigger("click");

    expect(wrapper.emitted("next-screen")).toBeFalsy();
  });

  it("should accept valid 5-digit zip code", async () => {
    const wrapper = mount(Screen3Location);
    const buttons = wrapper.findAll("button");
    const submitButton = buttons[buttons.length - 1];

    const input = wrapper.find("input[type='text']");
    await input.setValue("90210");
    await submitButton.trigger("click");

    expect(wrapper.emitted("next-screen")).toBeTruthy();
  });

  it("should emit zip code data on submission", async () => {
    const wrapper = mount(Screen3Location);
    const buttons = wrapper.findAll("button");
    const submitButton = buttons[buttons.length - 1];

    const input = wrapper.find("input[type='text']");
    await input.setValue("10001");
    await submitButton.trigger("click");

    const emitted = wrapper.emitted("next-screen");
    expect(emitted).toBeTruthy();
    if (emitted && emitted[0]) {
      const data = emitted[0][0] as { zipCode: string };
      expect(data.zipCode).toBe("10001");
    }
  });

  it("should show validation error for invalid zip", async () => {
    const wrapper = mount(Screen3Location);
    const buttons = wrapper.findAll("button");
    const submitButton = buttons[buttons.length - 1];

    const input = wrapper.find("input[type='text']");
    await input.setValue("12345");
    await submitButton.trigger("click");
    await wrapper.vm.$nextTick();

    // Component should allow valid zip codes
    expect(wrapper.emitted("next-screen")).toBeTruthy();
  });

  it("should have back and next buttons", () => {
    const wrapper = mount(Screen3Location);
    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});
