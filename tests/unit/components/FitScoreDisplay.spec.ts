import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import FitScoreDisplay from "~/components/FitScore/FitScoreDisplay.vue";
import type { FitScoreResult } from "~/types/timeline";

describe("FitScoreDisplay", () => {
  const createMockFitScore = (overrides?: Partial<FitScoreResult>): FitScoreResult => ({
    score: 82,
    tier: "match",
    breakdown: {
      athleticFit: 32,
      academicFit: 20,
      opportunityFit: 18,
      personalFit: 12,
    },
    missingDimensions: [],
    ...overrides,
  });

  it("renders fit score and tier badge", () => {
    const fitScore = createMockFitScore();
    const wrapper = mount(FitScoreDisplay, {
      props: {
        fitScore,
        showBreakdown: false,
      },
    });

    expect(wrapper.text()).toContain("82");
    expect(wrapper.text()).toContain("Match");
  });

  it("displays correct color for match tier (score >= 70)", () => {
    const fitScore = createMockFitScore({ score: 75, tier: "match" });
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showBreakdown: false },
    });

    // Check for emerald color class
    const scoreElement = wrapper.find("span.text-emerald-600");
    expect(scoreElement.exists()).toBe(true);
  });

  it("displays correct color for reach tier (50-69)", () => {
    const fitScore = createMockFitScore({ score: 62, tier: "reach" });
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showBreakdown: false },
    });

    // Check for orange color class
    const scoreElement = wrapper.find("span.text-orange-600");
    expect(scoreElement.exists()).toBe(true);
  });

  it("displays correct color for unlikely tier (< 50)", () => {
    const fitScore = createMockFitScore({ score: 35, tier: "unlikely" });
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showBreakdown: false },
    });

    // Check for red color class
    const scoreElement = wrapper.find("span.text-red-600");
    expect(scoreElement.exists()).toBe(true);
  });

  it("shows missing dimensions warning when data incomplete", () => {
    const fitScore = createMockFitScore({
      missingDimensions: ["Athletic Fit", "Personal Fit"],
    });
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showBreakdown: false },
    });

    expect(wrapper.text()).toContain("Missing data:");
    expect(wrapper.text()).toContain("Athletic Fit");
    expect(wrapper.text()).toContain("Personal Fit");
  });

  it("does not show warning when all dimensions present", () => {
    const fitScore = createMockFitScore({ missingDimensions: [] });
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showBreakdown: false },
    });

    expect(wrapper.text()).not.toContain("Missing data:");
  });

  it("hides breakdown by default when showBreakdown prop is false", () => {
    const fitScore = createMockFitScore();
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showBreakdown: false },
    });

    // Check that the breakdown section heading is not visible
    expect(wrapper.html()).not.toContain("<h4");
    expect(wrapper.text()).not.toContain("Athletic Fit");
  });

  it("shows toggle button when showBreakdown is true", () => {
    const fitScore = createMockFitScore();
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showBreakdown: true },
    });

    const toggleButton = wrapper.find("button");
    expect(toggleButton.exists()).toBe(true);
    expect(toggleButton.text()).toContain("View Fit Score Breakdown");
  });

  it("toggles breakdown visibility when button clicked", async () => {
    const fitScore = createMockFitScore();
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showBreakdown: true },
    });

    // Initially collapsed - breakdown section heading should not be in HTML
    const initialHtml = wrapper.html();
    const h4Count = (initialHtml.match(/<h4[^>]*>Score Breakdown<\/h4>/g) || []).length;
    expect(h4Count).toBe(0);

    // Click to expand
    await wrapper.find("button").trigger("click");
    expect(wrapper.text()).toContain("Athletic Fit");

    // Click to collapse
    await wrapper.find("button").trigger("click");
    const finalHtml = wrapper.html();
    const finalH4Count = (finalHtml.match(/<h4[^>]*>Score Breakdown<\/h4>/g) || []).length;
    expect(finalH4Count).toBe(0);
  });

  it("shows all 4 dimensions when expanded", async () => {
    const fitScore = createMockFitScore();
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showBreakdown: true },
    });

    // Expand breakdown
    await wrapper.find("button").trigger("click");

    expect(wrapper.text()).toContain("Athletic Fit");
    expect(wrapper.text()).toContain("Academic Fit");
    expect(wrapper.text()).toContain("Opportunity Fit");
    expect(wrapper.text()).toContain("Personal Fit");
  });

  it("displays correct dimension scores and max values", async () => {
    const fitScore = createMockFitScore({
      breakdown: {
        athleticFit: 28,
        academicFit: 18,
        opportunityFit: 16,
        personalFit: 11,
      },
    });
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showBreakdown: true },
    });

    // Expand breakdown
    await wrapper.find("button").trigger("click");

    expect(wrapper.text()).toContain("28/40");
    expect(wrapper.text()).toContain("18/25");
    expect(wrapper.text()).toContain("16/20");
    expect(wrapper.text()).toContain("11/15");
  });

  it("shows recommendation message based on match tier", () => {
    const fitScore = createMockFitScore({ tier: "match" });
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showRecommendation: true },
    });

    expect(wrapper.text()).toContain("Excellent fit");
  });

  it("shows recommendation message based on safety tier", () => {
    const fitScore = createMockFitScore({ tier: "safety" });
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showRecommendation: true },
    });

    expect(wrapper.text()).toContain("Good fit");
  });

  it("shows recommendation message based on reach tier", () => {
    const fitScore = createMockFitScore({ tier: "reach" });
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showRecommendation: true },
    });

    expect(wrapper.text()).toContain("Possible fit");
  });

  it("shows recommendation message based on unlikely tier", () => {
    const fitScore = createMockFitScore({ tier: "unlikely" });
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showRecommendation: true },
    });

    expect(wrapper.text()).toContain("Not a strong fit");
  });

  it("hides recommendation when showRecommendation prop is false", () => {
    const fitScore = createMockFitScore({ tier: "match" });
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showRecommendation: false },
    });

    expect(wrapper.text()).not.toContain("Excellent fit");
  });

  it("handles zero scores correctly", async () => {
    const fitScore = createMockFitScore({
      score: 0,
      tier: "unlikely",
      breakdown: {
        athleticFit: 0,
        academicFit: 0,
        opportunityFit: 0,
        personalFit: 0,
      },
    });
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showBreakdown: true },
    });

    expect(wrapper.text()).toContain("0");
    expect(wrapper.find("span.text-red-600").exists()).toBe(true);

    // Expand and verify zeros
    await wrapper.find("button").trigger("click");
    expect(wrapper.text()).toContain("0/40");
    expect(wrapper.text()).toContain("0/25");
  });

  it("handles maximum scores correctly", async () => {
    const fitScore = createMockFitScore({
      score: 100,
      tier: "match",
      breakdown: {
        athleticFit: 40,
        academicFit: 25,
        opportunityFit: 20,
        personalFit: 15,
      },
    });
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showBreakdown: true },
    });

    expect(wrapper.text()).toContain("100");
    expect(wrapper.find("span.text-emerald-600").exists()).toBe(true);

    // Expand and verify max scores
    await wrapper.find("button").trigger("click");
    expect(wrapper.text()).toContain("40/40");
    expect(wrapper.text()).toContain("25/25");
    expect(wrapper.text()).toContain("20/20");
    expect(wrapper.text()).toContain("15/15");
  });

  it("button text changes from View to Hide when expanded", async () => {
    const fitScore = createMockFitScore();
    const wrapper = mount(FitScoreDisplay, {
      props: { fitScore, showBreakdown: true },
    });

    const button = wrapper.find("button");
    expect(button.text()).toContain("View");

    await button.trigger("click");
    expect(button.text()).toContain("Hide");

    await button.trigger("click");
    expect(button.text()).toContain("View");
  });
});
