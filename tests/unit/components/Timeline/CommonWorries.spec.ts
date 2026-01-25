import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CommonWorries from "~/components/Timeline/CommonWorries.vue";
import type { ParentWorry } from "~/utils/parentWorries";

describe("CommonWorries Component", () => {
  it("should render with title", () => {
    const wrapper = mount(CommonWorries, {
      props: {
        worries: [],
      },
    });

    expect(wrapper.text()).toContain("Common Worries");
  });

  it("should display empty state when no worries", () => {
    const wrapper = mount(CommonWorries, {
      props: {
        worries: [],
      },
    });

    expect(wrapper.text()).toContain("No common worries at this stage");
  });

  it("should render worry items with questions and answers", () => {
    const worries: ParentWorry[] = [
      {
        id: "worry-1",
        question: "Is it too early?",
        answer: "No, freshman year is the perfect time.",
        phases: ["freshman"],
        category: "timeline",
      },
      {
        id: "worry-2",
        question: "How many schools?",
        answer: "Target 15-25 schools.",
        phases: ["sophomore"],
        category: "recruiting",
      },
    ];

    const wrapper = mount(CommonWorries, {
      props: {
        worries,
      },
    });

    expect(wrapper.text()).toContain("Is it too early?");
    expect(wrapper.text()).toContain("No, freshman year is the perfect time.");
    expect(wrapper.text()).toContain("How many schools?");
  });

  it("should use details/summary elements for accordion pattern", () => {
    const worries: ParentWorry[] = [
      {
        id: "worry-1",
        question: "Is it too early?",
        answer: "No.",
        phases: ["freshman"],
        category: "timeline",
      },
    ];

    const wrapper = mount(CommonWorries, {
      props: {
        worries,
      },
    });

    const details = wrapper.findAll("details");
    expect(details.length).toBeGreaterThan(0);

    const summary = wrapper.find("summary");
    expect(summary.exists()).toBe(true);
  });

  it("should have question mark icon", () => {
    const wrapper = mount(CommonWorries, {
      props: {
        worries: [],
      },
    });

    expect(wrapper.text()).toContain("❓");
  });

  it("should display amber gradient styling", () => {
    const wrapper = mount(CommonWorries, {
      props: {
        worries: [],
      },
    });

    const root = wrapper.find("div");
    expect(root.classes()).toContain("bg-gradient-to-br");
    expect(root.classes()).toContain("from-amber-50");
  });

  it("should have expandable arrow icon in summary", () => {
    const worries: ParentWorry[] = [
      {
        id: "worry-1",
        question: "Question?",
        answer: "Answer.",
        phases: ["freshman"],
        category: "timeline",
      },
    ];

    const wrapper = mount(CommonWorries, {
      props: {
        worries,
      },
    });

    const summary = wrapper.find("summary");
    expect(summary.text()).toContain("▶");
  });

  it("should have cursor-pointer on expandable items", () => {
    const worries: ParentWorry[] = [
      {
        id: "worry-1",
        question: "Question?",
        answer: "Answer.",
        phases: ["freshman"],
        category: "timeline",
      },
    ];

    const wrapper = mount(CommonWorries, {
      props: {
        worries,
      },
    });

    const details = wrapper.find("details");
    expect(details.classes()).toContain("cursor-pointer");
  });

  it("should display descriptive subtitle", () => {
    const wrapper = mount(CommonWorries, {
      props: {
        worries: [],
      },
    });

    expect(wrapper.text()).toContain("Questions other parents ask");
  });
});
