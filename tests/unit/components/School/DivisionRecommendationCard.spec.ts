import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import DivisionRecommendationCard from "~/components/School/DivisionRecommendationCard.vue";
import type { DivisionRecommendation } from "~/types/timeline";

describe("DivisionRecommendationCard", () => {
  const mockRecommendation: DivisionRecommendation = {
    shouldConsiderOtherDivisions: true,
    message: "Consider exploring other divisions for better opportunities",
    recommendedDivisions: ["D2", "D3"],
  };

  describe("rendering", () => {
    it("renders recommendation message", () => {
      const wrapper = mount(DivisionRecommendationCard, {
        props: { recommendation: mockRecommendation },
      });

      expect(wrapper.text()).toContain(
        "Consider exploring other divisions for better opportunities",
      );
    });

    it("renders heading", () => {
      const wrapper = mount(DivisionRecommendationCard, {
        props: { recommendation: mockRecommendation },
      });

      expect(wrapper.text()).toContain("Consider Other Divisions");
    });

    it("renders icon", () => {
      const wrapper = mount(DivisionRecommendationCard, {
        props: { recommendation: mockRecommendation },
      });

      const svg = wrapper.find("svg");
      expect(svg.exists()).toBe(true);
      expect(svg.classes()).toContain("text-blue-600");
    });
  });

  describe("recommended divisions", () => {
    it("renders all recommended divisions", () => {
      const wrapper = mount(DivisionRecommendationCard, {
        props: { recommendation: mockRecommendation },
      });

      expect(wrapper.text()).toContain("D2");
      expect(wrapper.text()).toContain("D3");
    });

    it("renders single recommended division", () => {
      const singleDivisionRec = {
        ...mockRecommendation,
        recommendedDivisions: ["D2"],
      };
      const wrapper = mount(DivisionRecommendationCard, {
        props: { recommendation: singleDivisionRec },
      });

      expect(wrapper.text()).toContain("D2");
      expect(wrapper.text()).not.toContain("D3");
    });

    it("renders multiple recommended divisions", () => {
      const multipleDivisionsRec = {
        ...mockRecommendation,
        recommendedDivisions: ["D1", "D2", "D3", "JUCO"],
      };
      const wrapper = mount(DivisionRecommendationCard, {
        props: { recommendation: multipleDivisionsRec },
      });

      expect(wrapper.text()).toContain("D1");
      expect(wrapper.text()).toContain("D2");
      expect(wrapper.text()).toContain("D3");
      expect(wrapper.text()).toContain("JUCO");
    });

    it("handles empty recommended divisions array", () => {
      const emptyDivisionsRec = {
        ...mockRecommendation,
        recommendedDivisions: [],
      };
      const wrapper = mount(DivisionRecommendationCard, {
        props: { recommendation: emptyDivisionsRec },
      });

      // Component should render but without division badges
      expect(wrapper.text()).toContain("Consider Other Divisions");
      expect(wrapper.text()).toContain(
        "Consider exploring other divisions for better opportunities",
      );
    });
  });

  describe("styling", () => {
    it("applies correct container classes", () => {
      const wrapper = mount(DivisionRecommendationCard, {
        props: { recommendation: mockRecommendation },
      });

      const container = wrapper.find(".bg-blue-50");
      expect(container.exists()).toBe(true);
      expect(container.classes()).toContain("rounded-xl");
      expect(container.classes()).toContain("border-blue-200");
    });

    it("applies correct badge classes to divisions", () => {
      const wrapper = mount(DivisionRecommendationCard, {
        props: { recommendation: mockRecommendation },
      });

      const badges = wrapper.findAll(".bg-blue-100.text-blue-700");
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe("different messages", () => {
    it("renders custom message", () => {
      const customMessage = {
        ...mockRecommendation,
        message: "Your current division may not be the best fit",
      };
      const wrapper = mount(DivisionRecommendationCard, {
        props: { recommendation: customMessage },
      });

      expect(wrapper.text()).toContain(
        "Your current division may not be the best fit",
      );
    });

    it("renders long message", () => {
      const longMessage = {
        ...mockRecommendation,
        message:
          "Based on your academic performance and athletic ability, we recommend considering Division II and Division III schools where you may have better opportunities for playing time and academic success.",
      };
      const wrapper = mount(DivisionRecommendationCard, {
        props: { recommendation: longMessage },
      });

      expect(wrapper.text()).toContain("Based on your academic performance");
      expect(wrapper.text()).toContain("better opportunities");
    });
  });
});
