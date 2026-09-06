import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HelpReviewedDate from "~/components/Help/HelpReviewedDate.vue";

describe("HelpReviewedDate", () => {
  it("renders the reviewed date in long form", () => {
    const wrapper = mount(HelpReviewedDate, {
      props: { reviewedOn: "2026-09-06" },
    });
    expect(wrapper.text()).toContain("Last reviewed");
    expect(wrapper.text()).toContain("September 6, 2026");
  });

  it("falls back to a stale-content notice past 180 days", () => {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 200);
    const wrapper = mount(HelpReviewedDate, {
      props: { reviewedOn: staleDate.toISOString().slice(0, 10) },
    });
    expect(wrapper.text()).toContain("may be out of date");
  });
});
