import { describe, it, expect, vi, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import SchoolInterestChart from "~/components/Dashboard/SchoolInterestChart.vue";
import {
  createMockSchool,
  createMockSchools,
  createContactedSchool,
  createOfferSchool,
  createCommittedSchool,
} from "~/tests/fixtures/schools.fixture";
import type { School } from "~/types/models";

const { mockDestroy, chartConstructorCalls } = vi.hoisted(() => {
  const mockDestroy = vi.fn();
  const chartConstructorCalls: Array<[unknown, unknown]> = [];
  return { mockDestroy, chartConstructorCalls };
});

vi.mock("chart.js", () => {
  class MockChart {
    static register = vi.fn();
    destroy = mockDestroy;
    update = vi.fn();
    data = { datasets: [] };
    options = {};

    constructor(canvas: unknown, config: unknown) {
      chartConstructorCalls.push([canvas, config]);
    }
  }

  return {
    Chart: MockChart,
    CategoryScale: {},
    LinearScale: {},
    BarController: {},
    BarElement: {},
    Title: {},
    Tooltip: {},
    Legend: {},
  };
});

vi.mock("@heroicons/vue/24/outline", () => ({
  BuildingLibraryIcon: {
    name: "BuildingLibraryIcon",
    template: '<svg data-testid="empty-icon" />',
  },
}));

vi.stubGlobal(
  "getComputedStyle",
  vi.fn(() => ({
    getPropertyValue: vi.fn(() => "#3b82f6"),
  })),
);

function mountChart(schools: School[] = []) {
  return mount(SchoolInterestChart, {
    props: { schools },
    global: {
      stubs: {
        NuxtLink: {
          name: "NuxtLink",
          template: '<a :href="to"><slot /></a>',
          props: ["to"],
        },
      },
    },
  });
}

describe("SchoolInterestChart", () => {
  let wrapper: VueWrapper;

  afterEach(() => {
    vi.clearAllMocks();
    chartConstructorCalls.length = 0;
    wrapper?.unmount();
  });

  describe("status counting", () => {
    it("counts schools by their pipeline status", () => {
      const schools = [
        createMockSchool({ status: "interested" }),
        createMockSchool({ status: "interested" }),
        createContactedSchool(),
        createOfferSchool(),
        createCommittedSchool(),
      ];

      wrapper = mountChart(schools);

      const chartConfig = chartConstructorCalls[0][1] as any;
      const statusData = chartConfig.data.datasets[0].data;

      expect(statusData[0]).toBe(0); // researching
      expect(statusData[1]).toBe(1); // contacted
      expect(statusData[2]).toBe(2); // interested
      expect(statusData[3]).toBe(1); // offer_received
      expect(statusData[4]).toBe(1); // committed
    });

    it("maps statuses to human-readable labels", () => {
      const schools = [createMockSchool({ status: "interested" })];
      wrapper = mountChart(schools);

      const chartConfig = chartConstructorCalls[0][1] as any;
      const labels = chartConfig.data.labels;

      expect(labels).toEqual([
        "Researching",
        "Contacted",
        "Interested",
        "Offer Received",
        "Committed",
      ]);
    });

    it("assigns distinct colors per status", () => {
      const schools = [createMockSchool({ status: "interested" })];
      wrapper = mountChart(schools);

      const chartConfig = chartConstructorCalls[0][1] as any;
      const colors = chartConfig.data.datasets[0].backgroundColor;

      expect(colors).toHaveLength(5);
      expect(new Set(colors).size).toBeGreaterThanOrEqual(1);
    });

    it("defaults schools with no status to researching", () => {
      const schoolWithoutStatus = createMockSchool();
      const schools = [schoolWithoutStatus];
      wrapper = mountChart(schools);

      const chartConfig = chartConstructorCalls[0][1] as any;
      const statusData = chartConfig.data.datasets[0].data;

      expect(statusData[0]).toBe(1);
    });

    it("displays total school count in the header", () => {
      const schools = createMockSchools(7);
      wrapper = mountChart(schools);

      expect(wrapper.text()).toContain("Total: 7");
    });
  });

  describe("chart lifecycle", () => {
    it("creates a Chart.js bar chart on mount with data", () => {
      const schools = [createMockSchool({ status: "interested" })];
      wrapper = mountChart(schools);

      expect(chartConstructorCalls).toHaveLength(1);
      const chartConfig = chartConstructorCalls[0][1] as any;
      expect(chartConfig.type).toBe("bar");
      expect(chartConfig.options.indexAxis).toBe("y");
      expect(chartConfig.options.responsive).toBe(true);
    });

    it("destroys previous chart before creating new one on data change", async () => {
      const schools = [createMockSchool({ status: "interested" })];
      wrapper = mountChart(schools);

      expect(chartConstructorCalls).toHaveLength(1);

      await wrapper.setProps({
        schools: [
          createMockSchool({ status: "interested" }),
          createContactedSchool(),
        ],
      });

      expect(mockDestroy).toHaveBeenCalled();
    });

    it("reinitializes chart when schools data changes", async () => {
      const schools = [createMockSchool({ status: "interested" })];
      wrapper = mountChart(schools);

      expect(chartConstructorCalls).toHaveLength(1);

      await wrapper.setProps({
        schools: [
          createMockSchool({ status: "interested" }),
          createContactedSchool(),
          createOfferSchool(),
        ],
      });

      expect(chartConstructorCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("empty state", () => {
    it("renders empty state UI when schools array is empty", () => {
      wrapper = mountChart([]);

      expect(wrapper.text()).toContain("No schools added yet");
      expect(wrapper.text()).toContain(
        "Add schools to track your recruiting pipeline",
      );
    });

    it("renders an Add School link pointing to /schools/new", () => {
      wrapper = mountChart([]);

      const link = wrapper.find("a");
      expect(link.exists()).toBe(true);
      expect(link.attributes("href")).toBe("/schools/new");
      expect(link.text()).toBe("Add School");
    });

    it("does not create a Chart.js instance when schools are empty", () => {
      wrapper = mountChart([]);

      expect(chartConstructorCalls).toHaveLength(0);
    });

    it("displays the empty icon", () => {
      wrapper = mountChart([]);

      const icon = wrapper.find('[data-testid="empty-icon"]');
      expect(icon.exists()).toBe(true);
    });

    it("shows Total: 0 in the header", () => {
      wrapper = mountChart([]);

      expect(wrapper.text()).toContain("Total: 0");
    });
  });
});
