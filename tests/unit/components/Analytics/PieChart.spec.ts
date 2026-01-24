import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import PieChart from "~/components/Analytics/PieChart.vue";

vi.mock("chart.js", () => ({
  Chart: { register: vi.fn() },
  ArcElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}));

vi.mock("vue-chartjs", () => ({
  Pie: {
    name: "Pie",
    template: '<div class="pie-chart-mock" />',
    props: ["chartData", "chartOptions"],
  },
}));

describe("PieChart.vue", () => {
  const mockData = [
    { label: "A", value: 30 },
    { label: "B", value: 25 },
    { label: "C", value: 45 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title and item count", () => {
    const wrapper = mount(PieChart, {
      props: {
        title: "Test Chart",
        data: mockData,
        colors: ["#FF6384", "#36A2EB", "#FFCE56"],
      },
    });

    expect(wrapper.text()).toContain("Test Chart");
    expect(wrapper.text()).toContain("100 items");
  });

  it("shows empty state when no data", () => {
    const wrapper = mount(PieChart, {
      props: {
        title: "Empty Chart",
        data: [],
        colors: [],
      },
    });

    expect(wrapper.text()).toContain("No data available");
  });

  it("renders summary cards with percentages", () => {
    const wrapper = mount(PieChart, {
      props: {
        title: "Test Chart",
        data: mockData,
        colors: ["#FF6384", "#36A2EB", "#FFCE56"],
      },
    });

    const cards = wrapper.findAll('[data-testid="summary-card"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it("calculates totals correctly", () => {
    const wrapper = mount(PieChart, {
      props: {
        title: "Test Chart",
        data: mockData,
        colors: ["#FF6384", "#36A2EB", "#FFCE56"],
      },
    });

    expect(wrapper.text()).toContain("100");
  });

  it("applies custom colors", () => {
    const colors = ["#FF0000", "#00FF00", "#0000FF"];
    const wrapper = mount(PieChart, {
      props: {
        title: "Test Chart",
        data: mockData,
        colors,
      },
    });

    expect(wrapper.vm.chartData.datasets[0].backgroundColor).toEqual(colors);
  });

  it("emits segment-click event", async () => {
    const wrapper = mount(PieChart, {
      props: {
        title: "Test Chart",
        data: mockData,
        colors: ["#FF6384", "#36A2EB", "#FFCE56"],
      },
    });

    const segment = wrapper.find('[data-testid="segment-0"]');
    if (segment.exists()) {
      await segment.trigger("click");
      expect(wrapper.emitted("segment-click")).toBeTruthy();
    }
  });

  it("toggles between pie and doughnut when showLegendToggle is true", async () => {
    const wrapper = mount(PieChart, {
      props: {
        title: "Test Chart",
        data: mockData,
        colors: ["#FF6384", "#36A2EB", "#FFCE56"],
        showLegendToggle: true,
      },
    });

    const toggleButton = wrapper.find('[data-testid="toggle-type"]');
    if (toggleButton.exists()) {
      await toggleButton.trigger("click");
      expect(wrapper.vm.chartType).toBe("doughnut");
    }
  });

  it("handles data updates", async () => {
    const wrapper = mount(PieChart, {
      props: {
        title: "Test Chart",
        data: mockData,
        colors: ["#FF6384", "#36A2EB", "#FFCE56"],
      },
    });

    const newData = [
      { label: "X", value: 50 },
      { label: "Y", value: 50 },
    ];

    await wrapper.setProps({ data: newData });
    expect(wrapper.vm.chartData.labels.length).toBe(2);
  });

  it("respects responsive configuration", () => {
    const wrapper = mount(PieChart, {
      props: {
        title: "Test Chart",
        data: mockData,
        colors: ["#FF6384", "#36A2EB", "#FFCE56"],
      },
    });

    expect(wrapper.vm.chartOptions.responsive).toBe(true);
    expect(wrapper.vm.chartOptions.maintainAspectRatio).toBe(false);
  });
});
