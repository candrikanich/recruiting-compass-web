import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import WhatNotToStress from "~/components/Timeline/WhatNotToStress.vue";
import type { ReassuranceMessage } from "~/utils/parentReassurance";

describe("WhatNotToStress Component", () => {
  it("should render with title", () => {
    const wrapper = mount(WhatNotToStress, {
      props: {
        messages: [],
      },
    });

    expect(wrapper.text()).toContain("What NOT to Stress About");
  });

  it("should display empty state when no messages", () => {
    const wrapper = mount(WhatNotToStress, {
      props: {
        messages: [],
      },
    });

    expect(wrapper.text()).toContain("No reassurance needed");
  });

  it("should render message items with titles and content", () => {
    const messages: ReassuranceMessage[] = [
      {
        id: "msg-1",
        title: "Late bloomers are common",
        message: "Many athletes develop later in their recruiting journey.",
        phases: ["junior"],
        icon: "🌱",
      },
      {
        id: "msg-2",
        title: "Social media isn't real",
        message: "Highlight reels show exceptions, not the norm.",
        phases: ["freshman", "sophomore"],
        icon: "📱",
      },
    ];

    const wrapper = mount(WhatNotToStress, {
      props: {
        messages,
      },
    });

    expect(wrapper.text()).toContain("Late bloomers are common");
    expect(wrapper.text()).toContain("Many athletes develop later");
    expect(wrapper.text()).toContain("Social media isn't real");
  });

  it("should display message icons", () => {
    const messages: ReassuranceMessage[] = [
      {
        id: "msg-1",
        title: "Title",
        message: "Message",
        phases: ["freshman"],
        icon: "🌱",
      },
      {
        id: "msg-2",
        title: "Title 2",
        message: "Message 2",
        phases: ["freshman"],
        icon: "📱",
      },
    ];

    const wrapper = mount(WhatNotToStress, {
      props: {
        messages,
      },
    });

    expect(wrapper.text()).toContain("🌱");
    expect(wrapper.text()).toContain("📱");
  });

  it("should have shield icon in header", () => {
    const wrapper = mount(WhatNotToStress, {
      props: {
        messages: [],
      },
    });

    expect(wrapper.text()).toContain("🛡️");
  });

  it("should display emerald gradient styling", () => {
    const wrapper = mount(WhatNotToStress, {
      props: {
        messages: [],
      },
    });

    const root = wrapper.find("div");
    expect(root.classes()).toContain("bg-gradient-to-br");
    expect(root.classes()).toContain("from-emerald-50");
  });

  it("should display messages non-collapsing (always visible)", () => {
    const messages: ReassuranceMessage[] = [
      {
        id: "msg-1",
        title: "Title",
        message: "Message content here",
        phases: ["freshman"],
        icon: "🌱",
      },
    ];

    const wrapper = mount(WhatNotToStress, {
      props: {
        messages,
      },
    });

    // Should NOT have details/summary elements (no accordion)
    const details = wrapper.findAll("details");
    expect(details.length).toBe(0);

    // Message should be visible directly
    expect(wrapper.text()).toContain("Message content here");
  });

  it("should have checkmark styling (emerald border/text)", () => {
    const messages: ReassuranceMessage[] = [
      {
        id: "msg-1",
        title: "Title",
        message: "Message",
        phases: ["freshman"],
        icon: "✓",
      },
    ];

    const wrapper = mount(WhatNotToStress, {
      props: {
        messages,
      },
    });

    const messageItem = wrapper.find("[class*='emerald']");
    expect(messageItem.exists()).toBe(true);
  });

  it("should display descriptive subtitle", () => {
    const wrapper = mount(WhatNotToStress, {
      props: {
        messages: [],
      },
    });

    expect(wrapper.text()).toContain("Things that don't matter as much");
  });

  it("should have hover effect on message items", () => {
    const messages: ReassuranceMessage[] = [
      {
        id: "msg-1",
        title: "Title",
        message: "Message",
        phases: ["freshman"],
        icon: "🌱",
      },
    ];

    const wrapper = mount(WhatNotToStress, {
      props: {
        messages,
      },
    });

    // Find the message item container
    const messageItem = wrapper.find(".bg-white.rounded-lg");
    expect(messageItem.exists()).toBe(true);
    expect(messageItem.classes()).toContain("hover:border-emerald-200");
  });

  it("renders collapsed when collapsed prop is true", () => {
    const wrapper = mount(WhatNotToStress, {
      props: {
        messages: [{ id: "r1", title: "Relax", message: "It's fine", icon: "🛡️" }],
        collapsed: true,
      },
    });
    expect(wrapper.text()).toContain("What NOT to Stress About");
    expect(wrapper.text()).not.toContain("Relax");
  });

  it("emits toggle when header is clicked", async () => {
    const wrapper = mount(WhatNotToStress, {
      props: { messages: [], collapsed: false },
    });
    await wrapper.find("[data-testid='guidance-header']").trigger("click");
    expect(wrapper.emitted("toggle")).toBeTruthy();
  });
});
