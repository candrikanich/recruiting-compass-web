import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import TimelineStatPills from "~/components/Timeline/TimelineStatPills.vue";

describe("TimelineStatPills", () => {
  const defaultProps = {
    statusScore: 72,
    statusLabel: "on_track" as const,
    taskCompleted: 8,
    taskTotal: 24,
    milestonesCompleted: 3,
    milestonesTotal: 5,
  };

  it("renders all three stat pills", () => {
    const wrapper = mount(TimelineStatPills, { props: defaultProps });
    expect(wrapper.text()).toContain("72");
    expect(wrapper.text()).toContain("8/24");
    expect(wrapper.text()).toContain("3/5");
  });

  it("shows green dot for on_track status", () => {
    const wrapper = mount(TimelineStatPills, { props: defaultProps });
    expect(
      wrapper.find("[data-testid='status-dot']").classes(),
    ).toContain("bg-emerald-500");
  });

  it("shows amber dot for slightly_behind status", () => {
    const wrapper = mount(TimelineStatPills, {
      props: { ...defaultProps, statusLabel: "slightly_behind" },
    });
    expect(
      wrapper.find("[data-testid='status-dot']").classes(),
    ).toContain("bg-amber-500");
  });

  it("shows red dot for at_risk status", () => {
    const wrapper = mount(TimelineStatPills, {
      props: { ...defaultProps, statusLabel: "at_risk" },
    });
    expect(
      wrapper.find("[data-testid='status-dot']").classes(),
    ).toContain("bg-red-500");
  });

  it("computes task progress percentage correctly", () => {
    const wrapper = mount(TimelineStatPills, { props: defaultProps });
    expect(wrapper.text()).toContain("33%");
  });

  it("handles zero tasks gracefully", () => {
    const wrapper = mount(TimelineStatPills, {
      props: { ...defaultProps, taskCompleted: 0, taskTotal: 0 },
    });
    expect(wrapper.text()).toContain("0/0");
  });
});
