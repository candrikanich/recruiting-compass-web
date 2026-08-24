import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";

const destroy = vi.fn();
vi.mock("chart.js/auto", () => ({
  default: vi.fn(function MockChart() {
    return { destroy };
  }),
}));

import AdminChart from "~/components/Admin/AdminChart.vue";

describe("AdminChart", () => {
  it("renders a canvas and constructs a chart", () => {
    const wrapper = mount(AdminChart, {
      props: {
        type: "line",
        data: { labels: ["a"], datasets: [{ data: [1] }] },
      },
    });
    expect(wrapper.find("canvas").exists()).toBe(true);
  });

  it("destroys the chart on unmount", () => {
    const wrapper = mount(AdminChart, {
      props: { type: "bar", data: { labels: [], datasets: [] } },
    });
    wrapper.unmount();
    expect(destroy).toHaveBeenCalled();
  });
});
