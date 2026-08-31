import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import RecruitingCalendar from "~/components/Dashboard/RecruitingCalendar.vue";

// The "Next Key Dates" block now renders through the embedded
// <UpcomingMilestones bare/> — a single milestone-row source shared with the
// Timeline page. These assert the merge: rich external-link rows are present,
// and the old countdown/urgency styling is gone.
describe("RecruitingCalendar merged milestones", () => {
  it("renders milestone rows via embedded UpcomingMilestones with external links", () => {
    const wrapper = mount(RecruitingCalendar, {
      props: {
        sport: "Baseball",
        gender: "male",
        graduationYear: 2028,
      },
    });

    const links = wrapper.findAll('a[target="_blank"][rel="noopener"]');
    // At least one milestone row rendered as an external link (SAT/ACT/etc.
    // carry urls). Excludes the disclaimer's "View official calendar" link,
    // which we assert separately is not the only one.
    const milestoneLinks = links.filter((l) => l.classes().includes("group"));
    expect(milestoneLinks.length).toBeGreaterThan(0);
  });

  it("drops the countdown pill and urgent-red styling", () => {
    const wrapper = mount(RecruitingCalendar, {
      props: {
        sport: "Baseball",
        gender: "male",
        graduationYear: 2028,
      },
    });

    const html = wrapper.html();
    // Countdown copy from the removed getCountdown()/isWithin30Days() helpers.
    expect(html).not.toContain("Tomorrow");
    expect(html).not.toContain("border-red-200");
  });
});
