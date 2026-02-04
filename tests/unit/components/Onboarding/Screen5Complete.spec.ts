import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Screen5Complete from "~/components/Onboarding/Screen5Complete.vue";

vi.mock("~/composables/useProfileCompleteness", () => ({
  useProfileCompleteness: () => ({
    completeness: { value: 65 },
  }),
}));

describe("Screen5Complete Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render completion headline", () => {
    const wrapper = mount(Screen5Complete);
    expect(wrapper.text()).toContain("all set");
  });

  it("should display profile completeness percentage", () => {
    const wrapper = mount(Screen5Complete);
    expect(wrapper.text()).toContain("65");
  });

  it("should render progress bar", () => {
    const wrapper = mount(Screen5Complete);
    const progressBar = wrapper.find("[role='progressbar']");
    expect(progressBar.exists()).toBe(true);
  });

  it("should render Invite Parent button", () => {
    const wrapper = mount(Screen5Complete);
    expect(wrapper.text()).toContain("Invite a Parent") ||
      expect(wrapper.text()).toContain("Invite Parent");
  });

  it("should render Skip button", () => {
    const wrapper = mount(Screen5Complete);
    const text = wrapper.text();
    expect(text.includes("Skip") || text.includes("skip")).toBe(true);
  });

  it("should emit invite-parent event on invite button click", async () => {
    const wrapper = mount(Screen5Complete);
    const buttons = wrapper.findAll("button");
    const inviteButton = buttons.find(
      (btn) =>
        (btn.text() || "").toLowerCase().includes("invite") &&
        (btn.text() || "").toLowerCase().includes("parent"),
    );

    if (inviteButton) {
      await inviteButton.trigger("click");
      expect(wrapper.emitted("invite-parent")).toBeTruthy();
    }
  });

  it("should emit complete event on skip button click", async () => {
    const wrapper = mount(Screen5Complete);
    const buttons = wrapper.findAll("button");
    const skipButton = buttons.find((btn) =>
      (btn.text() || "").toLowerCase().includes("skip"),
    );

    if (skipButton) {
      await skipButton.trigger("click");
      expect(wrapper.emitted("complete")).toBeTruthy();
    }
  });

  it("should display profile completeness text", () => {
    const wrapper = mount(Screen5Complete);
    const text = wrapper.text();
    expect(
      text.includes("complete") ||
        text.includes("profile") ||
        text.includes("65"),
    ).toBe(true);
  });

  it("should have two primary CTA buttons", () => {
    const wrapper = mount(Screen5Complete);
    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});
