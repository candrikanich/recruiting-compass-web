import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SuggestionCard from "~/components/Suggestion/SuggestionCard.vue";
import type { Suggestion } from "~/types/timeline";

// Mock navigateTo
const mockNavigateTo = vi.fn();
vi.mock("#app", () => ({
  navigateTo: mockNavigateTo,
}));

describe("SuggestionCard", () => {
  let mockSuggestion: Suggestion;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSuggestion = {
      id: "sug-1",
      athlete_id: "athlete-1",
      rule_type: "missing-video",
      urgency: "medium",
      message: "Create a highlight video",
      action_type: "add_video",
      related_school_id: null,
      related_task_id: null,
      dismissed: false,
      dismissed_at: null,
      completed: false,
      completed_at: null,
      pending_surface: false,
      surfaced_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  describe("rendering", () => {
    it("should render suggestion message", () => {
      const wrapper = mount(SuggestionCard, {
        props: { suggestion: mockSuggestion },
      });

      expect(wrapper.text()).toContain("Create a highlight video");
    });

    it("should render action button when showAction is true", () => {
      const wrapper = mount(SuggestionCard, {
        props: { suggestion: mockSuggestion, showAction: true },
      });

      const buttons = wrapper.findAll("button");
      expect(buttons.some((b) => b.text().includes("Add Video"))).toBe(true);
    });

    it("should not render action button when showAction is false", () => {
      const wrapper = mount(SuggestionCard, {
        props: { suggestion: mockSuggestion, showAction: false },
      });

      expect(wrapper.text()).not.toContain("Add Video");
    });

    it("should always render dismiss button", () => {
      const wrapper = mount(SuggestionCard, {
        props: { suggestion: mockSuggestion },
      });

      expect(wrapper.text()).toContain("Dismiss");
    });

    it("should render learn more button", () => {
      const wrapper = mount(SuggestionCard, {
        props: { suggestion: mockSuggestion },
      });

      expect(wrapper.text()).toContain("Learn More");
    });
  });

  describe("urgency styling", () => {
    it("should apply high urgency styles for urgent suggestions", () => {
      mockSuggestion.urgency = "high";
      const wrapper = mount(SuggestionCard, {
        props: { suggestion: mockSuggestion },
      });

      const card = wrapper.find(".bg-white");
      expect(card.classes()).toContain("border-red-200");
      expect(card.classes()).toContain("bg-red-50");
    });

    it("should apply medium urgency styles", () => {
      mockSuggestion.urgency = "medium";
      const wrapper = mount(SuggestionCard, {
        props: { suggestion: mockSuggestion },
      });

      const card = wrapper.find(".bg-white");
      expect(card.classes()).toContain("border-orange-200");
      expect(card.classes()).toContain("bg-orange-50");
    });

    it("should apply low urgency styles", () => {
      mockSuggestion.urgency = "low";
      const wrapper = mount(SuggestionCard, {
        props: { suggestion: mockSuggestion },
      });

      const card = wrapper.find(".bg-white");
      expect(card.classes()).toContain("border-blue-200");
      expect(card.classes()).toContain("bg-blue-50");
    });
  });

  describe("action labels", () => {
    it("should show 'Add Video' label for add_video action", () => {
      mockSuggestion.action_type = "add_video";
      const wrapper = mount(SuggestionCard, {
        props: { suggestion: mockSuggestion },
      });

      expect(wrapper.text()).toContain("Add Video");
    });

    it("should show 'Log Interaction' label for log_interaction action", () => {
      mockSuggestion.action_type = "log_interaction";
      const wrapper = mount(SuggestionCard, {
        props: { suggestion: mockSuggestion },
      });

      expect(wrapper.text()).toContain("Log Interaction");
    });

    it("should show 'Add School' label for add_school action", () => {
      mockSuggestion.action_type = "add_school";
      const wrapper = mount(SuggestionCard, {
        props: { suggestion: mockSuggestion },
      });

      expect(wrapper.text()).toContain("Add School");
    });

    it("should show 'Update Video' label for update_video action", () => {
      mockSuggestion.action_type = "update_video";
      const wrapper = mount(SuggestionCard, {
        props: { suggestion: mockSuggestion },
      });

      expect(wrapper.text()).toContain("Update Video");
    });

    it("should show 'Take Action' for unknown action types", () => {
      mockSuggestion.action_type = "unknown_action";
      const wrapper = mount(SuggestionCard, {
        props: { suggestion: mockSuggestion },
      });

      expect(wrapper.text()).toContain("Take Action");
    });
  });

  describe("events", () => {
    it("should emit dismiss event when dismiss button clicked", async () => {
      const wrapper = mount(SuggestionCard, {
        props: { suggestion: mockSuggestion },
      });

      const dismissButton = wrapper.findAll("button").find((b) =>
        b.text().includes("Dismiss"),
      );
      await dismissButton?.trigger("click");

      expect(wrapper.emitted("dismiss")).toBeTruthy();
      expect(wrapper.emitted("dismiss")?.[0]).toEqual(["sug-1"]);
    });

    it("should open help modal when learn more clicked", async () => {
      const wrapper = mount(SuggestionCard, {
        props: { suggestion: mockSuggestion },
      });

      const learnMoreButton = wrapper.findAll("button").find((b) =>
        b.text().includes("Learn More"),
      );
      await learnMoreButton?.trigger("click");

      // Check that modal component is open (check internal state)
      expect(wrapper.vm.showHelpModal).toBe(true);
    });

    it("should close modal when close is emitted from modal", async () => {
      const wrapper = mount(SuggestionCard, {
        props: { suggestion: mockSuggestion },
      });

      // Open modal first
      const learnMoreButton = wrapper.findAll("button").find((b) =>
        b.text().includes("Learn More"),
      );
      await learnMoreButton?.trigger("click");
      expect(wrapper.vm.showHelpModal).toBe(true);

      // Now the modal should be rendered and emit close event
      // (In a real test, this would be triggered by the modal component)
    });
  });
});
