import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import CoachRecentInteractions from "~/components/Coach/CoachRecentInteractions.vue";
import type { Interaction } from "~/types/models";

// Mock date formatter
vi.mock("~/utils/dateFormatters", () => ({
  formatDate: vi.fn((date: string) => "Jan 15, 2026"),
}));

// Mock interaction formatters
vi.mock("~/utils/interactionFormatters", () => ({
  getTypeIcon: vi.fn(() => ({ name: "MockIcon", template: "<svg />" })),
  getTypeIconBg: vi.fn(() => "bg-blue-100"),
  getTypeIconColor: vi.fn(() => "text-blue-600"),
  formatType: vi.fn((type: string) => {
    const types: Record<string, string> = {
      email: "Email",
      phone: "Phone Call",
      text: "Text Message",
      in_person: "In-Person Meeting",
    };
    return types[type] || type;
  }),
  getSentimentBadgeClass: vi.fn((sentiment: string) => {
    if (sentiment === "positive") return "bg-green-100 text-green-800";
    if (sentiment === "negative") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  }),
}));

describe("CoachRecentInteractions", () => {
  const mockInteractions: Interaction[] = [
    {
      id: "int-1",
      type: "email",
      direction: "outbound",
      occurred_at: "2026-01-15T10:00:00Z",
      subject: "Recruiting follow-up",
      sentiment: "positive",
      coach_id: "coach-123",
      school_id: "school-123",
      user_id: "user-123",
      family_unit_id: "family-123",
      created_at: "2026-01-15T10:00:00Z",
      updated_at: "2026-01-15T10:00:00Z",
    },
    {
      id: "int-2",
      type: "phone",
      direction: "inbound",
      occurred_at: "2026-01-10T14:30:00Z",
      subject: "Campus visit discussion",
      sentiment: "neutral",
      coach_id: "coach-123",
      school_id: "school-123",
      user_id: "user-123",
      family_unit_id: "family-123",
      created_at: "2026-01-10T14:30:00Z",
      updated_at: "2026-01-10T14:30:00Z",
    },
    {
      id: "int-3",
      type: "text",
      direction: "outbound",
      occurred_at: "2026-01-05T09:15:00Z",
      sentiment: "positive",
      coach_id: "coach-123",
      school_id: "school-123",
      user_id: "user-123",
      family_unit_id: "family-123",
      created_at: "2026-01-05T09:15:00Z",
      updated_at: "2026-01-05T09:15:00Z",
    },
  ];

  describe("Rendering - Empty State", () => {
    it("shows empty state when no interactions", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: [] },
      });

      expect(wrapper.text()).toContain("No interactions recorded yet");
    });

    it("hides interaction list when empty", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: [] },
      });

      const list = wrapper.find("ul");
      expect(list.exists()).toBe(false);
    });

    it("hides View All link when empty", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: [] },
      });

      expect(wrapper.text()).not.toContain("View All");
    });
  });

  describe("Rendering - With Interactions", () => {
    it("displays section heading", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      const heading = wrapper.find("#recent-interactions-heading");
      expect(heading.exists()).toBe(true);
      expect(heading.text()).toBe("Recent Interactions");
    });

    it("renders interaction list", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      const list = wrapper.find("ul");
      expect(list.exists()).toBe(true);
    });

    it("renders correct number of interactions", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      const items = wrapper.findAll("li");
      expect(items.length).toBe(3);
    });

    it("displays interaction type", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      expect(wrapper.text()).toContain("Email");
      expect(wrapper.text()).toContain("Phone Call");
      expect(wrapper.text()).toContain("Text Message");
    });

    it("displays interaction date", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      const times = wrapper.findAll("time");
      expect(times.length).toBe(3);
      times.forEach((time) => {
        expect(time.text()).toBe("Jan 15, 2026");
      });
    });

    it("time elements have datetime attribute", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      const firstTime = wrapper.find("time");
      expect(firstTime.attributes("datetime")).toBe("2026-01-15T10:00:00Z");
    });

    it("displays subject when available", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      expect(wrapper.text()).toContain("Recruiting follow-up");
      expect(wrapper.text()).toContain("Campus visit discussion");
    });

    it("hides subject when not available", () => {
      const interactions = [mockInteractions[2]]; // Text message has no subject
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions },
      });

      const subjects = wrapper.findAll(".text-sm.text-slate-600");
      expect(subjects.length).toBe(0);
    });

    it("displays sentiment badge when available", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      const badges = wrapper.findAll('[role="status"]');
      expect(badges.length).toBeGreaterThan(0);
    });

    it("sentiment badge has proper aria-label", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      const badge = wrapper.find('[role="status"]');
      expect(badge.attributes("aria-label")).toContain("Sentiment:");
    });
  });

  describe("Max Display Limit", () => {
    it("limits interactions to maxDisplay prop", () => {
      const manyInteractions = Array.from({ length: 15 }, (_, i) => ({
        ...mockInteractions[0],
        id: `int-${i}`,
      }));

      const wrapper = mount(CoachRecentInteractions, {
        props: {
          interactions: manyInteractions,
          maxDisplay: 5,
        },
      });

      const items = wrapper.findAll("li");
      expect(items.length).toBe(5);
    });

    it("uses default maxDisplay of 10", () => {
      const manyInteractions = Array.from({ length: 15 }, (_, i) => ({
        ...mockInteractions[0],
        id: `int-${i}`,
      }));

      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: manyInteractions },
      });

      const items = wrapper.findAll("li");
      expect(items.length).toBe(10);
    });

    it("shows all interactions when count is less than maxDisplay", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: {
          interactions: mockInteractions,
          maxDisplay: 10,
        },
      });

      const items = wrapper.findAll("li");
      expect(items.length).toBe(3);
    });
  });

  describe("View All Link", () => {
    it("shows View All link when more interactions than maxDisplay", () => {
      const manyInteractions = Array.from({ length: 15 }, (_, i) => ({
        ...mockInteractions[0],
        id: `int-${i}`,
      }));

      const wrapper = mount(CoachRecentInteractions, {
        props: {
          interactions: manyInteractions,
          maxDisplay: 10,
        },
      });

      expect(wrapper.text()).toContain("View All 15 Interactions");
    });

    it("hides View All link when interactions equal maxDisplay", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: {
          interactions: mockInteractions,
          maxDisplay: 3,
        },
      });

      expect(wrapper.text()).not.toContain("View All");
    });

    it("hides View All link when interactions less than maxDisplay", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: {
          interactions: mockInteractions,
          maxDisplay: 10,
        },
      });

      expect(wrapper.text()).not.toContain("View All");
    });

    it("View All button has proper aria-label with coach name", () => {
      const manyInteractions = Array.from({ length: 15 }, (_, i) => ({
        ...mockInteractions[0],
        id: `int-${i}`,
      }));

      const wrapper = mount(CoachRecentInteractions, {
        props: {
          interactions: manyInteractions,
          maxDisplay: 10,
          coachName: "John Doe",
        },
      });

      const button = wrapper.find("button");
      expect(button.attributes("aria-label")).toBe(
        "View all 15 interactions with John Doe",
      );
    });

    it("View All button has generic aria-label without coach name", () => {
      const manyInteractions = Array.from({ length: 15 }, (_, i) => ({
        ...mockInteractions[0],
        id: `int-${i}`,
      }));

      const wrapper = mount(CoachRecentInteractions, {
        props: {
          interactions: manyInteractions,
          maxDisplay: 10,
        },
      });

      const button = wrapper.find("button");
      expect(button.attributes("aria-label")).toBe("View all 15 interactions");
    });
  });

  describe("Icon Display", () => {
    it("displays icon for each interaction", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      const icons = wrapper.findAll('[role="img"]');
      expect(icons.length).toBe(3);
    });

    it("icon has proper aria-label", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      const icon = wrapper.find('[role="img"]');
      expect(icon.attributes("aria-label")).toContain("icon");
    });

    it("icon SVG has aria-hidden", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      // The component inside should have aria-hidden
      const iconContainer = wrapper.find('[role="img"]');
      expect(iconContainer.html()).toContain("aria-hidden");
    });

    it("applies correct background color to icon container", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      const iconContainer = wrapper.find(".bg-blue-100");
      expect(iconContainer.exists()).toBe(true);
    });
  });

  describe("Sentiment Badge", () => {
    it("applies correct sentiment badge class", () => {
      const interactions = [{ ...mockInteractions[0], sentiment: "positive" }];
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions },
      });

      const badge = wrapper.find(".bg-green-100");
      expect(badge.exists()).toBe(true);
    });

    it("displays sentiment text", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      expect(wrapper.text()).toContain("positive");
      expect(wrapper.text()).toContain("neutral");
    });

    it("hides sentiment badge when not available", () => {
      const interactions = [
        {
          ...mockInteractions[0],
          sentiment: undefined,
        } as Interaction,
      ];
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions },
      });

      const badges = wrapper.findAll('[role="status"]');
      expect(badges.length).toBe(0);
    });
  });

  describe("Accessibility", () => {
    it("list has aria-labelledby attribute", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      const list = wrapper.find("ul");
      expect(list.attributes("aria-labelledby")).toBe(
        "recent-interactions-heading",
      );
    });

    it("first item has no top border", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      const firstItem = wrapper.findAll("li")[0];
      expect(firstItem.classes()).not.toContain("border-t");
    });

    it("subsequent items have top border", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: mockInteractions },
      });

      const items = wrapper.findAll("li");
      for (let i = 1; i < items.length; i++) {
        expect(items[i].classes()).toContain("border-t");
      }
    });

    it("View All button has focus styles", () => {
      const manyInteractions = Array.from({ length: 15 }, (_, i) => ({
        ...mockInteractions[0],
        id: `int-${i}`,
      }));

      const wrapper = mount(CoachRecentInteractions, {
        props: {
          interactions: manyInteractions,
          maxDisplay: 10,
        },
      });

      const button = wrapper.find("button");
      expect(button.classes()).toContain("focus:outline-none");
      expect(button.classes()).toContain("focus:ring-2");
    });
  });

  describe("Subject Truncation", () => {
    it("truncates long subjects", () => {
      const longSubject =
        "This is a very long subject line that should be truncated";
      const interactions = [
        {
          ...mockInteractions[0],
          subject: longSubject,
        },
      ];

      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions },
      });

      const subjectElement = wrapper.find(".truncate");
      expect(subjectElement.exists()).toBe(true);
      expect(subjectElement.classes()).toContain("max-w-[200px]");
    });
  });

  describe("Empty State Styling", () => {
    it("centers empty state text", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: [] },
      });

      const emptyState = wrapper.find(".text-center");
      expect(emptyState.exists()).toBe(true);
      expect(emptyState.classes()).toContain("py-8");
    });

    it("empty state text has correct color", () => {
      const wrapper = mount(CoachRecentInteractions, {
        props: { interactions: [] },
      });

      const emptyText = wrapper.find(".text-slate-600");
      expect(emptyText.exists()).toBe(true);
      expect(emptyText.text()).toBe("No interactions recorded yet");
    });
  });
});
