import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PerformanceMetricsWidget from "~/components/Dashboard/PerformanceMetricsWidget.vue";

type WidgetMetric = {
  id: string;
  metric_type: string;
  value: number;
  unit?: string;
};

const createWidgetMetric = (
  overrides: Partial<WidgetMetric> = {},
): WidgetMetric => ({
  id: `metric-${Math.random().toString(36).substring(2, 9)}`,
  metric_type: "exit_velo",
  value: 92.5,
  unit: "mph",
  ...overrides,
});

const NuxtLinkStub = {
  template: '<a :href="to"><slot /></a>',
  props: ["to"],
};

const mountWidget = (
  props: {
    metrics?: WidgetMetric[];
    topMetrics?: WidgetMetric[];
    showPerformance?: boolean;
  } = {},
) =>
  mount(PerformanceMetricsWidget, {
    props: {
      metrics: props.metrics ?? [],
      topMetrics: props.topMetrics ?? [],
      showPerformance: props.showPerformance ?? true,
    },
    global: {
      stubs: {
        NuxtLink: NuxtLinkStub,
      },
    },
  });

describe("PerformanceMetricsWidget", () => {
  describe("rendering", () => {
    it("renders widget with title when showPerformance is true", () => {
      const wrapper = mountWidget({ metrics: [createWidgetMetric()] });
      expect(wrapper.text()).toContain("Performance Metrics");
    });

    it("does not render when showPerformance is false", () => {
      const wrapper = mountWidget({ showPerformance: false });
      expect(wrapper.text()).toBe("");
    });

    it("shows empty state when no metrics exist", () => {
      const wrapper = mountWidget({ metrics: [] });
      expect(wrapper.text()).toContain("No performance metrics logged yet");
      expect(wrapper.text()).toContain("Log Your First Metric");
    });

    it("shows metrics grid when metrics exist", () => {
      const topMetrics = [
        createWidgetMetric({
          id: "m-1",
          metric_type: "height",
          value: 72,
          unit: "in",
        }),
        createWidgetMetric({
          id: "m-2",
          metric_type: "weight",
          value: 185,
          unit: "lbs",
        }),
      ];
      const wrapper = mountWidget({
        metrics: topMetrics,
        topMetrics,
      });

      expect(wrapper.text()).toContain("height");
      expect(wrapper.text()).toContain("72");
      expect(wrapper.text()).toContain("in");
      expect(wrapper.text()).toContain("weight");
      expect(wrapper.text()).toContain("185");
      expect(wrapper.text()).toContain("lbs");
    });
  });

  describe("metric display formatting", () => {
    it("displays metric type label", () => {
      const topMetrics = [createWidgetMetric({ metric_type: "velocity" })];
      const wrapper = mountWidget({ metrics: topMetrics, topMetrics });

      expect(wrapper.text()).toContain("velocity");
    });

    it("displays metric value", () => {
      const topMetrics = [createWidgetMetric({ value: 88.3 })];
      const wrapper = mountWidget({ metrics: topMetrics, topMetrics });

      expect(wrapper.text()).toContain("88.3");
    });

    it("displays unit when provided", () => {
      const topMetrics = [createWidgetMetric({ value: 60, unit: "sec" })];
      const wrapper = mountWidget({ metrics: topMetrics, topMetrics });

      expect(wrapper.text()).toContain("sec");
    });

    it("does not display unit span when unit is undefined", () => {
      const topMetrics = [createWidgetMetric({ value: 42, unit: undefined })];
      const wrapper = mountWidget({ metrics: topMetrics, topMetrics });

      expect(wrapper.text()).toContain("42");
    });

    it("applies correct color class for known metric types", () => {
      const topMetrics = [
        createWidgetMetric({ id: "m-1", metric_type: "height", value: 72 }),
        createWidgetMetric({ id: "m-2", metric_type: "weight", value: 185 }),
        createWidgetMetric({ id: "m-3", metric_type: "velocity", value: 88 }),
      ];
      const wrapper = mountWidget({ metrics: topMetrics, topMetrics });

      const valueDivs = wrapper.findAll(".text-xl.font-bold");
      expect(valueDivs[0].classes()).toContain("text-blue-600");
      expect(valueDivs[1].classes()).toContain("text-emerald-600");
      expect(valueDivs[2].classes()).toContain("text-orange-600");
    });

    it("applies default color class for unknown metric types", () => {
      const topMetrics = [
        createWidgetMetric({ metric_type: "custom_metric", value: 10 }),
      ];
      const wrapper = mountWidget({ metrics: topMetrics, topMetrics });

      const valueDiv = wrapper.find(".text-xl.font-bold");
      expect(valueDiv.classes()).toContain("text-slate-600");
    });
  });

  describe("navigation links", () => {
    it("shows View All Metrics link when metrics exist", () => {
      const topMetrics = [createWidgetMetric()];
      const wrapper = mountWidget({ metrics: topMetrics, topMetrics });

      const link = wrapper
        .findAll("a")
        .find((a) => a.text().includes("View All Metrics"));
      expect(link).toBeTruthy();
      expect(link!.attributes("href")).toBe("/performance");
    });

    it("shows Log Your First Metric link when no metrics exist", () => {
      const wrapper = mountWidget({ metrics: [] });

      const link = wrapper
        .findAll("a")
        .find((a) => a.text().includes("Log Your First Metric"));
      expect(link).toBeTruthy();
      expect(link!.attributes("href")).toBe("/performance");
    });
  });
});
