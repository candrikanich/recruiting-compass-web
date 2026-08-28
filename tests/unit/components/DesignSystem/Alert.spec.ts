import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Alert from "~/components/DesignSystem/Alert.vue";

const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

describe("DesignSystemAlert", () => {
  it("renders info as a polite status region", () => {
    const wrapper = mount(Alert, {
      props: { variant: "info", title: "Heads up" },
      slots: { default: "Your list is synced." },
    });
    const root = wrapper.get('[role="status"]');
    expect(root.attributes("aria-live")).toBe("polite");
    expect(wrapper.text()).toContain("Heads up");
    expect(wrapper.text()).toContain("Your list is synced.");
  });

  it("renders error as an assertive alert", () => {
    const wrapper = mount(Alert, {
      props: { variant: "error", title: "Could not save" },
      slots: { default: "Try again." },
    });
    const root = wrapper.get('[role="alert"]');
    expect(root.attributes("aria-live")).toBe("assertive");
  });

  it("hides the dismiss control unless dismissible", () => {
    const hidden = mount(Alert, { slots: { default: "Hi" } });
    expect(hidden.find("button").exists()).toBe(false);

    const shown = mount(Alert, {
      props: { dismissible: true, variant: "warning" },
      slots: { default: "Hi" },
    });
    expect(shown.get("button").attributes("aria-label")).toBe("Dismiss warning");
  });

  it("emits dismiss when the close button is clicked", async () => {
    const wrapper = mount(Alert, {
      props: { dismissible: true },
      slots: { default: "Hi" },
    });
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("dismiss")).toHaveLength(1);
  });

  it("has no axe violations", async () => {
    const wrapper = mount(Alert, {
      props: { variant: "error", title: "Failed", dismissible: true },
      slots: { default: "Could not load schools." },
    });
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations();
  });
});
