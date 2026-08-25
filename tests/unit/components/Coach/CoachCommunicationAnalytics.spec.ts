import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CoachCommunicationAnalytics from "~/components/Coach/detail/CoachCommunicationAnalytics.vue";

describe("CoachCommunicationAnalytics", () => {
  it("renders sent/received and response rate", () => {
    const w = mount(CoachCommunicationAnalytics, {
      props: { sent: 8, received: 5, responseRate: 100 },
    });
    expect(w.text()).toContain("8 / 5");
    expect(w.text()).toContain("100%");
  });

  it("shows the response rate on the gauge", () => {
    const w = mount(CoachCommunicationAnalytics, {
      props: { sent: 3, received: 1, responseRate: 62 },
    });
    expect(w.get('[data-testid="response-gauge-value"]').text()).toContain("62%");
  });

  it("shows a Great Progress caption at or above the 75 threshold", () => {
    const w = mount(CoachCommunicationAnalytics, {
      props: { sent: 8, received: 5, responseRate: 100 },
    });
    expect(w.text()).toContain("Great Progress");
  });

  it("shows a Building Momentum caption between 40 and 74", () => {
    const w = mount(CoachCommunicationAnalytics, {
      props: { sent: 5, received: 2, responseRate: 50 },
    });
    expect(w.text()).toContain("Building Momentum");
  });

  it("shows a Needs Attention caption below 40", () => {
    const w = mount(CoachCommunicationAnalytics, {
      props: { sent: 5, received: 0, responseRate: 0 },
    });
    expect(w.text()).toContain("Needs Attention");
  });
});
