import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Button from "~/components/DesignSystem/Button.vue";

describe("DesignSystemButton", () => {
  it("shows a busy spinner and blocks clicks while loading", async () => {
    const wrapper = mount(Button, {
      props: { loading: true },
      slots: { default: "Save" },
    });
    expect(wrapper.get("button").attributes("aria-busy")).toBe("true");
    expect(wrapper.get("button").attributes("disabled")).toBeDefined();
    expect(wrapper.find("svg").attributes("aria-hidden")).toBe("true");
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("click")).toBeUndefined();
  });

  it("does not navigate when a link button is disabled", async () => {
    const wrapper = mount(Button, {
      props: { to: "/schools", disabled: true },
      slots: { default: "Schools" },
    });
    expect(wrapper.attributes("aria-disabled")).toBe("true");
    expect(wrapper.attributes("tabindex")).toBe("-1");
    await wrapper.trigger("click");
    expect(wrapper.emitted("click")).toBeUndefined();
  });
});
