import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import CoachHeader from "~/components/Coach/CoachHeader.vue";
import type { Coach } from "~/types/models";

// Mock utilities
vi.mock("~/utils/coachLabels", () => ({
  getRoleLabel: vi.fn((role: string) => {
    const labels: Record<string, string> = {
      head: "Head Coach",
      assistant: "Assistant Coach",
      recruiting: "Recruiting Coordinator",
    };
    return labels[role] || role;
  }),
}));

vi.mock("~/utils/dateFormatters", () => ({
  formatDate: vi.fn((date: string) => "Jan 15, 2026"),
  daysAgo: vi.fn((date: string) => 5),
}));

// Mock ResponsivenessBadge component
vi.mock("~/components/ResponsivenessBadge.vue", () => ({
  default: {
    name: "ResponsivenessBadge",
    props: ["percentage"],
    template: '<div data-test="responsiveness-badge">{{ percentage }}%</div>',
  },
}));

// Mock Heroicons
vi.mock("@heroicons/vue/24/outline", () => ({
  EnvelopeIcon: { name: "EnvelopeIcon", template: "<svg />" },
  PhoneIcon: { name: "PhoneIcon", template: "<svg />" },
  ChatBubbleLeftIcon: { name: "ChatBubbleLeftIcon", template: "<svg />" },
  ChatBubbleLeftRightIcon: {
    name: "ChatBubbleLeftRightIcon",
    template: "<svg />",
  },
  CalendarIcon: { name: "CalendarIcon", template: "<svg />" },
  ChartBarIcon: { name: "ChartBarIcon", template: "<svg />" },
  PencilIcon: { name: "PencilIcon", template: "<svg />" },
  RssIcon: { name: "RssIcon", template: "<svg />" },
}));

describe("CoachHeader", () => {
  const mockCoach: Coach = {
    id: "coach-123",
    first_name: "John",
    last_name: "Doe",
    role: "head",
    school_id: "school-123",
    email: "john.doe@example.com",
    phone: "555-1234",
    twitter_handle: "@johndoe",
    instagram_handle: "@johndoe_coach",
    responsiveness_score: 85,
    last_contact_date: "2026-01-15",
    notes: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  describe("Rendering", () => {
    it("displays coach name", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      expect(wrapper.text()).toContain("John Doe");
    });

    it("displays role label", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      expect(wrapper.text()).toContain("Head Coach");
    });

    it("displays school name when provided", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach, schoolName: "Test University" },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      expect(wrapper.text()).toContain("Test University");
    });

    it("hides school name when not provided", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      expect(wrapper.text()).not.toContain("Test University");
    });

    it("displays last contact date when available", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      expect(wrapper.text()).toContain("Last contact:");
      expect(wrapper.text()).toContain("5 days ago");
    });

    it("shows no contact message when last_contact_date is null", () => {
      const coachNoContact = { ...mockCoach, last_contact_date: null };
      const wrapper = mount(CoachHeader, {
        props: { coach: coachNoContact },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      expect(wrapper.text()).toContain("No contact recorded yet");
    });

    it("displays responsiveness badge when score is available", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const badge = wrapper.find('[data-test="responsiveness-badge"]');
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toContain("85%");
    });

    it("hides responsiveness badge when score is undefined", () => {
      const coachNoScore = { ...mockCoach, responsiveness_score: undefined };
      const wrapper = mount(CoachHeader, {
        props: { coach: coachNoScore },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const badge = wrapper.find('[data-test="responsiveness-badge"]');
      expect(badge.exists()).toBe(false);
    });
  });

  describe("Contact Information", () => {
    it("displays email with mailto link", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const emailLink = wrapper.find('a[href="mailto:john.doe@example.com"]');
      expect(emailLink.exists()).toBe(true);
      expect(emailLink.text()).toBe("john.doe@example.com");
    });

    it("displays phone with tel link", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const phoneLink = wrapper.find('a[href="tel:555-1234"]');
      expect(phoneLink.exists()).toBe(true);
      expect(phoneLink.text()).toBe("555-1234");
    });

    it("displays Twitter handle with link", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const twitterLink = wrapper.find('a[href="https://twitter.com/johndoe"]');
      expect(twitterLink.exists()).toBe(true);
      expect(twitterLink.text()).toContain("@johndoe");
    });

    it("removes @ from Twitter handle in URL", () => {
      const coachWithAt = { ...mockCoach, twitter_handle: "@johndoe" };
      const wrapper = mount(CoachHeader, {
        props: { coach: coachWithAt },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const twitterLink = wrapper.find('a[href="https://twitter.com/johndoe"]');
      expect(twitterLink.exists()).toBe(true);
    });

    it("displays Instagram handle with link", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const instagramLink = wrapper.find(
        'a[href="https://instagram.com/johndoe_coach"]',
      );
      expect(instagramLink.exists()).toBe(true);
      expect(instagramLink.text()).toContain("@johndoe_coach");
    });

    it("hides contact info when not available", () => {
      const minimalCoach = {
        ...mockCoach,
        email: null,
        phone: null,
        twitter_handle: null,
        instagram_handle: null,
      };
      const wrapper = mount(CoachHeader, {
        props: { coach: minimalCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(false);
      expect(wrapper.find('a[href^="tel:"]').exists()).toBe(false);
      expect(wrapper.find('a[href*="twitter"]').exists()).toBe(false);
      expect(wrapper.find('a[href*="instagram"]').exists()).toBe(false);
    });
  });

  describe("Action Buttons - Primary", () => {
    it("shows Email button when email is available", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const buttons = wrapper.findAll("button");
      const emailButton = buttons.find((btn) => btn.text().includes("Email"));
      expect(emailButton?.exists()).toBe(true);
    });

    it("emits send-email event when Email button clicked", async () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const buttons = wrapper.findAll("button");
      const emailButton = buttons.find((btn) => btn.text().includes("Email"));
      await emailButton?.trigger("click");

      expect(wrapper.emitted("send-email")).toBeTruthy();
      expect(wrapper.emitted("send-email")?.length).toBe(1);
    });

    it("shows Text button when phone is available", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const buttons = wrapper.findAll("button");
      const textButton = buttons.find((btn) => btn.text().includes("Text"));
      expect(textButton?.exists()).toBe(true);
    });

    it("emits send-text event when Text button clicked", async () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const buttons = wrapper.findAll("button");
      const textButton = buttons.find((btn) => btn.text().includes("Text"));
      await textButton?.trigger("click");

      expect(wrapper.emitted("send-text")).toBeTruthy();
    });

    it("shows Call button when phone is available", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const buttons = wrapper.findAll("button");
      const callButton = buttons.find((btn) => btn.text().includes("Call"));
      expect(callButton?.exists()).toBe(true);
    });

    it("emits call-coach event when Call button clicked", async () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const buttons = wrapper.findAll("button");
      const callButton = buttons.find((btn) => btn.text().includes("Call"));
      await callButton?.trigger("click");

      expect(wrapper.emitted("call-coach")).toBeTruthy();
    });

    it("shows Twitter button when Twitter handle is available", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const buttons = wrapper.findAll("button");
      const twitterButton = buttons.find((btn) =>
        btn.text().includes("Twitter"),
      );
      expect(twitterButton?.exists()).toBe(true);
    });

    it("emits open-twitter event when Twitter button clicked", async () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const buttons = wrapper.findAll("button");
      const twitterButton = buttons.find((btn) =>
        btn.text().includes("Twitter"),
      );
      await twitterButton?.trigger("click");

      expect(wrapper.emitted("open-twitter")).toBeTruthy();
    });

    it("shows Instagram button when Instagram handle is available", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const buttons = wrapper.findAll("button");
      const instagramButton = buttons.find((btn) =>
        btn.text().includes("Instagram"),
      );
      expect(instagramButton?.exists()).toBe(true);
    });

    it("emits open-instagram event when Instagram button clicked", async () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const buttons = wrapper.findAll("button");
      const instagramButton = buttons.find((btn) =>
        btn.text().includes("Instagram"),
      );
      await instagramButton?.trigger("click");

      expect(wrapper.emitted("open-instagram")).toBeTruthy();
    });

    it("hides communication buttons when contact info missing", () => {
      const minimalCoach = {
        ...mockCoach,
        email: null,
        phone: null,
        twitter_handle: null,
        instagram_handle: null,
      };
      const wrapper = mount(CoachHeader, {
        props: { coach: minimalCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const buttons = wrapper.findAll("button");
      expect(buttons.find((btn) => btn.text().includes("Email"))).toBeFalsy();
      expect(buttons.find((btn) => btn.text().includes("Text"))).toBeFalsy();
      expect(buttons.find((btn) => btn.text().includes("Call"))).toBeFalsy();
      expect(buttons.find((btn) => btn.text().includes("Twitter"))).toBeFalsy();
      expect(
        buttons.find((btn) => btn.text().includes("Instagram")),
      ).toBeFalsy();
    });
  });

  describe("Action Buttons - Secondary", () => {
    it("shows Analytics link", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      expect(wrapper.text()).toContain("Analytics");
    });

    it("shows Messages link", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      expect(wrapper.text()).toContain("Messages");
    });

    it("shows Availability link", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      expect(wrapper.text()).toContain("Availability");
    });

    it("shows Social Posts link", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      expect(wrapper.text()).toContain("Social Posts");
    });

    it("shows Edit button", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const buttons = wrapper.findAll("button");
      const editButton = buttons.find((btn) => btn.text().includes("Edit"));
      expect(editButton?.exists()).toBe(true);
    });

    it("emits edit-coach event when Edit button clicked", async () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const buttons = wrapper.findAll("button");
      const editButton = buttons.find((btn) => btn.text().includes("Edit"));
      await editButton?.trigger("click");

      expect(wrapper.emitted("edit-coach")).toBeTruthy();
    });

    it("shows Delete button", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const deleteButton = wrapper.find(
        '[data-test="coach-detail-delete-btn"]',
      );
      expect(deleteButton.exists()).toBe(true);
      expect(deleteButton.text()).toContain("Delete Coach");
    });

    it("emits delete-coach event when Delete button clicked", async () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const deleteButton = wrapper.find(
        '[data-test="coach-detail-delete-btn"]',
      );
      await deleteButton.trigger("click");

      expect(wrapper.emitted("delete-coach")).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("has proper aria-label for Twitter link", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const twitterLink = wrapper.find('a[href*="twitter"]');
      expect(twitterLink.attributes("aria-label")).toContain(
        "View John's Twitter profile",
      );
    });

    it("has proper aria-label for Instagram link", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const instagramLink = wrapper.find('a[href*="instagram"]');
      expect(instagramLink.attributes("aria-label")).toContain(
        "View John's Instagram profile",
      );
    });

    it("has proper aria-label for Edit button", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const buttons = wrapper.findAll("button");
      const editButton = buttons.find((btn) => btn.text().includes("Edit"));
      expect(editButton?.attributes("aria-label")).toBe(
        "Edit coach information",
      );
    });

    it("has proper aria-label for Delete button", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const deleteButton = wrapper.find(
        '[data-test="coach-detail-delete-btn"]',
      );
      expect(deleteButton.attributes("aria-label")).toBe(
        "Delete this coach permanently",
      );
    });

    it("uses aria-hidden for decorative icons", () => {
      const wrapper = mount(CoachHeader, {
        props: { coach: mockCoach },
        global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
      });

      const buttons = wrapper.findAll("button");
      const editButton = buttons.find((btn) => btn.text().includes("Edit"));
      // The PencilIcon should have aria-hidden="true" per component code
      expect(editButton?.html()).toContain("aria-hidden");
    });
  });
});
