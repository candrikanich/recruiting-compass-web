import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import AtAGlanceSummary from "~/components/Dashboard/AtAGlanceSummary.vue";
import { createMockOffer } from "~/tests/fixtures/offers.fixture";
import { createMockCoach } from "~/tests/fixtures/coaches.fixture";
import { createMockInteraction } from "~/tests/fixtures/interactions.fixture";
import { createMockSchool } from "~/tests/fixtures/schools.fixture";
import type { Coach, School, Interaction, Offer } from "~/types/models";

function buildDefaultProps(
  overrides: {
    coaches?: Coach[];
    schools?: School[];
    interactions?: Interaction[];
    offers?: Offer[];
  } = {},
) {
  return {
    coaches: overrides.coaches ?? [],
    schools: overrides.schools ?? [],
    interactions: overrides.interactions ?? [],
    offers: overrides.offers ?? [],
  };
}

describe("AtAGlanceSummary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 7)); // Feb 7, 2026
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Schools with Offers", () => {
    it("displays total school count", () => {
      const schools = [
        createMockSchool({ id: "s1" }),
        createMockSchool({ id: "s2" }),
        createMockSchool({ id: "s3" }),
      ];

      const wrapper = mount(AtAGlanceSummary, {
        props: buildDefaultProps({ schools }),
      });

      expect(wrapper.text()).toContain("0 of 3");
    });

    it("counts accepted offers separately from total schools", () => {
      const schools = [
        createMockSchool({ id: "s1" }),
        createMockSchool({ id: "s2" }),
        createMockSchool({ id: "s3" }),
        createMockSchool({ id: "s4" }),
      ];
      const offers = [
        createMockOffer({ status: "accepted" }),
        createMockOffer({ status: "accepted" }),
        createMockOffer({ status: "pending" }),
      ];

      const wrapper = mount(AtAGlanceSummary, {
        props: buildDefaultProps({ schools, offers }),
      });

      expect(wrapper.text()).toContain("2 of 4");
    });

    it("calculates offers percentage as Math.round((accepted / total) * 100)", () => {
      const schools = [
        createMockSchool({ id: "s1" }),
        createMockSchool({ id: "s2" }),
        createMockSchool({ id: "s3" }),
      ];
      const offers = [createMockOffer({ status: "accepted" })];

      const wrapper = mount(AtAGlanceSummary, {
        props: buildDefaultProps({ schools, offers }),
      });

      expect(wrapper.text()).toContain("33%");
    });

    it("returns 0% when there are zero schools (division by zero guard)", () => {
      const wrapper = mount(AtAGlanceSummary, {
        props: buildDefaultProps({ schools: [], offers: [] }),
      });

      expect(wrapper.text()).toContain("0%");
      expect(wrapper.text()).toContain("0 of 0");
    });
  });

  describe("Interactions This Month", () => {
    it("counts only interactions from the current month and year", () => {
      const interactions = [
        createMockInteraction({ occurred_at: "2026-02-05T10:00:00Z" }),
        createMockInteraction({ occurred_at: "2026-02-01T10:00:00Z" }),
        createMockInteraction({ occurred_at: "2026-01-15T10:00:00Z" }),
      ];

      const wrapper = mount(AtAGlanceSummary, {
        props: buildDefaultProps({ interactions }),
      });

      expect(wrapper.text()).toContain("February 2026");
      const interactionsSection = wrapper.text();
      expect(interactionsSection).toContain("2");
    });

    it("falls back to created_at when occurred_at is null", () => {
      const interactions = [
        createMockInteraction({
          occurred_at: undefined,
          created_at: "2026-02-03T10:00:00Z",
        }),
        createMockInteraction({
          occurred_at: undefined,
          created_at: "2025-12-01T10:00:00Z",
        }),
      ];

      const wrapper = mount(AtAGlanceSummary, {
        props: buildDefaultProps({ interactions }),
      });

      const monthLabel = wrapper
        .findAll("p")
        .find((p) => p.text().includes("February 2026"));
      expect(monthLabel).toBeTruthy();
    });

    it("returns 0 when no interactions match current month", () => {
      const interactions = [
        createMockInteraction({ occurred_at: "2025-06-15T10:00:00Z" }),
        createMockInteraction({ occurred_at: "2025-11-20T10:00:00Z" }),
      ];

      const wrapper = mount(AtAGlanceSummary, {
        props: buildDefaultProps({ interactions }),
      });

      const interactionCards = wrapper.findAll(".from-purple-50");
      expect(interactionCards.length).toBe(1);
      expect(interactionCards[0].text()).toContain("0");
    });

    it("handles empty interactions array", () => {
      const wrapper = mount(AtAGlanceSummary, {
        props: buildDefaultProps({ interactions: [] }),
      });

      const purpleCard = wrapper.find(".from-purple-50");
      expect(purpleCard.text()).toContain("0");
    });
  });

  describe("Days Until Graduation", () => {
    it("calculates days from current date to May 31, 2028", () => {
      const wrapper = mount(AtAGlanceSummary, {
        props: buildDefaultProps(),
      });

      // Feb 7, 2026 -> May 31, 2028 = 844 days
      const orangeCard = wrapper.find(".from-orange-50");
      expect(orangeCard.text()).toContain("844d");
      expect(orangeCard.text()).toContain("May 31, 2028");
    });

    it("returns 0 when graduation date has passed", () => {
      vi.setSystemTime(new Date(2029, 0, 1)); // Jan 1, 2029

      const wrapper = mount(AtAGlanceSummary, {
        props: buildDefaultProps(),
      });

      const orangeCard = wrapper.find(".from-orange-50");
      expect(orangeCard.text()).toContain("0d");
    });

    it("returns 0 on the graduation date itself", () => {
      vi.setSystemTime(new Date(2028, 4, 31)); // May 31, 2028

      const wrapper = mount(AtAGlanceSummary, {
        props: buildDefaultProps(),
      });

      const orangeCard = wrapper.find(".from-orange-50");
      expect(orangeCard.text()).toContain("0d");
    });

    it("returns 1 the day before graduation", () => {
      vi.setSystemTime(new Date(2028, 4, 30)); // May 30, 2028

      const wrapper = mount(AtAGlanceSummary, {
        props: buildDefaultProps(),
      });

      const orangeCard = wrapper.find(".from-orange-50");
      expect(orangeCard.text()).toContain("1d");
    });
  });

  describe("Rendering", () => {
    it("renders the At a Glance heading", () => {
      const wrapper = mount(AtAGlanceSummary, {
        props: buildDefaultProps(),
      });

      expect(wrapper.text()).toContain("At a Glance");
    });

    it("renders all four metric cards", () => {
      const wrapper = mount(AtAGlanceSummary, {
        props: buildDefaultProps(),
      });

      expect(wrapper.text()).toContain("Schools with Offers");
      expect(wrapper.text()).toContain("Avg Coach Responsiveness");
      expect(wrapper.text()).toContain("Interactions This Month");
      expect(wrapper.text()).toContain("Days Until Graduation");
    });
  });
});
