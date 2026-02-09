import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import AnalyticsCards from "~/components/Interaction/AnalyticsCards.vue";

describe("AnalyticsCards", () => {
  it("renders all 4 analytics cards with default values", () => {
    const wrapper = mount(AnalyticsCards);

    const cards = wrapper.findAll(".bg-white");
    expect(cards).toHaveLength(4);

    const values = wrapper.findAll(".text-2xl");
    expect(values).toHaveLength(4);
    values.forEach((value) => {
      expect(value.text()).toBe("0");
    });

    const labels = wrapper.findAll(".text-sm");
    expect(labels).toHaveLength(4);
    expect(labels[0].text()).toBe("Total");
    expect(labels[1].text()).toBe("Outbound");
    expect(labels[2].text()).toBe("Inbound");
    expect(labels[3].text()).toBe("This Week");
  });

  it("renders correct values when props are provided", () => {
    const wrapper = mount(AnalyticsCards, {
      props: {
        totalCount: 42,
        outboundCount: 18,
        inboundCount: 24,
        thisWeekCount: 7,
      },
    });

    const values = wrapper.findAll(".text-2xl");
    expect(values[0].text()).toBe("42");
    expect(values[1].text()).toBe("18");
    expect(values[2].text()).toBe("24");
    expect(values[3].text()).toBe("7");
  });

  it("displays Total card with blue styling", () => {
    const wrapper = mount(AnalyticsCards, {
      props: { totalCount: 100 },
    });

    const cards = wrapper.findAll(".bg-white");
    const totalCard = cards[0];

    expect(totalCard.find(".bg-blue-100").exists()).toBe(true);
    expect(totalCard.find(".text-blue-600").exists()).toBe(true);
    expect(totalCard.text()).toContain("100");
    expect(totalCard.text()).toContain("Total");
  });

  it("displays Outbound card with emerald styling", () => {
    const wrapper = mount(AnalyticsCards, {
      props: { outboundCount: 50 },
    });

    const cards = wrapper.findAll(".bg-white");
    const outboundCard = cards[1];

    expect(outboundCard.find(".bg-emerald-100").exists()).toBe(true);
    expect(outboundCard.find(".text-emerald-600").exists()).toBe(true);
    expect(outboundCard.text()).toContain("50");
    expect(outboundCard.text()).toContain("Outbound");
  });

  it("displays Inbound card with purple styling", () => {
    const wrapper = mount(AnalyticsCards, {
      props: { inboundCount: 30 },
    });

    const cards = wrapper.findAll(".bg-white");
    const inboundCard = cards[2];

    expect(inboundCard.find(".bg-purple-100").exists()).toBe(true);
    expect(inboundCard.find(".text-purple-600").exists()).toBe(true);
    expect(inboundCard.text()).toContain("30");
    expect(inboundCard.text()).toContain("Inbound");
  });

  it("displays This Week card with amber styling", () => {
    const wrapper = mount(AnalyticsCards, {
      props: { thisWeekCount: 15 },
    });

    const cards = wrapper.findAll(".bg-white");
    const thisWeekCard = cards[3];

    expect(thisWeekCard.find(".bg-amber-100").exists()).toBe(true);
    expect(thisWeekCard.find(".text-amber-600").exists()).toBe(true);
    expect(thisWeekCard.text()).toContain("15");
    expect(thisWeekCard.text()).toContain("This Week");
  });

  it("has responsive grid layout", () => {
    const wrapper = mount(AnalyticsCards);

    const grid = wrapper.find(".grid");
    expect(grid.classes()).toContain("grid-cols-2");
    expect(grid.classes()).toContain("lg:grid-cols-4");
    expect(grid.classes()).toContain("gap-4");
    expect(grid.classes()).toContain("mb-6");
  });

  it("renders icons for each card", () => {
    const wrapper = mount(AnalyticsCards);

    const icons = wrapper.findAll(".w-5.h-5");
    expect(icons).toHaveLength(4);

    expect(icons[0].classes()).toContain("text-blue-600");
    expect(icons[1].classes()).toContain("text-emerald-600");
    expect(icons[2].classes()).toContain("text-purple-600");
    expect(icons[3].classes()).toContain("text-amber-600");
  });

  it("handles zero values correctly", () => {
    const wrapper = mount(AnalyticsCards, {
      props: {
        totalCount: 0,
        outboundCount: 0,
        inboundCount: 0,
        thisWeekCount: 0,
      },
    });

    const values = wrapper.findAll(".text-2xl");
    values.forEach((value) => {
      expect(value.text()).toBe("0");
    });
  });

  it("handles large numbers correctly", () => {
    const wrapper = mount(AnalyticsCards, {
      props: {
        totalCount: 9999,
        outboundCount: 5000,
        inboundCount: 4999,
        thisWeekCount: 500,
      },
    });

    const values = wrapper.findAll(".text-2xl");
    expect(values[0].text()).toBe("9999");
    expect(values[1].text()).toBe("5000");
    expect(values[2].text()).toBe("4999");
    expect(values[3].text()).toBe("500");
  });

  it("maintains card structure and styling consistency", () => {
    const wrapper = mount(AnalyticsCards);

    const cards = wrapper.findAll(
      ".bg-white.rounded-xl.border.border-slate-200.shadow-sm.p-4",
    );
    expect(cards).toHaveLength(4);

    cards.forEach((card) => {
      expect(card.find(".flex.items-center.gap-3").exists()).toBe(true);
      expect(card.find(".w-10.h-10.rounded-lg").exists()).toBe(true);
      expect(card.find(".text-2xl.font-bold.text-slate-900").exists()).toBe(
        true,
      );
      expect(card.find(".text-sm.text-slate-500").exists()).toBe(true);
    });
  });

  describe("Accessibility", () => {
    it("has semantic section with accessible label", () => {
      const wrapper = mount(AnalyticsCards);

      const section = wrapper.find("section");
      expect(section.exists()).toBe(true);
      expect(section.attributes("aria-label")).toBe("Interaction statistics");
    });

    it("hides decorative icons from screen readers", () => {
      const wrapper = mount(AnalyticsCards);

      const icons = wrapper.findAll('[aria-hidden="true"]');
      expect(icons).toHaveLength(4);

      icons.forEach((icon) => {
        expect(icon.attributes("aria-hidden")).toBe("true");
        expect(icon.classes()).toContain("w-5");
        expect(icon.classes()).toContain("h-5");
      });
    });

    it("marks stat numbers with status role for live updates", () => {
      const wrapper = mount(AnalyticsCards, {
        props: {
          totalCount: 42,
          outboundCount: 18,
          inboundCount: 24,
          thisWeekCount: 7,
        },
      });

      const statusElements = wrapper.findAll('[role="status"]');
      expect(statusElements).toHaveLength(4);

      expect(statusElements[0].text()).toBe("42");
      expect(statusElements[1].text()).toBe("18");
      expect(statusElements[2].text()).toBe("24");
      expect(statusElements[3].text()).toBe("7");

      statusElements.forEach((element) => {
        expect(element.classes()).toContain("text-2xl");
        expect(element.classes()).toContain("font-bold");
        expect(element.classes()).toContain("text-slate-900");
      });
    });

    it("maintains accessible structure across all cards", () => {
      const wrapper = mount(AnalyticsCards);

      const cards = wrapper.findAll(".bg-white");
      expect(cards).toHaveLength(4);

      cards.forEach((card) => {
        expect(card.find('[aria-hidden="true"]').exists()).toBe(true);
        expect(card.find('[role="status"]').exists()).toBe(true);
      });
    });
  });
});
