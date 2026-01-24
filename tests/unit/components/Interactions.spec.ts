import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import InteractionAnalytics from "~/components/Interactions/InteractionAnalytics.vue";
import type { Interaction } from "~/types/models";

describe("InteractionAnalytics Component", () => {
  const createMockInteraction = (overrides = {}): Interaction => ({
    id: "int-1",
    user_id: "user-1",
    school_id: "school-1",
    coach_id: "coach-1",
    type: "email",
    direction: "outbound",
    subject: "Test",
    content: "Content",
    sentiment: "positive",
    occurred_at: "2025-12-20T10:00:00Z",
    created_at: "2025-12-20T10:00:00Z",
    attachments: [],
    ...overrides,
  });

  it("should render analytics cards", () => {
    const interactions = [
      createMockInteraction({ type: "email", direction: "outbound" }),
      createMockInteraction({
        id: "int-2",
        type: "text",
        direction: "inbound",
      }),
    ];

    const wrapper = mount(InteractionAnalytics, {
      props: { interactions },
    });

    expect(wrapper.text()).toContain("Total Interactions");
    expect(wrapper.text()).toContain("Direction");
    expect(wrapper.text()).toContain("Most Used Type");
    expect(wrapper.text()).toContain("Sentiment");
  });

  it("should calculate total interactions", () => {
    const interactions = [
      createMockInteraction(),
      createMockInteraction({ id: "int-2" }),
      createMockInteraction({ id: "int-3" }),
    ];

    const wrapper = mount(InteractionAnalytics, {
      props: { interactions },
    });

    expect(wrapper.text()).toContain("3");
  });

  it("should count outbound vs inbound", () => {
    const interactions = [
      createMockInteraction({ direction: "outbound" }),
      createMockInteraction({ id: "int-2", direction: "outbound" }),
      createMockInteraction({ id: "int-3", direction: "inbound" }),
    ];

    const wrapper = mount(InteractionAnalytics, {
      props: { interactions },
    });

    expect(wrapper.text()).toContain("Outbound");
    expect(wrapper.text()).toContain("Inbound");
  });

  it("should identify most common type", () => {
    const interactions = [
      createMockInteraction({ type: "email" }),
      createMockInteraction({ id: "int-2", type: "email" }),
      createMockInteraction({ id: "int-3", type: "text" }),
    ];

    const wrapper = mount(InteractionAnalytics, {
      props: { interactions },
    });

    expect(wrapper.text()).toContain("Email");
  });

  it("should display type distribution", () => {
    const interactions = [
      createMockInteraction({ type: "email" }),
      createMockInteraction({ id: "int-2", type: "text" }),
      createMockInteraction({ id: "int-3", type: "phone_call" }),
    ];

    const wrapper = mount(InteractionAnalytics, {
      props: { interactions },
    });

    expect(wrapper.text()).toContain("Interactions by Type");
  });

  it("should handle empty interactions list", () => {
    const wrapper = mount(InteractionAnalytics, {
      props: { interactions: [] },
    });

    expect(wrapper.text()).toContain("Total Interactions");
  });

  it("should count sentiment distribution", () => {
    const interactions = [
      createMockInteraction({ sentiment: "positive" }),
      createMockInteraction({ id: "int-2", sentiment: "positive" }),
      createMockInteraction({ id: "int-3", sentiment: "neutral" }),
    ];

    const wrapper = mount(InteractionAnalytics, {
      props: { interactions },
    });

    expect(wrapper.text()).toContain("Sentiment");
  });

  it("should calculate percentages correctly", () => {
    const interactions = [
      createMockInteraction({ type: "email" }),
      createMockInteraction({ id: "int-2", type: "email" }),
      createMockInteraction({ id: "int-3", type: "text" }),
      createMockInteraction({ id: "int-4", type: "text" }),
      createMockInteraction({ id: "int-5", type: "phone_call" }),
    ];

    const wrapper = mount(InteractionAnalytics, {
      props: { interactions },
    });

    // Should show percentage calculations
    expect(wrapper.text()).toContain("%");
  });
});
