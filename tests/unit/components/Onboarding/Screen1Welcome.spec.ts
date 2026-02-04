import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Screen1Welcome from "~/components/Onboarding/Screen1Welcome.vue";

describe("Screen1Welcome Component", () => {
  it("should render welcome headline", () => {
    const wrapper = mount(Screen1Welcome);
    expect(wrapper.text()).toContain("Let's set up your recruiting profile");
  });

  it("should render welcome subtext", () => {
    const wrapper = mount(Screen1Welcome);
    expect(wrapper.text()).toContain("personalize your recruiting journey");
  });

  it("should render Get Started button", () => {
    const wrapper = mount(Screen1Welcome);
    const button = wrapper.find("button");
    expect(button.exists()).toBe(true);
    expect(button.text()).toContain("Get Started");
  });

  it("should emit next-screen event on button click", async () => {
    const wrapper = mount(Screen1Welcome);
    const button = wrapper.find("button");
    await button.trigger("click");
    expect(wrapper.emitted("next-screen")).toBeTruthy();
  });

  it("should have accessible button with proper attributes", () => {
    const wrapper = mount(Screen1Welcome);
    const button = wrapper.find("button");
    expect(button.attributes("type")).toBe("button");
  });

  it("should render explanatory text about profile setup", () => {
    const wrapper = mount(Screen1Welcome);
    expect(wrapper.text()).toContain("This helps us");
  });
});
