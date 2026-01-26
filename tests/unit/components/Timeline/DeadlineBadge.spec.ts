import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import DeadlineBadge from "~/components/Timeline/DeadlineBadge.vue";

describe("DeadlineBadge.vue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });

  it("does not render when task is completed", () => {
    const wrapper = mount(DeadlineBadge, {
      props: {
        deadlineDate: new Date("2026-02-15T12:00:00Z").toISOString(),
        isCompleted: true,
      },
    });

    expect(wrapper.find("[data-testid='deadline-badge']").exists()).toBe(false);
  });

  it("does not render when deadline is null", () => {
    const wrapper = mount(DeadlineBadge, {
      props: {
        deadlineDate: null,
        isCompleted: false,
      },
    });

    expect(wrapper.find("[data-testid='deadline-badge']").exists()).toBe(false);
  });

  it("renders badge when deadline exists and task is not completed", () => {
    const wrapper = mount(DeadlineBadge, {
      props: {
        deadlineDate: new Date("2026-02-15T12:00:00Z").toISOString(),
        isCompleted: false,
      },
    });

    expect(wrapper.find("[data-testid='deadline-badge']").exists()).toBe(true);
  });

  it("applies red background for critical urgency (overdue)", () => {
    const wrapper = mount(DeadlineBadge, {
      props: {
        deadlineDate: new Date("2026-01-10T12:00:00Z").toISOString(),
        isCompleted: false,
      },
    });

    const badge = wrapper.find("[data-testid='deadline-badge']");
    expect(badge.classes()).toContain("bg-red-100");
  });

  it("applies orange background for urgent status (4-7 days)", () => {
    const wrapper = mount(DeadlineBadge, {
      props: {
        deadlineDate: new Date("2026-01-20T12:00:00Z").toISOString(),
        isCompleted: false,
      },
    });

    const badge = wrapper.find("[data-testid='deadline-badge']");
    expect(badge.classes()).toContain("bg-orange-100");
  });

  it("applies yellow background for upcoming status (8-14 days)", () => {
    const wrapper = mount(DeadlineBadge, {
      props: {
        deadlineDate: new Date("2026-01-25T12:00:00Z").toISOString(),
        isCompleted: false,
      },
    });

    const badge = wrapper.find("[data-testid='deadline-badge']");
    expect(badge.classes()).toContain("bg-yellow-100");
  });

  it("shows alert icon for critical urgency", () => {
    const wrapper = mount(DeadlineBadge, {
      props: {
        deadlineDate: new Date("2026-01-17T12:00:00Z").toISOString(),
        isCompleted: false,
      },
    });

    const alertIcon = wrapper.find("[data-testid='alert-icon']");
    expect(alertIcon.exists()).toBe(true);
  });

  it("does not show alert icon for non-critical urgency", () => {
    const wrapper = mount(DeadlineBadge, {
      props: {
        deadlineDate: new Date("2026-01-25T12:00:00Z").toISOString(),
        isCompleted: false,
      },
    });

    const alertIcon = wrapper.find("[data-testid='alert-icon']");
    expect(alertIcon.exists()).toBe(false);
  });

  it("displays deadline date in tooltip", () => {
    const wrapper = mount(DeadlineBadge, {
      props: {
        deadlineDate: new Date("2026-02-15T12:00:00Z").toISOString(),
        isCompleted: false,
      },
    });

    const badge = wrapper.find("[data-testid='deadline-badge']");
    // Check that the element has a title or aria-label
    expect(badge.attributes("title") || badge.attributes("aria-label")).toBeTruthy();
  });

  it("updates when deadline changes", async () => {
    const wrapper = mount(DeadlineBadge, {
      props: {
        deadlineDate: new Date("2026-02-15T12:00:00Z").toISOString(),
        isCompleted: false,
      },
    });

    expect(wrapper.find("[data-testid='deadline-badge']").exists()).toBe(true);

    // Change to critical deadline
    await wrapper.setProps({
      deadlineDate: new Date("2026-01-17T12:00:00Z").toISOString(),
    });

    const badge = wrapper.find("[data-testid='deadline-badge']");
    expect(badge.classes()).toContain("bg-red-100");
  });

  it("hides when task becomes completed", async () => {
    const wrapper = mount(DeadlineBadge, {
      props: {
        deadlineDate: new Date("2026-02-15T12:00:00Z").toISOString(),
        isCompleted: false,
      },
    });

    expect(wrapper.find("[data-testid='deadline-badge']").exists()).toBe(true);

    await wrapper.setProps({ isCompleted: true });

    expect(wrapper.find("[data-testid='deadline-badge']").exists()).toBe(false);
  });
});
