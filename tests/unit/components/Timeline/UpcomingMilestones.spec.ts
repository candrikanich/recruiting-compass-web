import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import UpcomingMilestones from "~/components/Timeline/UpcomingMilestones.vue";
import type { Milestone } from "~/server/utils/ncaaRecruitingCalendar";

describe("UpcomingMilestones Component", () => {
  it("should render with title", () => {
    const wrapper = mount(UpcomingMilestones, {
      props: {
        milestones: [],
      },
    });

    expect(wrapper.text()).toContain("Upcoming Milestones");
  });

  it("should display empty state when no milestones", () => {
    const wrapper = mount(UpcomingMilestones, {
      props: {
        milestones: [],
      },
    });

    expect(wrapper.text()).toContain("No upcoming milestones");
  });

  it("should render milestone items with titles and dates", () => {
    const futureYear = new Date().getFullYear() + 2;
    const milestones: Milestone[] = [
      {
        date: `${futureYear}-03-14`,
        title: "SAT Test Date",
        type: "test",
        division: "ALL",
      },
      {
        date: `${futureYear}-10-01`,
        title: "FAFSA Opens",
        type: "application",
        division: "ALL",
      },
    ];

    const wrapper = mount(UpcomingMilestones, {
      props: {
        milestones,
      },
    });

    expect(wrapper.text()).toContain("SAT Test Date");
    // Check for Mar dates (might be 13 or 14 due to timezone)
    expect(wrapper.text()).toMatch(/Mar\s+1[34]/);
    expect(wrapper.text()).toContain(futureYear.toString());
    expect(wrapper.text()).toContain("FAFSA Opens");
    // Check for Sept/Oct dates
    expect(wrapper.text()).toMatch(/Sep|Oct/);
  });

  it("should have calendar icon in header", () => {
    const wrapper = mount(UpcomingMilestones, {
      props: {
        milestones: [],
      },
    });

    expect(wrapper.text()).toContain("📅");
  });

  it("should display white background styling", () => {
    const wrapper = mount(UpcomingMilestones, {
      props: {
        milestones: [],
      },
    });

    const root = wrapper.find("div");
    expect(root.classes()).toContain("bg-white");
    expect(root.classes()).toContain("border-slate-200");
  });

  it("should render milestone items as clickable links with external icons", () => {
    const milestones: Milestone[] = [
      {
        date: "2026-03-14",
        title: "SAT Test Date",
        type: "test",
        division: "ALL",
        url: "https://example.com",
      },
    ];

    const wrapper = mount(UpcomingMilestones, {
      props: {
        milestones,
      },
    });

    const link = wrapper.find("a");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("https://example.com");
    expect(link.attributes("target")).toBe("_blank");
    expect(link.text()).toContain("↗");
  });

  it("should display milestone descriptions when available", () => {
    const milestones: Milestone[] = [
      {
        date: "2026-03-14",
        title: "SAT Test Date",
        type: "test",
        division: "ALL",
        description: "Important standardized test date for juniors",
      },
    ];

    const wrapper = mount(UpcomingMilestones, {
      props: {
        milestones,
      },
    });

    expect(wrapper.text()).toContain(
      "Important standardized test date for juniors",
    );
  });

  it("should display milestone type indicators", () => {
    const milestones: Milestone[] = [
      {
        date: "2026-03-14",
        title: "SAT Test Date",
        type: "test",
        division: "ALL",
      },
    ];

    const wrapper = mount(UpcomingMilestones, {
      props: {
        milestones,
      },
    });

    // Type indicator icon (📝 for test)
    expect(wrapper.text()).toContain("📝");
  });

  it("should format dates correctly", () => {
    const futureYear = new Date().getFullYear() + 2;
    const milestones: Milestone[] = [
      {
        date: `${futureYear}-06-15`,
        title: "Summer Event",
        type: "test",
      },
      {
        date: `${futureYear}-09-20`,
        title: "Fall Event",
        type: "test",
      },
    ];

    const wrapper = mount(UpcomingMilestones, {
      props: {
        milestones,
      },
    });

    // Just verify that dates are present and formatted (avoid time zone issues)
    expect(wrapper.text()).toContain("Summer Event");
    expect(wrapper.text()).toContain("Fall Event");
    expect(wrapper.text()).toContain(futureYear.toString());
    // Verify dates have some month abbreviation
    expect(wrapper.text()).toMatch(/[A-Z][a-z]{2}\s+\d{1,2}/);
  });

  it("should have hover effects on milestone items", () => {
    const milestones: Milestone[] = [
      {
        date: "2026-03-14",
        title: "SAT Test Date",
        type: "test",
      },
    ];

    const wrapper = mount(UpcomingMilestones, {
      props: {
        milestones,
      },
    });

    const link = wrapper.find("a");
    expect(link.classes()).toContain("hover:bg-slate-100");
  });

  it("should display descriptive subtitle", () => {
    const wrapper = mount(UpcomingMilestones, {
      props: {
        milestones: [],
      },
    });

    expect(wrapper.text()).toContain("Important dates to have on your calendar");
  });

  it("should handle milestones without URL gracefully", () => {
    const milestones: Milestone[] = [
      {
        date: "2026-03-14",
        title: "SAT Test Date",
        type: "test",
        division: "ALL",
        // No URL provided
      },
    ];

    const wrapper = mount(UpcomingMilestones, {
      props: {
        milestones,
      },
    });

    expect(wrapper.text()).toContain("SAT Test Date");
    // Should still be rendered as link (a tag)
    expect(wrapper.find("a").exists()).toBe(true);
  });
});
