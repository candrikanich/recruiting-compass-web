import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import InteractionTimelineItem from "~/components/Interactions/InteractionTimelineItem.vue";
import type { Interaction } from "~/types/models";

// Mock the interactionFormatters module
vi.mock("~/utils/interactionFormatters", () => ({
  getTypeIcon: () => "div",
  getTypeIconBg: () => "bg-blue-100",
  getTypeIconColor: () => "text-blue-600",
  formatType: (type: string) => type.replace("_", " ").toUpperCase(),
  formatSentiment: (sentiment: string) =>
    sentiment.replace("_", " ").toUpperCase(),
  getSentimentBadgeClass: () => "bg-green-100 text-green-700",
}));

describe("InteractionTimelineItem Component", () => {
  const createMockInteraction = (overrides = {}): Interaction => ({
    id: "interaction-1",
    school_id: "school-1",
    coach_id: "coach-1",
    event_id: null,
    type: "email",
    direction: "outbound",
    subject: "Initial Contact",
    content: "Sent highlight video and expressed interest",
    sentiment: "positive",
    occurred_at: "2024-02-09T10:00:00Z",
    created_at: "2024-02-09T10:00:00Z",
    updated_at: "2024-02-09T10:00:00Z",
    logged_by: "user-1",
    attachments: [],
    ...overrides,
  });

  describe("Rendering", () => {
    it("should render interaction type", () => {
      const interaction = createMockInteraction();
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.text()).toContain("EMAIL");
    });

    it("should render direction badge", () => {
      const interaction = createMockInteraction({ direction: "outbound" });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.text()).toContain("Outbound");
      expect(wrapper.html()).toContain("bg-blue-100 text-blue-900");
    });

    it("should render inbound direction badge", () => {
      const interaction = createMockInteraction({ direction: "inbound" });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.text()).toContain("Inbound");
      expect(wrapper.html()).toContain("bg-emerald-100 text-emerald-900");
    });

    it("should render subject when present", () => {
      const interaction = createMockInteraction({
        subject: "Follow-up Discussion",
      });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.text()).toContain("Follow-up Discussion");
    });

    it("should not render subject element when subject is null", () => {
      const interaction = createMockInteraction({ subject: null });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      const subjectElement = wrapper.find(
        "p.text-slate-900.font-medium.truncate",
      );
      expect(subjectElement.exists()).toBe(false);
    });

    it("should render content preview", () => {
      const interaction = createMockInteraction({
        content: "This is a detailed interaction note",
      });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.text()).toContain("This is a detailed interaction note");
    });

    it("should render delete button", () => {
      const interaction = createMockInteraction();
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      const deleteButton = wrapper.find("button");
      expect(deleteButton.exists()).toBe(true);
      expect(deleteButton.text()).toBe("Delete");
    });
  });

  describe("Coach Display", () => {
    it("should display coach name when coach_id exists", () => {
      const interaction = createMockInteraction({ coach_id: "coach-1" });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.text()).toContain("John Doe");
    });

    it("should not display coach name when coach_id is null", () => {
      const interaction = createMockInteraction({ coach_id: null });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      // Coach name should not appear, but "Logged" should still be there
      expect(wrapper.text()).not.toContain("John Doe");
      expect(wrapper.text()).toContain("Logged");
    });

    it("should display bullet separator when coach is present", () => {
      const interaction = createMockInteraction({ coach_id: "coach-1" });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "Jane Smith",
        },
      });

      expect(wrapper.html()).toContain("•");
    });
  });

  describe("Sentiment Badge", () => {
    it("should display sentiment badge when sentiment exists", () => {
      const interaction = createMockInteraction({ sentiment: "positive" });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.text()).toContain("POSITIVE");
    });

    it("should not display sentiment badge when sentiment is null", () => {
      const interaction = createMockInteraction({ sentiment: null });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      // Check that no sentiment badge exists
      const badges = wrapper.findAll(".rounded-full");
      // Should only have direction badge, not sentiment
      expect(badges.length).toBe(1);
    });

    it("should display very_positive sentiment", () => {
      const interaction = createMockInteraction({
        sentiment: "very_positive",
      });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.text()).toContain("VERY POSITIVE");
    });

    it("should display neutral sentiment", () => {
      const interaction = createMockInteraction({ sentiment: "neutral" });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.text()).toContain("NEUTRAL");
    });

    it("should display negative sentiment", () => {
      const interaction = createMockInteraction({ sentiment: "negative" });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.text()).toContain("NEGATIVE");
    });
  });

  describe("Date Formatting", () => {
    it("should format occurred_at date correctly", () => {
      const interaction = createMockInteraction({
        occurred_at: "2024-02-09T14:30:00Z",
      });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      // Should show formatted date
      expect(wrapper.text()).toMatch(/Feb.*9.*2024/);
    });

    it("should show Unknown when occurred_at is missing", () => {
      const interaction = createMockInteraction({ occurred_at: undefined });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.text()).toContain("Unknown");
    });

    it("should format created_at as relative time", () => {
      // Set created_at to just now
      const now = new Date();
      const interaction = createMockInteraction({
        created_at: now.toISOString(),
      });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.text()).toContain("just now");
    });

    it("should format created_at as minutes ago", () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const interaction = createMockInteraction({
        created_at: tenMinutesAgo.toISOString(),
      });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.text()).toMatch(/10m ago/);
    });

    it("should format created_at as hours ago", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const interaction = createMockInteraction({
        created_at: twoHoursAgo.toISOString(),
      });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.text()).toMatch(/2h ago/);
    });

    it("should format created_at as days ago", () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const interaction = createMockInteraction({
        created_at: threeDaysAgo.toISOString(),
      });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.text()).toMatch(/3d ago/);
    });
  });

  describe("Interaction Types", () => {
    const types = [
      "email",
      "text",
      "phone_call",
      "in_person_visit",
      "virtual_meeting",
      "camp",
      "showcase",
      "game",
      "unofficial_visit",
      "official_visit",
      "other",
    ];

    types.forEach((type) => {
      it(`should render ${type} interaction type`, () => {
        const interaction = createMockInteraction({ type });
        const wrapper = mount(InteractionTimelineItem, {
          props: {
            interaction,
            coachDisplay: "John Doe",
          },
        });

        expect(wrapper.text()).toContain(type.replace("_", " ").toUpperCase());
      });
    });
  });

  describe("Delete Functionality", () => {
    it("should emit delete event when delete button clicked", async () => {
      const interaction = createMockInteraction({ id: "interaction-123" });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      const deleteButton = wrapper.find("button");
      await deleteButton.trigger("click");

      expect(wrapper.emitted("delete")).toBeTruthy();
      expect(wrapper.emitted("delete")?.[0]).toEqual(["interaction-123"]);
    });

    it("should emit correct interaction id on delete", async () => {
      const interaction = createMockInteraction({ id: "custom-id-456" });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      await wrapper.find("button").trigger("click");

      expect(wrapper.emitted("delete")?.[0]).toEqual(["custom-id-456"]);
    });

    it("should have proper delete button styling", () => {
      const interaction = createMockInteraction();
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      const deleteButton = wrapper.find("button");
      expect(deleteButton.classes()).toContain("text-red-600");
      expect(deleteButton.classes()).toContain("hover:bg-red-50");
    });
  });

  describe("Content Truncation", () => {
    it("should apply line-clamp-2 class to content", () => {
      const interaction = createMockInteraction({
        content:
          "This is a very long content that should be truncated after two lines to maintain a clean layout in the timeline view",
      });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      const content = wrapper.find(".line-clamp-2");
      expect(content.exists()).toBe(true);
    });

    it("should apply truncate class to subject", () => {
      const interaction = createMockInteraction({
        subject:
          "This is a very long subject line that should be truncated with ellipsis",
      });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      const subject = wrapper.find(".truncate");
      expect(subject.exists()).toBe(true);
    });
  });

  describe("Styling and Layout", () => {
    it("should have card styling classes", () => {
      const interaction = createMockInteraction();
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.html()).toContain("bg-white");
      expect(wrapper.html()).toContain("rounded-xl");
      expect(wrapper.html()).toContain("border");
      expect(wrapper.html()).toContain("shadow-sm");
    });

    it("should have hover effect classes", () => {
      const interaction = createMockInteraction();
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.html()).toContain("hover:shadow-md");
    });
  });

  describe("Edge Cases", () => {
    it("should handle interaction with all null optional fields", () => {
      const interaction = createMockInteraction({
        subject: null,
        sentiment: null,
        coach_id: null,
        content: "Minimal interaction",
      });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "",
        },
      });

      expect(wrapper.text()).toContain("Minimal interaction");
      expect(wrapper.text()).toContain("Logged");
    });

    it("should handle very long content", () => {
      const longContent = "A".repeat(5000);
      const interaction = createMockInteraction({ content: longContent });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.find(".line-clamp-2").exists()).toBe(true);
    });

    it("should handle special characters in content", () => {
      const interaction = createMockInteraction({
        content: "Content with <script>alert('xss')</script> and & symbols",
      });
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      expect(wrapper.html()).toContain("&lt;script&gt;");
    });
  });

  describe("Accessibility", () => {
    it("should have accessible delete button", () => {
      const interaction = createMockInteraction();
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      const deleteButton = wrapper.find("button");
      expect(deleteButton.attributes("type")).toBeUndefined(); // Not a submit button
      expect(deleteButton.text()).toBe("Delete");
    });

    it("should display date with calendar icon", () => {
      const interaction = createMockInteraction();
      const wrapper = mount(InteractionTimelineItem, {
        props: {
          interaction,
          coachDisplay: "John Doe",
        },
      });

      // Calendar icon SVG should be present
      const html = wrapper.html();
      expect(html).toContain("Feb 9, 2024");
      expect(html).toContain("svg"); // Icon is an SVG element
    });
  });
});
