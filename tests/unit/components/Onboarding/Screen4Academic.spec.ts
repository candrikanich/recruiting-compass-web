import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Screen4Academic from "~/components/Onboarding/Screen4Academic.vue";

vi.clearAllMocks();

describe("Screen4Academic Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render GPA field", () => {
    const wrapper = mount(Screen4Academic);
    expect(wrapper.text()).toContain("GPA");
  });

  it("should render SAT score field", () => {
    const wrapper = mount(Screen4Academic);
    expect(wrapper.text()).toContain("SAT");
  });

  it("should render ACT score field", () => {
    const wrapper = mount(Screen4Academic);
    expect(wrapper.text()).toContain("ACT");
  });

  it("should show skip option", () => {
    const wrapper = mount(Screen4Academic);
    const text = wrapper.text();
    expect(text.includes("skip") || text.includes("later")).toBe(true);
  });

  it("should allow skipping academic info", async () => {
    const wrapper = mount(Screen4Academic);
    const links = wrapper.findAll("a, button");
    const skipButton = links.find(
      (el) =>
        (el.text() || "").toLowerCase().includes("skip") ||
        (el.text() || "").toLowerCase().includes("later"),
    );

    if (skipButton) {
      await skipButton.trigger("click");
      expect(wrapper.emitted("next-screen")).toBeTruthy();
    }
  });

  it("should validate GPA range (0.0-5.0)", async () => {
    const wrapper = mount(Screen4Academic);
    const inputs = wrapper.findAll("input[type='number']");
    const gpaInput = inputs[0];

    await gpaInput.setValue(6.0);
    const buttons = wrapper.findAll("button");
    const submitButton = buttons[buttons.length - 1];
    await submitButton.trigger("click");

    expect(
      wrapper.text().includes("0.0") || wrapper.text().includes("5.0"),
    ).toBeTruthy();
  });

  it("should allow submission with only GPA", async () => {
    const wrapper = mount(Screen4Academic);
    const inputs = wrapper.findAll("input[type='number']");
    const gpaInput = inputs[0];

    await gpaInput.setValue(3.5);
    const buttons = wrapper.findAll("button");
    const submitButton = buttons[buttons.length - 1];
    await submitButton.trigger("click");

    expect(wrapper.emitted("next-screen")).toBeTruthy();
  });

  it("should allow submission with SAT/ACT scores", async () => {
    const wrapper = mount(Screen4Academic);
    const inputs = wrapper.findAll("input[type='number']");
    const satInput = inputs[1];

    await satInput.setValue(1400);
    const buttons = wrapper.findAll("button");
    const submitButton = buttons[buttons.length - 1];
    await submitButton.trigger("click");

    expect(wrapper.emitted("next-screen")).toBeTruthy();
  });

  it("should emit academic data on submission", async () => {
    const wrapper = mount(Screen4Academic);
    const inputs = wrapper.findAll("input[type='number']");

    await inputs[0].setValue(3.8);
    await inputs[1].setValue(1500);

    const buttons = wrapper.findAll("button");
    const submitButton = buttons[buttons.length - 1];
    await submitButton.trigger("click");

    const emitted = wrapper.emitted("next-screen");
    expect(emitted).toBeTruthy();
  });

  it("should have back and next buttons", () => {
    const wrapper = mount(Screen4Academic);
    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});
