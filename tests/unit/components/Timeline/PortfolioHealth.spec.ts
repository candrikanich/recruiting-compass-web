import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PortfolioHealth from "~/components/Timeline/PortfolioHealth.vue";

function mountPortfolioHealth(props: Record<string, unknown> = {}) {
  return mount(PortfolioHealth, { props });
}

describe("PortfolioHealth", () => {
  describe("header", () => {
    it('always shows "Portfolio Health" heading', () => {
      const wrapper = mountPortfolioHealth();
      expect(wrapper.find("h3").text()).toBe("Portfolio Health");
    });
  });

  describe("loading state", () => {
    it("renders 3 skeleton placeholders when loading", () => {
      const wrapper = mountPortfolioHealth({ loading: true });
      const skeletons = wrapper.findAll(".animate-pulse");

      expect(skeletons).toHaveLength(3);
    });

    it("does not render portfolio stats when loading", () => {
      const wrapper = mountPortfolioHealth({ loading: true });

      expect(wrapper.text()).not.toContain("Reaches");
      expect(wrapper.text()).not.toContain("Matches");
      expect(wrapper.text()).not.toContain("Safeties");
    });
  });

  describe("default state (no props)", () => {
    it('shows em-dash fallback for reaches, matches, and safeties', () => {
      const wrapper = mountPortfolioHealth();
      const stats = wrapper.findAll(".text-sm.font-medium");

      expect(stats[0].text()).toBe("— schools");
      expect(stats[1].text()).toBe("— schools");
      expect(stats[2].text()).toBe("— schools");
    });

    it("does not render any progress bar fills when counts are undefined", () => {
      const wrapper = mountPortfolioHealth();
      const fills = wrapper.findAll(".bg-blue-500, .bg-emerald-500, .bg-purple-500");

      expect(fills).toHaveLength(0);
    });
  });

  describe("with counts", () => {
    it("displays school counts for reaches, matches, and safeties", () => {
      const wrapper = mountPortfolioHealth({
        reaches: 5,
        matches: 3,
        safeties: 2,
      });
      const stats = wrapper.findAll(".text-sm.font-medium");

      expect(stats[0].text()).toBe("5 schools");
      expect(stats[1].text()).toBe("3 schools");
      expect(stats[2].text()).toBe("2 schools");
    });

    it("calculates progress bar widths as (count / 10) * 100", () => {
      const wrapper = mountPortfolioHealth({
        reaches: 5,
        matches: 3,
        safeties: 2,
      });

      const reachesFill = wrapper.find(".bg-blue-500");
      const matchesFill = wrapper.find(".bg-emerald-500");
      const safetiesFill = wrapper.find(".bg-purple-500");

      expect(reachesFill.attributes("style")).toContain("width: 50%");
      expect(matchesFill.attributes("style")).toContain("width: 30%");
      expect(safetiesFill.attributes("style")).toContain("width: 20%");
    });
  });

  describe("zero value behavior", () => {
    // Known inconsistency: the text renders "0 schools" (nullish coalescing
    // passes 0 through), but v-if="reaches" is falsy for 0, so the progress
    // bar fill div is NOT rendered. The text says there are 0 schools yet the
    // bar track is empty — visually consistent by accident, but the code paths
    // diverge (nullish coalescing vs truthiness check).
    it('shows "0 schools" text but does NOT render the progress bar fill', () => {
      const wrapper = mountPortfolioHealth({
        reaches: 0,
        matches: 0,
        safeties: 0,
      });
      const stats = wrapper.findAll(".text-sm.font-medium");

      expect(stats[0].text()).toBe("0 schools");
      expect(stats[1].text()).toBe("0 schools");
      expect(stats[2].text()).toBe("0 schools");

      expect(wrapper.find(".bg-blue-500").exists()).toBe(false);
      expect(wrapper.find(".bg-emerald-500").exists()).toBe(false);
      expect(wrapper.find(".bg-purple-500").exists()).toBe(false);
    });
  });

  describe("progress bar capping", () => {
    it("caps progress bar width at 100% when count exceeds 10", () => {
      const wrapper = mountPortfolioHealth({ reaches: 15 });
      const fill = wrapper.find(".bg-blue-500");

      expect(fill.attributes("style")).toContain("width: 100%");
    });
  });

  describe("dead prop: unlikelies", () => {
    // NOTE: unlikelies prop exists in Props interface but is never rendered — dead prop
    it("accepts unlikelies prop without rendering it anywhere", () => {
      const wrapper = mountPortfolioHealth({
        reaches: 3,
        matches: 2,
        safeties: 1,
        unlikelies: 5,
      });

      expect(wrapper.text()).not.toContain("5 schools");
      expect(wrapper.text()).not.toContain("Unlikelies");
      expect(wrapper.text()).not.toContain("unlikelies");
    });
  });

  describe("info message", () => {
    it("shows Phase 6 info message at the bottom", () => {
      const wrapper = mountPortfolioHealth();

      expect(wrapper.text()).toContain("Phase 6");
      expect(wrapper.text()).toContain(
        "Comprehensive portfolio analysis with personalized recommendations",
      );
    });
  });
});
