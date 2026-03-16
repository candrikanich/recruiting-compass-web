import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HelpImageSlot from "~/components/Help/HelpImageSlot.vue";

describe("HelpImageSlot", () => {
  it("renders placeholder when no src provided", () => {
    const wrapper = mount(HelpImageSlot);
    expect(wrapper.text()).toContain("Screenshot coming soon");
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("renders img when src is provided", () => {
    const wrapper = mount(HelpImageSlot, {
      props: { src: "/help/dashboard.png", caption: "Dashboard view" },
    });
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("/help/dashboard.png");
  });

  it("renders caption below image", () => {
    const wrapper = mount(HelpImageSlot, {
      props: { src: "/help/schools.png", caption: "The schools list" },
    });
    expect(wrapper.find("figcaption").text()).toBe("The schools list");
  });

  it("uses caption as alt text when alt is not provided", () => {
    const wrapper = mount(HelpImageSlot, {
      props: { src: "/help/phases.png", caption: "Phase timeline" },
    });
    expect(wrapper.find("img").attributes("alt")).toBe("Phase timeline");
  });

  it("uses explicit alt over caption when both are provided", () => {
    const wrapper = mount(HelpImageSlot, {
      props: { src: "/help/phases.png", caption: "Phase timeline", alt: "Custom alt text" },
    });
    expect(wrapper.find("img").attributes("alt")).toBe("Custom alt text");
  });

  it("shows no figcaption when caption is omitted", () => {
    const wrapper = mount(HelpImageSlot);
    expect(wrapper.find("figcaption").exists()).toBe(false);
  });
});
