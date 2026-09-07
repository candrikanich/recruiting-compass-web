import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import type { ChartData } from "chart.js";

const destroy = vi.fn();
let lastConfig: { data: ChartData } | undefined;
vi.mock("chart.js/auto", () => ({
  default: vi.fn(function MockChart(
    _canvas: unknown,
    config: { data: ChartData },
  ) {
    lastConfig = config;
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

  it("does not let Chart.js mutate the original data prop", () => {
    // Chart.js does not clone the `data` it's given — it mutates the
    // dataset objects directly (attaching internal `_meta` caches). If
    // AdminChart hands Chart.js the same object reference as `props.data`,
    // that mutation flows straight back into the reactive prop, which the
    // `deep: true` watch below reads — retriggering `render()` forever
    // (confirmed live: an admin dashboard chart pegged a browser tab at
    // ~100% CPU / 6+ GB memory for hours). Passing a clone breaks the loop.
    const originalData: ChartData = {
      labels: ["a"],
      datasets: [{ data: [1] }],
    };
    mount(AdminChart, { props: { type: "line", data: originalData } });

    expect(lastConfig?.data).not.toBe(originalData);

    // Simulate Chart.js's real mutation of the data it received.
    (lastConfig?.data.datasets[0] as Record<string, unknown>)._meta = {};

    expect(originalData.datasets[0]).not.toHaveProperty("_meta");
  });
});
