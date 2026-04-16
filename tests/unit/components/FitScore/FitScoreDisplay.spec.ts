import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import FitScoreDisplay from "~/components/FitScore/FitScoreDisplay.vue";
import type { FitScoreResult } from "~/types/timeline";

const withBreakdown: FitScoreResult = {
  score: 75,
  tier: "match",
  breakdown: {
    athleticFit: 30,
    academicFit: 20,
    opportunityFit: 15,
    personalFit: 10,
  },
  missingDimensions: [],
};

const emptyBreakdown: FitScoreResult = {
  ...withBreakdown,
  breakdown: {},
};

describe("FitScoreDisplay", () => {
  describe("score display", () => {
    it("renders the numeric score", () => {
      const wrapper = mount(FitScoreDisplay, {
        props: { fitScore: withBreakdown },
      });
      expect(wrapper.text()).toContain("75");
      expect(wrapper.text()).toContain("/100");
    });

    it("renders the tier badge", () => {
      const wrapper = mount(FitScoreDisplay, {
        props: { fitScore: withBreakdown },
      });
      expect(wrapper.text()).toContain("Match");
    });

    it("renders missing dimensions warning when present", () => {
      const wrapper = mount(FitScoreDisplay, {
        props: {
          fitScore: { ...withBreakdown, missingDimensions: ["Athletic Fit"] },
        },
      });
      expect(wrapper.text()).toContain("Athletic Fit");
    });
  });

  describe("recommendation", () => {
    it("shows recommendation text when showRecommendation is true", () => {
      const wrapper = mount(FitScoreDisplay, {
        props: { fitScore: withBreakdown, showRecommendation: true },
      });
      expect(wrapper.text()).toContain("Excellent fit");
    });

    it("hides recommendation when showRecommendation is false", () => {
      const wrapper = mount(FitScoreDisplay, {
        props: { fitScore: withBreakdown, showRecommendation: false },
      });
      expect(wrapper.text()).not.toContain("Excellent fit");
    });
  });

  describe("breakdown toggle", () => {
    it("does not render breakdown when showBreakdown is false", () => {
      const wrapper = mount(FitScoreDisplay, {
        props: { fitScore: withBreakdown, showBreakdown: false },
      });
      expect(wrapper.find("details").exists()).toBe(false);
    });

    it("does not render breakdown when breakdown has no data", () => {
      const wrapper = mount(FitScoreDisplay, {
        props: { fitScore: emptyBreakdown, showBreakdown: true },
      });
      expect(wrapper.find("details").exists()).toBe(false);
    });

    it("renders a details element when showBreakdown is true and data exists", () => {
      const wrapper = mount(FitScoreDisplay, {
        props: { fitScore: withBreakdown, showBreakdown: true },
      });
      expect(wrapper.find("details").exists()).toBe(true);
    });

    it("breakdown starts collapsed by default", () => {
      const wrapper = mount(FitScoreDisplay, {
        props: { fitScore: withBreakdown, showBreakdown: true },
      });
      expect(
        (wrapper.find("details").element as HTMLDetailsElement).open,
      ).toBe(false);
    });

    it("summary label contains breakdown text", () => {
      const wrapper = mount(FitScoreDisplay, {
        props: { fitScore: withBreakdown, showBreakdown: true },
      });
      expect(wrapper.find("summary").text()).toContain("Fit Score Breakdown");
    });

    it("shows breakdown scores when details is opened", async () => {
      const wrapper = mount(FitScoreDisplay, {
        props: { fitScore: withBreakdown, showBreakdown: true },
      });
      const details = wrapper.find("details").element as HTMLDetailsElement;
      details.open = true;
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain("30/40");
      expect(wrapper.text()).toContain("20/25");
      expect(wrapper.text()).toContain("15/20");
      expect(wrapper.text()).toContain("10/15");
    });
  });
});
