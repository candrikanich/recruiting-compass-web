import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PageState from "~/components/DesignSystem/PageState.vue";

describe("DesignSystemPageState", () => {
  it("shows loading before error or empty", () => {
    const wrapper = mount(PageState, {
      props: {
        loading: true,
        error: "boom",
        empty: true,
        loadingMessage: "Loading schools...",
      },
      slots: { default: "<p>content</p>" },
    });
    expect(wrapper.text()).toContain("Loading schools...");
    expect(wrapper.text()).not.toContain("content");
    expect(wrapper.text()).not.toContain("boom");
  });

  it("shows error after loading resolves", () => {
    const wrapper = mount(PageState, {
      props: { error: "Network down", empty: true },
      slots: { default: "<p>content</p>" },
    });
    expect(wrapper.text()).toContain("Network down");
    expect(wrapper.get('[role="alert"]').exists()).toBe(true);
  });

  it("emits retry from the error action", async () => {
    const wrapper = mount(PageState, { props: { error: "Nope" } });
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("retry")).toHaveLength(1);
  });

  it("shows empty before content", () => {
    const wrapper = mount(PageState, {
      props: {
        empty: true,
        emptyTitle: "No schools yet",
        emptyDescription: "Add one to get started.",
      },
      slots: { default: "<p>content</p>" },
    });
    expect(wrapper.text()).toContain("No schools yet");
    expect(wrapper.text()).not.toContain("content");
  });

  it("renders content when ready", () => {
    const wrapper = mount(PageState, {
      slots: { default: "<p>12 schools</p>" },
    });
    expect(wrapper.text()).toContain("12 schools");
  });
});
