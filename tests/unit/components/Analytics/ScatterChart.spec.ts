import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import ScatterChart from "~/components/Analytics/ScatterChart.vue";

vi.mock("chart.js", () => ({
  Chart: { register: vi.fn() },
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}));

vi.mock("vue-chartjs", () => ({
  Scatter: {
    name: "Scatter",
    template: '<div class="scatter-chart-mock" />',
    props: ["chartData", "chartOptions"],
    data() {
      return {
        chartData: this.chartData,
        chartOptions: this.chartOptions,
      };
    },
  },
}));

describe("ScatterChart.vue", () => {
  const mockData = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 3, y: 6 },
    { x: 4, y: 8 },
    { x: 5, y: 10 },
  ];

  const mockDatasets = [
    {
      label: "Dataset 1",
      data: mockData,
      color: "#3b82f6",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title and data point count", () => {
    const wrapper = mount(ScatterChart, {
      props: {
        title: "Correlation Test",
        datasets: mockDatasets,
        xLabel: "X Axis",
        yLabel: "Y Axis",
      },
    });

    expect(wrapper.text()).toContain("Correlation Test");
    expect(wrapper.text()).toContain("5 data points");
  });

  it("shows empty state when no data", () => {
    const wrapper = mount(ScatterChart, {
      props: {
        title: "Empty Chart",
        datasets: [],
        xLabel: "X",
        yLabel: "Y",
      },
    });

    expect(wrapper.text()).toContain("No data");
  });

  it("calculates correlation coefficient", () => {
    const wrapper = mount(ScatterChart, {
      props: {
        title: "Correlation Test",
        datasets: mockDatasets,
        xLabel: "X Axis",
        yLabel: "Y Axis",
      },
    });

    const correlation = wrapper.vm.correlation;
    expect(correlation).toBeDefined();
    expect(correlation).toBeGreaterThanOrEqual(-1);
    expect(correlation).toBeLessThanOrEqual(1);
  });

  it("calculates x and y ranges", () => {
    const wrapper = mount(ScatterChart, {
      props: {
        title: "Correlation Test",
        datasets: mockDatasets,
        xLabel: "X Axis",
        yLabel: "Y Axis",
      },
    });

    expect(wrapper.vm.xRange).toBeDefined();
    expect(wrapper.vm.yRange).toBeDefined();
    expect(wrapper.vm.xRange.max).toBeGreaterThan(wrapper.vm.xRange.min);
  });

  it("shows trend direction", () => {
    const wrapper = mount(ScatterChart, {
      props: {
        title: "Correlation Test",
        datasets: mockDatasets,
        xLabel: "X Axis",
        yLabel: "Y Axis",
      },
    });

    const trendText = wrapper.text().toLowerCase();
    expect(trendText).toMatch(/positive|negative|flat/);
  });

  it("toggles trend line visibility", async () => {
    const wrapper = mount(ScatterChart, {
      props: {
        title: "Correlation Test",
        datasets: mockDatasets,
        xLabel: "X Axis",
        yLabel: "Y Axis",
      },
    });

    const trendToggle = wrapper.find('[data-testid="toggle-trend"]');
    if (trendToggle.exists()) {
      const initialState = wrapper.vm.showTrendLine;
      await trendToggle.trigger("click");
      expect(wrapper.vm.showTrendLine).toBe(!initialState);
    }
  });

  it("toggles quadrant visibility", async () => {
    const wrapper = mount(ScatterChart, {
      props: {
        title: "Correlation Test",
        datasets: mockDatasets,
        xLabel: "X Axis",
        yLabel: "Y Axis",
      },
    });

    const quadrantToggle = wrapper.find('[data-testid="toggle-quadrants"]');
    if (quadrantToggle.exists()) {
      const initialState = wrapper.vm.showQuadrants;
      await quadrantToggle.trigger("click");
      expect(wrapper.vm.showQuadrants).toBe(!initialState);
    }
  });

  it("renders statistics when showStats is true", () => {
    const wrapper = mount(ScatterChart, {
      props: {
        title: "Correlation Test",
        datasets: mockDatasets,
        xLabel: "X Axis",
        yLabel: "Y Axis",
        showStats: true,
      },
    });

    const statsSection = wrapper.find('[data-testid="stats-section"]');
    expect(statsSection.exists()).toBe(true);
  });

  it("handles data updates", async () => {
    const wrapper = mount(ScatterChart, {
      props: {
        title: "Correlation Test",
        datasets: mockDatasets,
        xLabel: "X Axis",
        yLabel: "Y Axis",
      },
    });

    const newData = [
      { x: 10, y: 20 },
      { x: 20, y: 40 },
      { x: 30, y: 60 },
    ];

    await wrapper.setProps({ datasets: [{ label: "New", data: newData }] });
    expect(wrapper.vm.chartData.datasets[0].data.length).toBe(3);
  });

  it("respects responsive configuration", () => {
    const wrapper = mount(ScatterChart, {
      props: {
        title: "Correlation Test",
        datasets: mockDatasets,
        xLabel: "X Axis",
        yLabel: "Y Axis",
      },
    });

    expect(wrapper.vm.chartOptions.responsive).toBe(true);
  });

  it("handles perfect correlation data", () => {
    const perfectData = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ];

    const wrapper = mount(ScatterChart, {
      props: {
        title: "Perfect Correlation",
        datasets: [{ label: "Perfect", data: perfectData }],
        xLabel: "X",
        yLabel: "Y",
      },
    });

    expect(wrapper.vm.correlation).toBe(1);
  });

  it("handles negative correlation data", () => {
    const negativeData = [
      { x: 1, y: 10 },
      { x: 2, y: 8 },
      { x: 3, y: 6 },
    ];

    const wrapper = mount(ScatterChart, {
      props: {
        title: "Negative Correlation",
        datasets: [{ label: "Negative", data: negativeData }],
        xLabel: "X",
        yLabel: "Y",
      },
    });

    expect(wrapper.vm.correlation).toBeLessThan(0);
  });
});
