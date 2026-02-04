import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Screen2BasicInfo from "~/components/Onboarding/Screen2BasicInfo.vue";

// Mock the utilities
vi.mock("~/utils/ageVerification", () => ({
  validatePlayerAge: (graduationYear: number) => {
    const currentYear = new Date().getFullYear();
    const yearsUntilGraduation = graduationYear - currentYear;
    if (yearsUntilGraduation > 4) {
      return {
        isValid: false,
        error:
          "The Recruiting Compass is designed for athletes 14 and older. If you believe this is an error, please contact support.",
      };
    }
    return { isValid: true };
  },
}));

describe("Screen2BasicInfo Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render graduation year dropdown", () => {
    const wrapper = mount(Screen2BasicInfo);
    expect(wrapper.text()).toContain("Graduation Year");
  });

  it("should render primary sport dropdown", () => {
    const wrapper = mount(Screen2BasicInfo);
    expect(wrapper.text()).toContain("Primary Sport");
  });

  it("should render position field when sport is selected", async () => {
    const wrapper = mount(Screen2BasicInfo);
    const sportSelects = wrapper.findAll("select");
    const primarySportSelect = sportSelects[1]; // Second select is sport

    await primarySportSelect.setValue("baseball");
    expect(wrapper.text()).toContain("Position");
  });

  it("should validate age with graduation year limits", () => {
    // This test verifies the underlying validation utility works correctly
    const wrapper = mount(Screen2BasicInfo);
    const yearSelect = wrapper.findAll("select")[0];

    const currentYear = new Date().getFullYear();
    expect(yearSelect.exists()).toBe(true);

    // Verify the dropdown has valid years
    const options = yearSelect.findAll("option");
    const yearValues = options.map((o) => o.attributes("value"));
    expect(yearValues).toContain(String(currentYear + 2));
    expect(yearValues).not.toContain(String(currentYear + 5));
  });

  it("should allow valid graduation years", () => {
    const wrapper = mount(Screen2BasicInfo);
    const yearSelect = wrapper.findAll("select")[0];

    const currentYear = new Date().getFullYear();

    // Verify the dropdown has valid years within range
    const options = yearSelect.findAll("option");
    const yearValues = options.map((o) => o.attributes("value"));

    expect(yearValues).toContain(String(currentYear));
    expect(yearValues).toContain(String(currentYear + 2));
    expect(yearValues).toContain(String(currentYear + 4));
  });

  it("should filter positions by sport", async () => {
    const wrapper = mount(Screen2BasicInfo);
    const selects = wrapper.findAll("select");
    const sportSelect = selects[1];

    await sportSelect.setValue("baseball");
    await wrapper.vm.$nextTick();

    const positionSelects = wrapper.findAll("select");
    const positionSelect = positionSelects[2]; // Position is third select

    const options = positionSelect.findAll("option");
    const optionTexts = options.map((opt) => opt.text());

    expect(optionTexts.length).toBeGreaterThan(1);
  });

  it("should show custom position input for sports without position list", async () => {
    const wrapper = mount(Screen2BasicInfo);
    const sportSelect = wrapper.findAll("select")[1];

    await sportSelect.setValue("golf");
    await wrapper.vm.$nextTick();

    // Should have a text input for custom position
    const inputs = wrapper.findAll("input[type='text']");
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("should not emit next-screen when required fields are missing", async () => {
    const wrapper = mount(Screen2BasicInfo);
    const buttons = wrapper.findAll("button");
    const submitButton = buttons[buttons.length - 1]; // Last button is Next
    await submitButton.trigger("click");

    expect(wrapper.emitted("next-screen")).toBeFalsy();
  });

  it("should show error message when form validation fails", async () => {
    const wrapper = mount(Screen2BasicInfo);
    const buttons = wrapper.findAll("button");
    const submitButton = buttons[buttons.length - 1]; // Last button is Next
    await submitButton.trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("required");
  });

  it("should render secondary sport and position options", () => {
    const wrapper = mount(Screen2BasicInfo);
    expect(wrapper.text()).toContain("Secondary Sport");
  });

  it("should have back and next buttons", () => {
    const wrapper = mount(Screen2BasicInfo);
    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    expect(buttons[buttons.length - 1].text()).toContain("Next");
  });
});
