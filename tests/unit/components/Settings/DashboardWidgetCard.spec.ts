import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import DashboardWidgetCard from "~/components/Settings/DashboardWidgetCard.vue";

describe("DashboardWidgetCard", () => {
  const defaultProps = {
    id: "schoolMapWidget" as const,
    visible: true,
  };

  it("renders the widget label", () => {
    const wrapper = mount(DashboardWidgetCard, { props: defaultProps });
    expect(wrapper.text()).toContain("School Map");
  });

  it("renders the 4/6 size badge for wide widgets", () => {
    const wrapper = mount(DashboardWidgetCard, { props: defaultProps });
    expect(wrapper.text()).toContain("4/6");
  });

  it("renders 2/6 badge for narrow widgets", () => {
    const wrapper = mount(DashboardWidgetCard, {
      props: { id: "eventsSummary" as const, visible: true },
    });
    expect(wrapper.text()).toContain("2/6");
  });

  it("emits toggle when eye button clicked", async () => {
    const wrapper = mount(DashboardWidgetCard, { props: defaultProps });
    await wrapper.find("[data-testid='toggle-visibility']").trigger("click");
    expect(wrapper.emitted("toggle")).toBeTruthy();
  });

  it("dims card when not visible", () => {
    const wrapper = mount(DashboardWidgetCard, {
      props: { id: "schoolMapWidget" as const, visible: false },
    });
    expect(wrapper.classes()).toContain("opacity-50");
  });

  it("shows Coming Soon badge and no toggle when disabled", () => {
    const wrapper = mount(DashboardWidgetCard, {
      props: { id: "schoolMapWidget" as const, visible: true, disabled: true },
    });
    expect(wrapper.text()).toContain("Coming soon");
    expect(wrapper.find("[data-testid='toggle-visibility']").exists()).toBe(false);
  });
});
