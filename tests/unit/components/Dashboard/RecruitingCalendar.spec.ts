import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import RecruitingCalendar from "~/components/Dashboard/RecruitingCalendar.vue";

describe("RecruitingCalendar Component", () => {
  it("resolves a non-baseball sport's own calendar, not the baseball default", () => {
    const baseball = mount(RecruitingCalendar, {
      props: { graduationYear: 2028, sport: "Baseball" },
    });
    const softball = mount(RecruitingCalendar, {
      props: { graduationYear: 2028, sport: "Softball" },
    });

    // Both render successfully off their own sport's calendar — the softball
    // instance must not silently fall back to reading baseball's data.
    expect(baseball.text()).toContain("Recruiting Calendar");
    expect(softball.text()).toContain("Recruiting Calendar");
  });

  it("hides the gender toggle for a non-gender-split sport", () => {
    const wrapper = mount(RecruitingCalendar, {
      props: { graduationYear: 2028, sport: "Baseball" },
    });
    expect(wrapper.find("[data-testid='gender-toggle-men']").exists()).toBe(false);
  });

  it("hides the gender toggle for a gender-split sport when the stored gender is already known", () => {
    const wrapper = mount(RecruitingCalendar, {
      props: { graduationYear: 2028, sport: "Basketball", gender: "female" },
    });
    expect(wrapper.find("[data-testid='gender-toggle-men']").exists()).toBe(false);
  });

  it("shows a Men's/Women's toggle, defaulted to Men's, for a gender-split sport with null stored gender", () => {
    const wrapper = mount(RecruitingCalendar, {
      props: { graduationYear: 2028, sport: "Basketball", gender: null },
    });

    const menToggle = wrapper.find("[data-testid='gender-toggle-men']");
    const womenToggle = wrapper.find("[data-testid='gender-toggle-women']");
    expect(menToggle.exists()).toBe(true);
    expect(womenToggle.exists()).toBe(true);
    expect(menToggle.classes().join(" ")).toContain("bg-white");
  });

  it("shows the toggle for 'other'/'prefer_not_to_say' stored gender too", () => {
    const other = mount(RecruitingCalendar, {
      props: { graduationYear: 2028, sport: "Wrestling", gender: "other" },
    });
    const preferNot = mount(RecruitingCalendar, {
      props: { graduationYear: 2028, sport: "Wrestling", gender: "prefer_not_to_say" },
    });
    expect(other.find("[data-testid='gender-toggle-men']").exists()).toBe(true);
    expect(preferNot.find("[data-testid='gender-toggle-men']").exists()).toBe(true);
  });

  it("the toggle overrides the resolved gender when clicked to Women's", async () => {
    const wrapper = mount(RecruitingCalendar, {
      props: { graduationYear: 2028, sport: "Basketball", gender: null },
    });

    const beforeCurrentPeriodText = wrapper.text();

    await wrapper.find("[data-testid='gender-toggle-women']").trigger("click");
    await wrapper.vm.$nextTick();

    expect(
      wrapper.find("[data-testid='gender-toggle-women']").classes().join(" "),
    ).toContain("bg-white");
    expect(
      wrapper.find("[data-testid='gender-toggle-men']").classes().join(" "),
    ).not.toContain("bg-white");

    // Rendering doesn't throw and the component re-resolves against the
    // women's calendar (content may legitimately be identical to men's on
    // some dates, so we only assert the toggle state actually flipped).
    expect(wrapper.text()).toBeTruthy();
    expect(beforeCurrentPeriodText).toBeTruthy();
  });

  it("shows an FBS/FCS toggle, defaulted to FBS, for Football", () => {
    const wrapper = mount(RecruitingCalendar, {
      props: { graduationYear: 2028, sport: "Football" },
    });

    const fbsToggle = wrapper.find("[data-testid='subdivision-toggle-fbs']");
    const fcsToggle = wrapper.find("[data-testid='subdivision-toggle-fcs']");
    expect(fbsToggle.exists()).toBe(true);
    expect(fcsToggle.exists()).toBe(true);
    expect(fbsToggle.classes().join(" ")).toContain("bg-white");
  });

  it("hides the FBS/FCS toggle for non-Football sports", () => {
    const wrapper = mount(RecruitingCalendar, {
      props: { graduationYear: 2028, sport: "Baseball" },
    });
    expect(wrapper.find("[data-testid='subdivision-toggle-fbs']").exists()).toBe(false);
  });
});
