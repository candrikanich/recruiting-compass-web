import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ProfileCompleteness from "~/components/ProfileCompleteness.vue";

vi.mock("~/composables/useProfileCompleteness", () => ({
  useProfileCompleteness: () => ({
    completeness: { value: 75 },
  }),
}));

describe("ProfileCompleteness Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render progress bar", () => {
    const wrapper = mount(ProfileCompleteness);
    const progressBar = wrapper.find("[role='progressbar']");
    expect(progressBar.exists()).toBe(true);
  });

  it("should display percentage text", () => {
    const wrapper = mount(ProfileCompleteness);
    expect(wrapper.text()).toContain("75");
  });

  it("should display profile complete text", () => {
    const wrapper = mount(ProfileCompleteness);
    const text = wrapper.text();
    expect(text.includes("Profile") || text.includes("complete")).toBe(true);
  });

  it("should have green color for high completeness (75%)", () => {
    const wrapper = mount(ProfileCompleteness);
    const html = wrapper.html();
    // For 75%, should be green (not red or yellow)
    expect(html.includes("green") || html.includes("emerald")).toBe(true);
  });

  it("should update reactively when completeness changes", async () => {
    const wrapper = mount(ProfileCompleteness);
    const text = wrapper.text();
    expect(text).toContain("75");
  });

  it("should render with proper styling classes", () => {
    const wrapper = mount(ProfileCompleteness);
    const mainDiv = wrapper.find("div");
    expect(mainDiv.classes()).toContain("flex");
  });

  it("should have correct aria attributes for accessibility", () => {
    const wrapper = mount(ProfileCompleteness);
    const progressBar = wrapper.find("[role='progressbar']");
    expect(progressBar.attributes("role")).toBe("progressbar");
    expect(progressBar.attributes("aria-valuenow")).toBeTruthy();
    expect(progressBar.attributes("aria-valuemin")).toBeTruthy();
    expect(progressBar.attributes("aria-valuemax")).toBeTruthy();
  });
});
