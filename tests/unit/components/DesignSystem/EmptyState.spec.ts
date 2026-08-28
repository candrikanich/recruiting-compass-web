import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import EmptyState from "~/components/DesignSystem/EmptyState.vue";

describe("DesignSystemEmptyState", () => {
  it("renders title and description", () => {
    const wrapper = mount(EmptyState, {
      props: { title: "No schools yet", description: "Add your first school." },
    });
    expect(wrapper.get('[role="status"]').text()).toContain("No schools yet");
    expect(wrapper.text()).toContain("Add your first school.");
  });

  it("links out when actionHref is provided", () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: "Empty",
        actionText: "Add Your First School",
        actionHref: "/schools/new",
      },
    });
    expect(wrapper.text()).toContain("Add Your First School");
  });

  it("emits action when the text-only CTA is clicked", async () => {
    const wrapper = mount(EmptyState, {
      props: { title: "No matches", actionText: "Clear Filters" },
    });
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("action")).toHaveLength(1);
  });

  it("prefers the action slot over actionText", () => {
    const wrapper = mount(EmptyState, {
      props: { title: "Empty", actionText: "Default" },
      slots: { action: "<button type='button'>Custom</button>" },
    });
    expect(wrapper.text()).toContain("Custom");
    expect(wrapper.text()).not.toContain("Default");
  });
});
