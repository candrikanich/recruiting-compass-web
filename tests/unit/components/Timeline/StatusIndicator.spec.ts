import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import StatusIndicator from "~/components/Timeline/StatusIndicator.vue";

describe("StatusIndicator Component", () => {
  it("should render with not_started status", () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        status: "not_started",
      },
    });

    expect(wrapper.find("span").classes()).toContain("bg-slate-100");
    expect(wrapper.find("span").classes()).toContain("text-slate-700");
  });

  it("should render with in_progress status", () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        status: "in_progress",
      },
    });

    expect(wrapper.find("span").classes()).toContain("bg-blue-100");
    expect(wrapper.find("span").classes()).toContain("text-blue-700");
  });

  it("should render with completed status", () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        status: "completed",
      },
    });

    expect(wrapper.find("span").classes()).toContain("bg-emerald-100");
    expect(wrapper.find("span").classes()).toContain("text-emerald-700");
  });

  it("should render with skipped status", () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        status: "skipped",
      },
    });

    expect(wrapper.find("span").classes()).toContain("bg-slate-100");
    expect(wrapper.find("span").classes()).toContain("text-slate-600");
  });

  it("should display full label by default", () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        status: "in_progress",
      },
    });

    expect(wrapper.text().toLowerCase()).toContain("progress");
  });

  it("should show short label when showLabel is false for in_progress", () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        status: "in_progress",
        showLabel: false,
      },
    });

    expect(wrapper.text()).toContain("In progress");
  });

  it("should show short label when showLabel is false", () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        status: "completed",
        showLabel: false,
      },
    });

    expect(wrapper.text()).toContain("✓ Done");
  });

  it("should use md size by default", () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        status: "completed",
        size: "md",
      },
    });

    expect(wrapper.find("span").classes()).toContain("px-2");
    expect(wrapper.find("span").classes()).toContain("py-1");
  });

  it("should apply base badge styling classes", () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        status: "completed",
      },
    });

    const span = wrapper.find("span");

    expect(span.classes()).toContain("inline-block");
    expect(span.classes()).toContain("text-xs");
    expect(span.classes()).toContain("rounded-full");
  });

  it("should update when status prop changes", async () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        status: "not_started",
      },
    });

    expect(wrapper.find("span").classes()).toContain("bg-slate-100");

    await wrapper.setProps({ status: "in_progress" });

    expect(wrapper.find("span").classes()).toContain("bg-blue-100");
  });

  it("should update when showLabel prop changes", async () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        status: "completed",
        showLabel: true,
      },
    });

    expect(wrapper.text()).toContain("Completed");

    await wrapper.setProps({ showLabel: false });

    expect(wrapper.text()).not.toContain("Completed");
    expect(wrapper.text()).toContain("✓ Done");
  });

  it("should render all status types with correct labels", () => {
    const statusLabels = {
      not_started: "Not started",
      in_progress: "In progress",
      completed: "✓ Done",
      skipped: "Skipped",
    };

    Object.entries(statusLabels).forEach(([status, expectedLabel]) => {
      const wrapper = mount(StatusIndicator, {
        props: {
          status: status as any,
          showLabel: false,
        },
      });

      expect(wrapper.text()).toContain(expectedLabel);
    });
  });
});
