import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import WhatMattersNow from "~/components/Timeline/WhatMattersNow.vue";
import type { WhatMattersItem } from "~/utils/whatMattersNow";

describe("WhatMattersNow Component", () => {
  it("should render with title and phase label", () => {
    const priorities: WhatMattersItem[] = [];
    const wrapper = mount(WhatMattersNow, {
      props: {
        priorities,
        phaseLabel: "Freshman",
      },
    });

    expect(wrapper.text()).toContain("What Matters Right Now");
    expect(wrapper.text()).toContain("Freshman year priorities");
  });

  it("should display empty state when no priorities", () => {
    const wrapper = mount(WhatMattersNow, {
      props: {
        priorities: [],
        phaseLabel: "Freshman",
      },
    });

    expect(wrapper.text()).toContain("All tasks complete");
  });

  it("should render priority items with titles and why-it-matters text", () => {
    const priorities: WhatMattersItem[] = [
      {
        taskId: "task-1",
        title: "Get Grades Up",
        whyItMatters: "Colleges care about academics",
        category: "academic-standing",
        priority: 10,
        isRequired: true,
      },
      {
        taskId: "task-2",
        title: "Attend Summer Camp",
        whyItMatters: "Build visibility with coaches",
        category: "visibility-building",
        priority: 8,
        isRequired: true,
      },
    ];

    const wrapper = mount(WhatMattersNow, {
      props: {
        priorities,
        phaseLabel: "Freshman",
      },
    });

    expect(wrapper.text()).toContain("Get Grades Up");
    expect(wrapper.text()).toContain("Colleges care about academics");
    expect(wrapper.text()).toContain("Attend Summer Camp");
  });

  it("should display numbered items (1-5)", () => {
    const priorities: WhatMattersItem[] = Array.from({ length: 5 }, (_, i) => ({
      taskId: `task-${i}`,
      title: `Priority ${i + 1}`,
      whyItMatters: "Important",
      category: "visibility-building",
      priority: 10 - i,
      isRequired: true,
    }));

    const wrapper = mount(WhatMattersNow, {
      props: {
        priorities,
        phaseLabel: "Freshman",
      },
    });

    for (let i = 1; i <= 5; i++) {
      expect(wrapper.text()).toContain(i.toString());
    }
  });

  it("should emit priority-click event when clicking priority item", async () => {
    const priorities: WhatMattersItem[] = [
      {
        taskId: "task-1",
        title: "Get Grades Up",
        whyItMatters: "Important",
        category: "academic-standing",
        priority: 10,
        isRequired: true,
      },
    ];

    const wrapper = mount(WhatMattersNow, {
      props: {
        priorities,
        phaseLabel: "Freshman",
      },
    });

    const button = wrapper.find("button");
    await button.trigger("click");

    expect(wrapper.emitted("priority-click")).toBeTruthy();
    expect(wrapper.emitted("priority-click")?.[0]).toEqual(["task-1"]);
  });

  it("should have lightning bolt icon", () => {
    const wrapper = mount(WhatMattersNow, {
      props: {
        priorities: [],
        phaseLabel: "Freshman",
      },
    });

    expect(wrapper.text()).toContain("⚡");
  });

  it("should display blue gradient styling", () => {
    const wrapper = mount(WhatMattersNow, {
      props: {
        priorities: [],
        phaseLabel: "Freshman",
      },
    });

    const root = wrapper.find("div");
    expect(root.classes()).toContain("bg-gradient-to-br");
    expect(root.classes()).toContain("from-blue-50");
  });

  it("should truncate long why-it-matters text", () => {
    const longText = "A".repeat(200);
    const priorities: WhatMattersItem[] = [
      {
        taskId: "task-1",
        title: "Task",
        whyItMatters: longText,
        category: "visibility-building",
        priority: 10,
        isRequired: true,
      },
    ];

    const wrapper = mount(WhatMattersNow, {
      props: {
        priorities,
        phaseLabel: "Freshman",
      },
    });

    // Should have line-clamp class
    const content = wrapper.find("[class*='line-clamp']");
    expect(content.exists()).toBe(true);
  });
});
