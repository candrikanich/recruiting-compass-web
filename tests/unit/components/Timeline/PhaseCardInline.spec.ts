import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PhaseCardInline from "~/components/Timeline/PhaseCardInline.vue";

describe("PhaseCardInline", () => {
  const defaultProps = {
    phase: "junior",
    title: "Junior Year",
    theme: "Active Recruiting",
    tasks: [],
    isCurrentPhase: true,
    expanded: false,
  };

  const mountCard = (props = {}) =>
    mount(PhaseCardInline, {
      props: { ...defaultProps, ...props },
      global: { stubs: { TaskList: true } },
    });

  it("marks the header button as collapsed when the card is collapsed", () => {
    const wrapper = mountCard();
    expect(wrapper.find("button").attributes("aria-expanded")).toBe("false");
  });

  it("marks the header button as expanded when the card is expanded", async () => {
    const wrapper = mountCard();
    await wrapper.setProps({ expanded: true });
    expect(wrapper.find("button").attributes("aria-expanded")).toBe("true");
  });

  it("emits toggle when the header button is activated", async () => {
    const wrapper = mountCard();
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("toggle")).toHaveLength(1);
  });
});
