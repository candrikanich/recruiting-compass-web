import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CoachStatsGrid from "~/components/Coach/CoachStatsGrid.vue";
import type { CoachStats } from "~/composables/useCoachStats";

describe("CoachStatsGrid", () => {
  const mockStats: CoachStats = {
    totalInteractions: 15,
    daysSinceContact: 5,
    preferredMethod: "Email",
  };

  describe("Rendering", () => {
    it("displays total interactions", () => {
      const wrapper = mount(CoachStatsGrid, {
        props: { stats: mockStats },
      });

      expect(wrapper.text()).toContain("Total Interactions");
      expect(wrapper.text()).toContain("15");
    });

    it("displays days since contact", () => {
      const wrapper = mount(CoachStatsGrid, {
        props: { stats: mockStats },
      });

      expect(wrapper.text()).toContain("Days Since Contact");
      expect(wrapper.text()).toContain("5");
    });

    it("displays preferred response method", () => {
      const wrapper = mount(CoachStatsGrid, {
        props: { stats: mockStats },
      });

      expect(wrapper.text()).toContain("Response Method");
      expect(wrapper.text()).toContain("Email");
    });

    it("displays zero interactions correctly", () => {
      const stats = { ...mockStats, totalInteractions: 0 };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      expect(wrapper.text()).toContain("0");
    });
  });

  describe("Days Since Contact - Color Coding", () => {
    it("shows green color for recent contact (0 days)", () => {
      const stats = { ...mockStats, daysSinceContact: 0 };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      const daysElement = wrapper.find(".text-emerald-600");
      expect(daysElement.exists()).toBe(true);
      expect(daysElement.text()).toBe("0");
    });

    it("shows orange color for moderate delay (1-30 days)", () => {
      const stats = { ...mockStats, daysSinceContact: 15 };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      const daysElement = wrapper.find(".text-orange-500");
      expect(daysElement.exists()).toBe(true);
      expect(daysElement.text()).toBe("15");
    });

    it("shows orange color for exactly 30 days", () => {
      const stats = { ...mockStats, daysSinceContact: 30 };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      const daysElement = wrapper.find(".text-orange-500");
      expect(daysElement.exists()).toBe(true);
    });

    it("shows red color for overdue contact (>30 days)", () => {
      const stats = { ...mockStats, daysSinceContact: 45 };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      const daysElement = wrapper.find(".text-red-600");
      expect(daysElement.exists()).toBe(true);
      expect(daysElement.text()).toBe("45");
    });

    it("shows red color for exactly 31 days", () => {
      const stats = { ...mockStats, daysSinceContact: 31 };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      const daysElement = wrapper.find(".text-red-600");
      expect(daysElement.exists()).toBe(true);
    });
  });

  describe("Status Labels", () => {
    it('shows "Recent" status for 0 days', () => {
      const stats = { ...mockStats, daysSinceContact: 0 };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      expect(wrapper.text()).toContain("Recent");
    });

    it('shows "Follow-up Soon" status for 1-30 days', () => {
      const stats = { ...mockStats, daysSinceContact: 15 };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      expect(wrapper.text()).toContain("Follow-up Soon");
    });

    it('shows "Follow-up Soon" for exactly 30 days', () => {
      const stats = { ...mockStats, daysSinceContact: 30 };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      expect(wrapper.text()).toContain("Follow-up Soon");
    });

    it('shows "Overdue" status for >30 days', () => {
      const stats = { ...mockStats, daysSinceContact: 45 };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      expect(wrapper.text()).toContain("Overdue");
    });

    it("status label matches color class", () => {
      const stats = { ...mockStats, daysSinceContact: 0 };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      // The status label is in a separate p element, not the days element
      expect(wrapper.text()).toContain("Recent");
      const emeraldElements = wrapper.findAll(".text-emerald-600");
      expect(emeraldElements.length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    it("has section with aria-labelledby", () => {
      const wrapper = mount(CoachStatsGrid, {
        props: { stats: mockStats },
      });

      const section = wrapper.find("section");
      expect(section.attributes("aria-labelledby")).toBe("coach-stats-heading");
    });

    it("has screen reader heading", () => {
      const wrapper = mount(CoachStatsGrid, {
        props: { stats: mockStats },
      });

      const heading = wrapper.find("#coach-stats-heading");
      expect(heading.exists()).toBe(true);
      expect(heading.classes()).toContain("sr-only");
      expect(heading.text()).toBe("Coach Statistics");
    });

    it("has proper heading IDs for each stat", () => {
      const wrapper = mount(CoachStatsGrid, {
        props: { stats: mockStats },
      });

      expect(wrapper.find("#stat-interactions").exists()).toBe(true);
      expect(wrapper.find("#stat-days-since-contact").exists()).toBe(true);
      expect(wrapper.find("#stat-response-method").exists()).toBe(true);
    });

    it("stat values have aria-labelledby attributes", () => {
      const wrapper = mount(CoachStatsGrid, {
        props: { stats: mockStats },
      });

      const interactionsStat = wrapper.find(
        '[aria-labelledby="stat-interactions"]',
      );
      expect(interactionsStat.exists()).toBe(true);
      expect(interactionsStat.text()).toBe("15");

      const methodStat = wrapper.find(
        '[aria-labelledby="stat-response-method"]',
      );
      expect(methodStat.exists()).toBe(true);
      expect(methodStat.text()).toBe("Email");
    });

    it("has screen reader announcement for days since contact status", () => {
      const stats = { ...mockStats, daysSinceContact: 5 };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      const srOnlyElements = wrapper.findAll(".sr-only");
      const announcement = srOnlyElements.find((el) =>
        el.text().includes("Last contact"),
      );
      expect(announcement).toBeDefined();
      expect(announcement?.text()).toContain("Last contact was 5 days ago");
      expect(announcement?.text()).toContain("follow-up soon");
    });

    it("screen reader announcement updates with different status", () => {
      const stats = { ...mockStats, daysSinceContact: 0 };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      const srOnlyElements = wrapper.findAll(".sr-only");
      const announcement = srOnlyElements.find((el) =>
        el.text().includes("Last contact"),
      );
      expect(announcement).toBeDefined();
      expect(announcement?.text()).toContain("status is recent");
    });
  });

  describe("Grid Layout", () => {
    it("has responsive grid classes", () => {
      const wrapper = mount(CoachStatsGrid, {
        props: { stats: mockStats },
      });

      const grid = wrapper.find(".grid");
      expect(grid.classes()).toContain("grid-cols-1");
      expect(grid.classes()).toContain("md:grid-cols-3");
    });

    it("renders three stat cards", () => {
      const wrapper = mount(CoachStatsGrid, {
        props: { stats: mockStats },
      });

      const cards = wrapper.findAll(".bg-white.rounded-xl");
      expect(cards.length).toBe(3);
    });

    it("each card has consistent styling", () => {
      const wrapper = mount(CoachStatsGrid, {
        props: { stats: mockStats },
      });

      const cards = wrapper.findAll(".bg-white.rounded-xl");
      cards.forEach((card) => {
        expect(card.classes()).toContain("border");
        expect(card.classes()).toContain("border-slate-200");
        expect(card.classes()).toContain("shadow-sm");
        expect(card.classes()).toContain("p-6");
      });
    });
  });

  describe("Preferred Method Display", () => {
    it("displays Email as preferred method", () => {
      const stats = { ...mockStats, preferredMethod: "Email" };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      expect(wrapper.text()).toContain("Email");
    });

    it("displays Phone as preferred method", () => {
      const stats = { ...mockStats, preferredMethod: "Phone" };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      expect(wrapper.text()).toContain("Phone");
    });

    it("displays Text as preferred method", () => {
      const stats = { ...mockStats, preferredMethod: "Text" };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      expect(wrapper.text()).toContain("Text");
    });

    it("displays None as preferred method", () => {
      const stats = { ...mockStats, preferredMethod: "None" };
      const wrapper = mount(CoachStatsGrid, {
        props: { stats },
      });

      expect(wrapper.text()).toContain("None");
    });
  });
});
