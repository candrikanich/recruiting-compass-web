import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CoachMetricsPanel from "~/components/Coach/CoachMetricsPanel.vue";
import type {
  CoachMetrics,
  CoachComparison,
} from "~/composables/useCoachAnalytics";

const metrics = (over: Partial<CoachMetrics> = {}): CoachMetrics => ({
  totalInteractions: 6,
  responseRate: 50,
  averageResponseTime: 12,
  lastContactDate: new Date().toISOString(),
  daysSinceContact: 3,
  preferredMethod: "email",
  outboundCount: 4,
  inboundCount: 2,
  ...over,
});

describe("CoachMetricsPanel", () => {
  it("shows an empty state with no interactions", () => {
    const wrapper = mount(CoachMetricsPanel, {
      props: {
        metrics: metrics({ totalInteractions: 0 }),
        comparison: null,
        insights: [],
      },
    });
    expect(wrapper.text()).toContain("No analytics yet");
  });

  it("renders the metrics rows", () => {
    const wrapper = mount(CoachMetricsPanel, {
      props: { metrics: metrics(), comparison: null, insights: [] },
    });
    const text = wrapper.text();
    // Total / days-since / preferred live in CoachStatsGrid; the panel carries
    // the non-duplicated analytics only.
    expect(text).toContain("Sent / received");
    expect(text).toContain("Response rate");
    expect(text).toContain("50%");
    expect(text).not.toContain("Total interactions");
  });

  it("shows the ranking line only with 2+ coaches", () => {
    const comparison: CoachComparison = {
      coach: metrics(),
      schoolAverage: { responseRate: 40 },
      rank: 2,
      totalCoaches: 5,
    };
    const wrapper = mount(CoachMetricsPanel, {
      props: { metrics: metrics(), comparison, insights: [] },
    });
    expect(wrapper.text()).toContain("#2");
    expect(wrapper.text()).toContain("of 5 coaches");
    expect(wrapper.text()).toContain("Above");
  });

  it("hides the ranking line for a lone coach", () => {
    const comparison: CoachComparison = {
      coach: metrics(),
      schoolAverage: { responseRate: 50 },
      rank: 1,
      totalCoaches: 1,
    };
    const wrapper = mount(CoachMetricsPanel, {
      props: { metrics: metrics(), comparison, insights: [] },
    });
    expect(wrapper.text()).not.toContain("of 1 coaches");
  });

  it("lists insights", () => {
    const wrapper = mount(CoachMetricsPanel, {
      props: {
        metrics: metrics(),
        comparison: null,
        insights: ["Quick responder - average 12 hours"],
      },
    });
    expect(wrapper.text()).toContain("Quick responder");
  });
});
