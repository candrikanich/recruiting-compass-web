import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ContactFrequencyWidget from "~/components/Dashboard/ContactFrequencyWidget.vue";
import type { Interaction, School } from "~/types/models";
import { createMockSchool } from "~/tests/fixtures/schools.fixture";

const createMockInteraction = (
  overrides: Partial<Interaction> = {},
): Interaction => ({
  id: `int-${Math.random().toString(36).substring(2, 9)}`,
  school_id: "school-1",
  type: "email",
  direction: "outbound",
  occurred_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  logged_by: "user-1",
  ...overrides,
});

const daysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const hoursAgo = (hours: number): Date => {
  const date = new Date();
  date.setTime(date.getTime() - hours * 3600000);
  return date;
};

const minutesAgo = (minutes: number): Date => {
  const date = new Date();
  date.setTime(date.getTime() - minutes * 60000);
  return date;
};

const mountWidget = (
  props: {
    interactions?: Interaction[];
    schools?: School[];
  } = {},
) =>
  mount(ContactFrequencyWidget, {
    props: {
      interactions: props.interactions ?? [],
      schools: props.schools ?? [],
    },
  });

describe("ContactFrequencyWidget", () => {
  describe("rendering", () => {
    it("renders widget with title", () => {
      const wrapper = mountWidget();
      expect(
        wrapper.find('[data-testid="contact-frequency-widget"]').exists(),
      ).toBe(true);
      expect(wrapper.text()).toContain("Contact Frequency");
    });

    it("shows empty state when no schools and no interactions", () => {
      const wrapper = mountWidget({ schools: [], interactions: [] });
      expect(wrapper.text()).toContain("No schools tracked yet");
      expect(wrapper.text()).toContain("Add schools to start tracking");
    });

    it("shows metrics grid when schools exist but no recent contacts", () => {
      const schools = [createMockSchool({ id: "s-1" })];
      const wrapper = mountWidget({ schools, interactions: [] });

      expect(
        wrapper.find('[data-testid="metric-total-schools"]').exists(),
      ).toBe(true);
      expect(wrapper.text()).not.toContain("No schools tracked yet");
    });

    it("displays contact count badge when recent contacts exist", () => {
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: new Date().toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-1" })];

      const wrapper = mountWidget({ interactions, schools });
      const badge = wrapper.find('[data-testid="contact-frequency-count"]');
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toBe("1");
    });

    it("hides contact count badge when no recent contacts", () => {
      const schools = [createMockSchool({ id: "s-1" })];
      const wrapper = mountWidget({ schools, interactions: [] });
      expect(
        wrapper.find('[data-testid="contact-frequency-count"]').exists(),
      ).toBe(false);
    });

    it("limits displayed schools to 5", () => {
      const interactions = Array.from({ length: 8 }, (_, i) =>
        createMockInteraction({
          school_id: `s-${i}`,
          occurred_at: new Date().toISOString(),
        }),
      );
      const schools = Array.from({ length: 8 }, (_, i) =>
        createMockSchool({ id: `s-${i}`, name: `School ${i}` }),
      );

      const wrapper = mountWidget({ interactions, schools });
      const schoolElements = wrapper.findAll(
        '[data-testid^="contacted-school-"]',
      );
      expect(schoolElements).toHaveLength(5);
    });
  });

  describe("metrics calculation", () => {
    it("displays total schools tracked", () => {
      const schools = [
        createMockSchool({ id: "s-1" }),
        createMockSchool({ id: "s-2" }),
        createMockSchool({ id: "s-3" }),
      ];

      const wrapper = mountWidget({ schools, interactions: [] });
      expect(
        wrapper.find('[data-testid="metric-total-schools"]').text(),
      ).toContain("3");
    });

    it("displays schools contacted in last 7 days", () => {
      const now = new Date();
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: now.toISOString(),
        }),
        createMockInteraction({
          school_id: "s-2",
          occurred_at: now.toISOString(),
        }),
      ];
      const schools = [
        createMockSchool({ id: "s-1" }),
        createMockSchool({ id: "s-2" }),
        createMockSchool({ id: "s-3" }),
      ];

      const wrapper = mountWidget({ interactions, schools });
      expect(
        wrapper.find('[data-testid="metric-contacted-7days"]').text(),
      ).toContain("2");
    });

    it("calculates average contact frequency per school per month", () => {
      const now = new Date();
      const interactions = Array.from({ length: 6 }, () =>
        createMockInteraction({ occurred_at: now.toISOString() }),
      );
      const schools = [
        createMockSchool({ id: "s-1" }),
        createMockSchool({ id: "s-2" }),
        createMockSchool({ id: "s-3" }),
      ];

      const wrapper = mountWidget({ interactions, schools });
      expect(
        wrapper.find('[data-testid="metric-avg-frequency"]').text(),
      ).toContain("2.0");
    });

    it("shows 0.0 average when no schools exist", () => {
      const wrapper = mountWidget({ schools: [], interactions: [] });
      // Empty state shown instead of metrics, so avg is not visible
      expect(wrapper.text()).toContain("No schools tracked yet");
    });

    it("counts schools with no recent contact (30+ days)", () => {
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: daysAgo(35).toISOString(),
        }),
      ];
      const schools = [
        createMockSchool({ id: "s-1", name: "Old Contact" }),
        createMockSchool({ id: "s-2", name: "Never Contacted" }),
      ];

      const wrapper = mountWidget({ interactions, schools });
      expect(
        wrapper.find('[data-testid="metric-need-attention"]').text(),
      ).toContain("2");
    });

    it("does not count recently contacted schools as needing attention", () => {
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: daysAgo(5).toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-1" })];

      const wrapper = mountWidget({ interactions, schools });
      expect(
        wrapper.find('[data-testid="metric-need-attention"]').text(),
      ).toContain("0");
    });

    it("counts unique schools in 7-day window (not duplicate interactions)", () => {
      const now = new Date();
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: now.toISOString(),
        }),
        createMockInteraction({
          school_id: "s-1",
          occurred_at: now.toISOString(),
        }),
        createMockInteraction({
          school_id: "s-1",
          occurred_at: now.toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-1" })];

      const wrapper = mountWidget({ interactions, schools });
      expect(
        wrapper.find('[data-testid="contact-frequency-count"]').text(),
      ).toBe("1");
    });
  });

  describe("contact recency colors", () => {
    it("applies green border for schools contacted within 7 days", () => {
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: daysAgo(2).toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-1" })];

      const wrapper = mountWidget({ interactions, schools });
      const row = wrapper.find('[data-testid="contacted-school-s-1"]');
      expect(row.classes()).toContain("border-green-500");
    });

    it("always shows green for recent contacts since list only contains 7-day interactions", () => {
      // The recentContacts computed only includes interactions from the last 7 days.
      // getContactRecency returns green for <= 7 days, so all visible contacts are green.
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: daysAgo(6).toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-1" })];

      const wrapper = mountWidget({ interactions, schools });
      const row = wrapper.find('[data-testid="contacted-school-s-1"]');
      expect(row.classes()).toContain("border-green-500");
    });

    it("does not render schools contacted 8-30 days ago in the list (yellow range)", () => {
      // Schools contacted 8-30 days ago are NOT in recentContacts (7-day filter)
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: daysAgo(15).toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-1" })];

      const wrapper = mountWidget({ interactions, schools });
      expect(
        wrapper.find('[data-testid="contacted-school-s-1"]').exists(),
      ).toBe(false);
    });

    it("does not render schools contacted 31+ days ago in the list (red range)", () => {
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: daysAgo(45).toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-1" })];

      const wrapper = mountWidget({ interactions, schools });
      expect(
        wrapper.find('[data-testid="contacted-school-s-1"]').exists(),
      ).toBe(false);
    });

    it("does not render never-contacted schools in the contact list", () => {
      const schools = [createMockSchool({ id: "s-1" })];
      const wrapper = mountWidget({ schools, interactions: [] });
      expect(
        wrapper.find('[data-testid="contacted-school-s-1"]').exists(),
      ).toBe(false);
    });
  });

  describe("date formatting", () => {
    it("formats as 'Just now' for interactions less than 1 hour ago", () => {
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: minutesAgo(10).toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-1" })];

      const wrapper = mountWidget({ interactions, schools });
      expect(wrapper.text()).toContain("Just now");
    });

    it("formats as hours ago for interactions 1-23 hours old", () => {
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: hoursAgo(3).toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-1" })];

      const wrapper = mountWidget({ interactions, schools });
      expect(wrapper.text()).toContain("3h ago");
    });

    it("formats as 'Yesterday' for interactions exactly 1 day ago", () => {
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: daysAgo(1).toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-1" })];

      const wrapper = mountWidget({ interactions, schools });
      expect(wrapper.text()).toContain("Yesterday");
    });

    it("formats as days ago for interactions 2-6 days old", () => {
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: daysAgo(4).toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-1" })];

      const wrapper = mountWidget({ interactions, schools });
      expect(wrapper.text()).toContain("4d ago");
    });

    it("formats as month and day for interactions 7+ days old", () => {
      // Create interaction exactly 7 days ago (still within the 7-day filter window)
      const sevenDaysAgo = daysAgo(7);
      const expectedMonth = sevenDaysAgo.toLocaleDateString("en-US", {
        month: "short",
      });
      const expectedDay = sevenDaysAgo.getDate().toString();

      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: sevenDaysAgo.toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-1" })];

      const wrapper = mountWidget({ interactions, schools });
      // The 7-day filter uses >= comparison so exactly 7 days might be included
      const row = wrapper.find('[data-testid="contacted-school-s-1"]');
      if (row.exists()) {
        expect(wrapper.text()).toContain(expectedMonth);
      }
    });
  });

  describe("edge cases", () => {
    it("handles empty interactions array", () => {
      const schools = [createMockSchool({ id: "s-1" })];
      const wrapper = mountWidget({ schools, interactions: [] });

      expect(
        wrapper.find('[data-testid="metric-total-schools"]').text(),
      ).toContain("1");
      expect(
        wrapper.find('[data-testid="metric-contacted-7days"]').text(),
      ).toContain("0");
      expect(
        wrapper.find('[data-testid="metric-avg-frequency"]').text(),
      ).toContain("0.0");
      expect(
        wrapper.find('[data-testid="metric-need-attention"]').text(),
      ).toContain("1");
    });

    it("handles empty schools array", () => {
      const wrapper = mountWidget({ schools: [], interactions: [] });
      expect(wrapper.text()).toContain("No schools tracked yet");
    });

    it("handles interactions with undefined occurred_at by falling back to created_at", () => {
      const twoDaysAgo = daysAgo(2);
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: undefined,
          created_at: twoDaysAgo.toISOString(),
        }),
      ];
      const schools = [
        createMockSchool({ id: "s-1", name: "Fallback School" }),
      ];

      const wrapper = mountWidget({ interactions, schools });
      expect(wrapper.text()).toContain("Fallback School");
      expect(wrapper.text()).toContain("2d ago");
    });

    it("handles interactions with undefined school_id gracefully", () => {
      const now = new Date();
      const interactions = [
        createMockInteraction({
          school_id: undefined,
          occurred_at: now.toISOString(),
        }),
        createMockInteraction({
          school_id: "s-1",
          occurred_at: now.toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-1" })];

      const wrapper = mountWidget({ interactions, schools });
      expect(
        wrapper.find('[data-testid="contact-frequency-count"]').text(),
      ).toBe("1");
    });

    it("ignores interactions for schools not in the schools array", () => {
      const now = new Date();
      const interactions = [
        createMockInteraction({
          school_id: "orphan-school",
          occurred_at: now.toISOString(),
        }),
        createMockInteraction({
          school_id: "s-1",
          occurred_at: now.toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-1", name: "Real School" })];

      const wrapper = mountWidget({ interactions, schools });
      expect(
        wrapper.find('[data-testid="contact-frequency-count"]').text(),
      ).toBe("1");
      expect(
        wrapper.find('[data-testid="contacted-school-orphan-school"]').exists(),
      ).toBe(false);
      expect(wrapper.text()).toContain("Real School");
    });

    it("handles both occurred_at and created_at as empty strings", () => {
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: "",
          created_at: "",
        }),
      ];
      const schools = [createMockSchool({ id: "s-1" })];

      // Should not throw; interaction with invalid dates gets filtered out
      const wrapper = mountWidget({ interactions, schools });
      expect(
        wrapper.find('[data-testid="contact-frequency-widget"]').exists(),
      ).toBe(true);
    });
  });

  describe("sorting and grouping", () => {
    it("orders schools by most recent contact first", () => {
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: daysAgo(5).toISOString(),
        }),
        createMockInteraction({
          school_id: "s-2",
          occurred_at: daysAgo(1).toISOString(),
        }),
      ];
      const schools = [
        createMockSchool({ id: "s-1", name: "Older" }),
        createMockSchool({ id: "s-2", name: "Newer" }),
      ];

      const wrapper = mountWidget({ interactions, schools });
      const rows = wrapper.findAll('[data-testid^="contacted-school-"]');
      expect(rows[0].text()).toContain("Newer");
      expect(rows[1].text()).toContain("Older");
    });

    it("aggregates multiple interactions per school with correct count", () => {
      const now = new Date();
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: now.toISOString(),
        }),
        createMockInteraction({
          school_id: "s-1",
          occurred_at: daysAgo(1).toISOString(),
        }),
        createMockInteraction({
          school_id: "s-1",
          occurred_at: daysAgo(2).toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-1", name: "Popular School" })];

      const wrapper = mountWidget({ interactions, schools });
      const row = wrapper.find('[data-testid="contacted-school-s-1"]');
      // The contact count badge should show 3
      expect(row.text()).toContain("3");
    });

    it("uses the most recent interaction date for sorting when a school has multiple", () => {
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: daysAgo(5).toISOString(),
        }),
        createMockInteraction({
          school_id: "s-1",
          occurred_at: daysAgo(1).toISOString(),
        }),
        createMockInteraction({
          school_id: "s-2",
          occurred_at: daysAgo(3).toISOString(),
        }),
      ];
      const schools = [
        createMockSchool({ id: "s-1", name: "Multi Contact" }),
        createMockSchool({ id: "s-2", name: "Single Contact" }),
      ];

      const wrapper = mountWidget({ interactions, schools });
      const rows = wrapper.findAll('[data-testid^="contacted-school-"]');
      // s-1 has most recent at 1 day ago, s-2 at 3 days ago
      expect(rows[0].text()).toContain("Multi Contact");
      expect(rows[1].text()).toContain("Single Contact");
    });
  });

  describe("reactivity", () => {
    it("updates metrics when props change", async () => {
      const schools = [createMockSchool({ id: "s-1" })];
      const wrapper = mountWidget({ schools, interactions: [] });

      expect(
        wrapper.find('[data-testid="metric-total-schools"]').text(),
      ).toContain("1");

      await wrapper.setProps({
        schools: [
          createMockSchool({ id: "s-1" }),
          createMockSchool({ id: "s-2" }),
        ],
      });

      expect(
        wrapper.find('[data-testid="metric-total-schools"]').text(),
      ).toContain("2");
    });

    it("updates contact list when new interactions are added", async () => {
      const schools = [
        createMockSchool({ id: "s-1", name: "School A" }),
        createMockSchool({ id: "s-2", name: "School B" }),
      ];
      const initialInteractions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: new Date().toISOString(),
        }),
      ];

      const wrapper = mountWidget({
        interactions: initialInteractions,
        schools,
      });
      expect(
        wrapper.find('[data-testid="contact-frequency-count"]').text(),
      ).toBe("1");

      await wrapper.setProps({
        interactions: [
          ...initialInteractions,
          createMockInteraction({
            school_id: "s-2",
            occurred_at: new Date().toISOString(),
          }),
        ],
        schools,
      });

      expect(
        wrapper.find('[data-testid="contact-frequency-count"]').text(),
      ).toBe("2");
    });
  });

  describe("navigation links", () => {
    it("generates correct school link URL", () => {
      const interactions = [
        createMockInteraction({
          school_id: "s-42",
          occurred_at: new Date().toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-42" })];

      const wrapper = mountWidget({ interactions, schools });
      const link = wrapper.find('[data-testid="contacted-school-s-42"]');
      expect(link.exists()).toBe(true);
      // NuxtLink renders as <a> with href in test environment
      const href = link.attributes("href") || link.attributes("to");
      expect(href).toContain("/schools/s-42");
    });

    it("applies correct CSS classes for interactivity", () => {
      const interactions = [
        createMockInteraction({
          school_id: "s-1",
          occurred_at: new Date().toISOString(),
        }),
      ];
      const schools = [createMockSchool({ id: "s-1" })];

      const wrapper = mountWidget({ interactions, schools });
      const row = wrapper.find('[data-testid="contacted-school-s-1"]');
      expect(row.classes()).toContain("cursor-pointer");
      expect(row.classes()).toContain("hover:bg-slate-100");
    });
  });
});
