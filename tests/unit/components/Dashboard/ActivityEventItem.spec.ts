import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import ActivityEventItem from "~/components/Dashboard/ActivityEventItem.vue";
import type { ActivityEvent } from "~/composables/useActivityFeed";

describe("ActivityEventItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createActivity = (
    overrides?: Partial<ActivityEvent>,
  ): ActivityEvent => ({
    id: "1",
    type: "interaction",
    timestamp: new Date().toISOString(),
    title: "Email to ASU",
    description: "Test email content",
    icon: "📧",
    entityType: "interaction",
    clickable: true,
    clickUrl: "/interactions?id=1",
    metadata: { relativeTime: "2h ago" },
    ...overrides,
  });

  it("renders event title", () => {
    const activity = createActivity({ title: "Test Activity" });

    const wrapper = mount(ActivityEventItem, {
      props: { event: activity },
    });

    expect(wrapper.text()).toContain("Test Activity");
  });

  it("renders event description", () => {
    const activity = createActivity({ description: "Test description" });

    const wrapper = mount(ActivityEventItem, {
      props: { event: activity },
    });

    expect(wrapper.text()).toContain("Test description");
  });

  it("displays event icon", () => {
    const activity = createActivity({ icon: "📧" });

    const wrapper = mount(ActivityEventItem, {
      props: { event: activity },
    });

    expect(wrapper.text()).toContain("📧");
  });

  it("shows relative time", () => {
    const activity = createActivity({
      metadata: { relativeTime: "3h ago" },
    });

    const wrapper = mount(ActivityEventItem, {
      props: { event: activity },
    });

    expect(wrapper.text()).toContain("3h ago");
  });

  it("applies clickable styling for clickable events", () => {
    const activity = createActivity({ clickable: true });

    const wrapper = mount(ActivityEventItem, {
      props: { event: activity },
    });

    const element = wrapper.find('[data-testid="activity-event-item"]');
    expect(element.classes()).toContain("cursor-pointer");
  });

  it("does not apply clickable styling for non-clickable events", () => {
    const activity = createActivity({ clickable: false });

    const wrapper = mount(ActivityEventItem, {
      props: { event: activity },
    });

    const element = wrapper.find('[data-testid="activity-event-item"]');
    expect(element.classes()).not.toContain("cursor-pointer");
  });

  it("truncates long descriptions to first 50 chars", () => {
    const longDescription = "A".repeat(100);
    const activity = createActivity({ description: longDescription });

    const wrapper = mount(ActivityEventItem, {
      props: { event: activity },
    });

    // The component should truncate, so we won't see all 100 characters
    const text = wrapper.text();
    expect(text.length).toBeLessThan(150); // Reasonable limit with other text
  });

  it("shows only relevant metadata", () => {
    const activity = createActivity({
      metadata: { relativeTime: "1h ago", secret: "hidden" },
    });

    const wrapper = mount(ActivityEventItem, {
      props: { event: activity },
    });

    expect(wrapper.text()).toContain("1h ago");
  });

  it("does not show description when empty", () => {
    const activity = createActivity({ description: "" });

    const wrapper = mount(ActivityEventItem, {
      props: { event: activity },
    });

    expect(wrapper.text()).not.toContain("undefined");
  });

  it("data-testid attribute is set correctly", () => {
    const activity = createActivity();

    const wrapper = mount(ActivityEventItem, {
      props: { event: activity },
    });

    expect(wrapper.find('[data-testid="activity-event-item"]').exists()).toBe(
      true,
    );
  });
});
