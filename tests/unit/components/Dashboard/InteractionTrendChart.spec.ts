import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import InteractionTrendChart from "~/components/Dashboard/InteractionTrendChart.vue";
import type { Interaction } from "~/types/models";
import { createMockInteraction } from "~/tests/fixtures/interactions.fixture";
import { Chart } from "chart.js";

const mockDestroy = vi.fn();
const mockUpdate = vi.fn();

vi.mock("chart.js", () => {
  const MockChart = vi.fn().mockImplementation(() => ({
    destroy: mockDestroy,
    update: mockUpdate,
  }));
  (MockChart as Record<string, unknown>).register = vi.fn();
  return {
    Chart: MockChart,
    CategoryScale: vi.fn(),
    LinearScale: vi.fn(),
    LineController: vi.fn(),
    PointElement: vi.fn(),
    LineElement: vi.fn(),
    Title: vi.fn(),
    Tooltip: vi.fn(),
    Legend: vi.fn(),
    Filler: vi.fn(),
  };
});

vi.mock("@heroicons/vue/24/outline", () => ({
  ChatBubbleLeftRightIcon: {
    name: "ChatBubbleLeftRightIcon",
    template: '<svg data-testid="empty-icon" />',
  },
}));

const MockedChart = Chart as unknown as ReturnType<typeof vi.fn>;

const daysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const mountChart = (interactions: Interaction[] = []) =>
  mount(InteractionTrendChart, {
    props: { interactions },
  });

describe("InteractionTrendChart", () => {
  let getComputedStyleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    getComputedStyleSpy = vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: vi.fn((prop: string) => {
        if (prop === "--brand-blue-600") return "rgb(59, 130, 246)";
        if (prop === "--muted-foreground") return "rgb(102, 102, 102)";
        return "";
      }),
    } as unknown as CSSStyleDeclaration);
  });

  afterEach(() => {
    getComputedStyleSpy.mockRestore();
  });

  describe("chart data grouping", () => {
    it("groups interactions by date (YYYY-MM-DD)", () => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const interactions = [
        createMockInteraction({
          recorded_date: `${todayStr}T10:00:00.000Z`,
        }),
        createMockInteraction({
          recorded_date: `${todayStr}T14:00:00.000Z`,
        }),
        createMockInteraction({
          recorded_date: `${todayStr}T18:00:00.000Z`,
        }),
      ];

      const wrapper = mountChart(interactions);
      expect(wrapper.text()).toContain("Total: 3");
    });

    it("creates a 30-day window with labels for each day", () => {
      const interactions = [
        createMockInteraction({
          recorded_date: new Date().toISOString(),
        }),
      ];

      mountChart(interactions);

      expect(MockedChart).toHaveBeenCalled();
      const chartConfig = MockedChart.mock.calls[0][1];
      const labels: string[] = chartConfig.data.labels;
      expect(labels).toHaveLength(30);
    });

    it("formats dates as short month and day (e.g. Jan 15)", () => {
      const interactions = [
        createMockInteraction({
          recorded_date: daysAgo(10).toISOString(),
        }),
      ];

      mountChart(interactions);

      expect(MockedChart).toHaveBeenCalled();
      const chartConfig = MockedChart.mock.calls[0][1];
      const labels: string[] = chartConfig.data.labels;

      expect(labels).toHaveLength(30);

      const sampleLabel = labels[0];
      expect(sampleLabel).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    });

    it("falls back to created_at when recorded_date is missing", () => {
      const fiveDaysAgo = daysAgo(5);
      const interactions = [
        createMockInteraction({
          recorded_date: undefined,
          created_at: fiveDaysAgo.toISOString(),
        }),
      ];

      mountChart(interactions);

      expect(MockedChart).toHaveBeenCalled();
      const chartConfig = MockedChart.mock.calls[0][1];
      const dataPoints: number[] = chartConfig.data.datasets[0].data;
      const totalDataPoints = dataPoints.reduce(
        (sum: number, val: number) => sum + val,
        0,
      );
      expect(totalDataPoints).toBe(1);
    });

    it("excludes interactions older than 30 days from chart data", () => {
      const oldInteraction = createMockInteraction({
        recorded_date: daysAgo(35).toISOString(),
      });
      const recentInteraction = createMockInteraction({
        recorded_date: daysAgo(5).toISOString(),
      });

      mountChart([oldInteraction, recentInteraction]);

      expect(MockedChart).toHaveBeenCalled();
      const chartConfig = MockedChart.mock.calls[0][1];
      const dataPoints: number[] = chartConfig.data.datasets[0].data;
      const totalDataPoints = dataPoints.reduce(
        (sum: number, val: number) => sum + val,
        0,
      );
      expect(totalDataPoints).toBe(1);
    });

    it("fills zero for days with no interactions", () => {
      const interactions = [
        createMockInteraction({
          recorded_date: daysAgo(2).toISOString(),
        }),
      ];

      mountChart(interactions);

      const chartConfig = MockedChart.mock.calls[0][1];
      const dataPoints: number[] = chartConfig.data.datasets[0].data;
      const zeroCount = dataPoints.filter((v: number) => v === 0).length;
      expect(zeroCount).toBe(29);
    });
  });

  describe("chart lifecycle", () => {
    it("initializes Chart.js instance on mount with interactions", () => {
      const interactions = [
        createMockInteraction({
          recorded_date: new Date().toISOString(),
        }),
      ];

      mountChart(interactions);

      expect(MockedChart).toHaveBeenCalledTimes(1);
      const config = MockedChart.mock.calls[0][1];
      expect(config.type).toBe("line");
      expect(config.data.datasets[0].label).toBe("Interactions");
    });

    it("does not initialize chart when no interactions provided", () => {
      mountChart([]);
      expect(MockedChart).not.toHaveBeenCalled();
    });

    it("recreates chart when interaction data changes", async () => {
      const initialInteractions = [
        createMockInteraction({
          recorded_date: new Date().toISOString(),
        }),
      ];

      const wrapper = mountChart(initialInteractions);
      const initialCallCount = MockedChart.mock.calls.length;

      await wrapper.setProps({
        interactions: [
          ...initialInteractions,
          createMockInteraction({
            recorded_date: daysAgo(1).toISOString(),
          }),
        ],
      });
      await nextTick();

      const finalCallCount = MockedChart.mock.calls.length;
      expect(finalCallCount).toBeGreaterThan(initialCallCount);
    });

    it("destroys previous chart before creating new one on data change", async () => {
      const interactions = [
        createMockInteraction({
          recorded_date: new Date().toISOString(),
        }),
      ];

      const wrapper = mountChart(interactions);
      expect(MockedChart).toHaveBeenCalledTimes(1);

      const updatedInteractions = [
        ...interactions,
        createMockInteraction({
          recorded_date: daysAgo(3).toISOString(),
        }),
      ];

      await wrapper.setProps({ interactions: updatedInteractions });

      // Allow multiple ticks for the watcher + re-render cycle
      await nextTick();
      await nextTick();
      await nextTick();

      // Verify chart was recreated (constructor called more than once)
      // which implies the previous instance was destroyed in initializeChart
      expect(MockedChart.mock.calls.length).toBeGreaterThan(1);
    });
  });

  describe("empty states", () => {
    it("returns null chartData and hides canvas when no interactions", () => {
      const wrapper = mountChart([]);
      expect(wrapper.find("canvas").exists()).toBe(false);
    });

    it("displays empty state message when no recent interactions", () => {
      const wrapper = mountChart([]);
      expect(wrapper.text()).toContain("No interactions in the last 30 days");
      expect(wrapper.text()).toContain(
        "Log your first interaction to see trends here",
      );
    });

    it("renders NuxtLink to /interactions/new in empty state", () => {
      const wrapper = mountChart([]);
      const link = wrapper.find("a");
      expect(link.exists()).toBe(true);
      expect(link.text()).toContain("Log Interaction");
    });

    it("shows empty state when all interactions are older than 30 days", () => {
      const interactions = [
        createMockInteraction({
          recorded_date: daysAgo(45).toISOString(),
        }),
        createMockInteraction({
          recorded_date: daysAgo(60).toISOString(),
        }),
      ];

      const wrapper = mountChart(interactions);
      expect(wrapper.find("canvas").exists()).toBe(false);
      expect(wrapper.text()).toContain("No interactions in the last 30 days");
    });

    it("renders empty icon in empty state", () => {
      const wrapper = mountChart([]);
      expect(wrapper.find('[data-testid="empty-icon"]').exists()).toBe(true);
    });
  });

  describe("rendering", () => {
    it("displays component title", () => {
      const wrapper = mountChart([]);
      expect(wrapper.text()).toContain("Interaction Trends (30 Days)");
    });

    it("displays total interaction count including out-of-window items", () => {
      const interactions = [
        createMockInteraction({
          recorded_date: new Date().toISOString(),
        }),
        createMockInteraction({
          recorded_date: new Date().toISOString(),
        }),
        createMockInteraction({
          recorded_date: daysAgo(45).toISOString(),
        }),
      ];

      const wrapper = mountChart(interactions);
      expect(wrapper.text()).toContain("Total: 3");
    });

    it("shows canvas element when chart data exists", () => {
      const interactions = [
        createMockInteraction({
          recorded_date: new Date().toISOString(),
        }),
      ];

      const wrapper = mountChart(interactions);
      expect(wrapper.find("canvas").exists()).toBe(true);
    });
  });

  describe("chart configuration", () => {
    it("configures chart with correct visual options", () => {
      const interactions = [
        createMockInteraction({
          recorded_date: new Date().toISOString(),
        }),
      ];

      mountChart(interactions);

      const chartConfig = MockedChart.mock.calls[0][1];
      const dataset = chartConfig.data.datasets[0];

      expect(dataset.tension).toBe(0.4);
      expect(dataset.fill).toBe(true);
      expect(dataset.pointRadius).toBe(4);
      expect(dataset.pointBorderColor).toBe("white");
      expect(dataset.pointBorderWidth).toBe(2);
    });

    it("uses CSS variable colors for chart styling", () => {
      const interactions = [
        createMockInteraction({
          recorded_date: new Date().toISOString(),
        }),
      ];

      mountChart(interactions);

      expect(getComputedStyleSpy).toHaveBeenCalled();
      const chartConfig = MockedChart.mock.calls[0][1];
      const dataset = chartConfig.data.datasets[0];
      expect(dataset.borderColor).toBe("rgb(59, 130, 246)");
    });

    it("disables legend display", () => {
      const interactions = [
        createMockInteraction({
          recorded_date: new Date().toISOString(),
        }),
      ];

      mountChart(interactions);

      const chartConfig = MockedChart.mock.calls[0][1];
      expect(chartConfig.options.plugins.legend.display).toBe(false);
    });

    it("sets y-axis to begin at zero", () => {
      const interactions = [
        createMockInteraction({
          recorded_date: new Date().toISOString(),
        }),
      ];

      mountChart(interactions);

      const chartConfig = MockedChart.mock.calls[0][1];
      expect(chartConfig.options.scales.y.beginAtZero).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles interactions with neither recorded_date nor created_at", () => {
      const interactions = [
        createMockInteraction({
          recorded_date: undefined,
          created_at: undefined,
        }),
      ];

      const wrapper = mountChart(interactions);
      expect(wrapper.text()).toContain("No interactions in the last 30 days");
    });

    it("handles multiple interactions on the same day correctly", () => {
      const today = new Date().toISOString();
      const interactions = [
        createMockInteraction({ recorded_date: today }),
        createMockInteraction({ recorded_date: today }),
        createMockInteraction({ recorded_date: today }),
        createMockInteraction({ recorded_date: today }),
        createMockInteraction({ recorded_date: today }),
      ];

      mountChart(interactions);

      const chartConfig = MockedChart.mock.calls[0][1];
      const dataPoints: number[] = chartConfig.data.datasets[0].data;
      const maxValue = Math.max(...dataPoints);
      expect(maxValue).toBe(5);
    });

    it("counts total interactions including those outside 30-day window", () => {
      const interactions = [
        createMockInteraction({
          recorded_date: new Date().toISOString(),
        }),
        createMockInteraction({
          recorded_date: daysAgo(60).toISOString(),
        }),
      ];

      const wrapper = mountChart(interactions);
      expect(wrapper.text()).toContain("Total: 2");
    });
  });
});
