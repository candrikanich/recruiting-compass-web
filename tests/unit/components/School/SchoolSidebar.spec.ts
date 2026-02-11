import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SchoolSidebar from "~/components/School/SchoolSidebar.vue";
import type { School, Coach } from "~/types/models";

vi.mock("~/utils/coachLabels", () => ({
  getRoleLabel: (role: string) => {
    const labels: Record<string, string> = {
      head: "Head Coach",
      assistant: "Assistant Coach",
      recruiting: "Recruiting Coordinator",
    };
    return labels[role] || role;
  },
}));

vi.mock("@heroicons/vue/24/outline", () => ({
  ChatBubbleLeftRightIcon: {
    name: "ChatBubbleLeftRightIcon",
    template: "<svg />",
  },
  UsersIcon: { name: "UsersIcon", template: "<svg />" },
  UserCircleIcon: { name: "UserCircleIcon", template: "<svg />" },
  EnvelopeIcon: { name: "EnvelopeIcon", template: "<svg />" },
  ChatBubbleLeftIcon: { name: "ChatBubbleLeftIcon", template: "<svg />" },
  PhoneIcon: { name: "PhoneIcon", template: "<svg />" },
  TrashIcon: { name: "TrashIcon", template: "<svg />" },
}));

const stubs = {
  NuxtLink: {
    template: '<a :href="to"><slot /></a>',
    props: ["to"],
  },
  SchoolStatusHistory: {
    template: "<div>Status History</div>",
    props: ["schoolId"],
  },
  FitScoreDisplay: {
    template: "<div>Fit Score Display</div>",
    props: ["fitScore", "showBreakdown"],
  },
};

const createMockSchool = (overrides = {}): School => ({
  id: "school-123",
  user_id: "user-1",
  name: "Duke University",
  location: "Durham, NC",
  division: "D1",
  conference: "ACC",
  status: "interested",
  is_favorite: false,
  ranking: 5,
  pros: [],
  cons: [],
  notes: null,
  website: null,
  favicon_url: null,
  twitter_handle: null,
  instagram_handle: null,
  updated_at: "2024-06-15T10:30:00Z",
  ...overrides,
});

const createMockCoach = (overrides = {}): Coach => ({
  id: "coach-1",
  school_id: "school-123",
  user_id: "user-1",
  role: "head" as const,
  first_name: "John",
  last_name: "Smith",
  email: "john@duke.edu",
  phone: "555-1234",
  twitter_handle: null,
  ...overrides,
});

const defaultProps = {
  schoolId: "school-123",
  coaches: [createMockCoach()],
  school: createMockSchool(),
};

describe("SchoolSidebar", () => {
  describe("Quick Actions", () => {
    it("renders Quick Actions section", () => {
      const wrapper = mount(SchoolSidebar, {
        props: defaultProps,
        global: { stubs },
      });
      expect(wrapper.text()).toContain("Quick Actions");
    });

    it("renders Log Interaction link", () => {
      const wrapper = mount(SchoolSidebar, {
        props: defaultProps,
        global: { stubs },
      });
      expect(wrapper.text()).toContain("Log Interaction");
    });

    it("renders Send Email button", () => {
      const wrapper = mount(SchoolSidebar, {
        props: defaultProps,
        global: { stubs },
      });
      expect(wrapper.text()).toContain("Send Email");
    });

    it("renders Manage Coaches link", () => {
      const wrapper = mount(SchoolSidebar, {
        props: defaultProps,
        global: { stubs },
      });
      expect(wrapper.text()).toContain("Manage Coaches");
    });

    it("emits open-email-modal on Send Email click", async () => {
      const wrapper = mount(SchoolSidebar, {
        props: defaultProps,
        global: { stubs },
      });
      const emailBtn = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Send Email"));
      await emailBtn?.trigger("click");
      expect(wrapper.emitted("open-email-modal")).toBeTruthy();
    });
  });

  describe("Coaches section", () => {
    it("renders coach name", () => {
      const wrapper = mount(SchoolSidebar, {
        props: defaultProps,
        global: { stubs },
      });
      expect(wrapper.text()).toContain("John Smith");
    });

    it("renders coach role label", () => {
      const wrapper = mount(SchoolSidebar, {
        props: defaultProps,
        global: { stubs },
      });
      expect(wrapper.text()).toContain("Head Coach");
    });

    it("renders email link for coach with email", () => {
      const wrapper = mount(SchoolSidebar, {
        props: defaultProps,
        global: { stubs },
      });
      const emailLink = wrapper.find('a[href="mailto:john@duke.edu"]');
      expect(emailLink.exists()).toBe(true);
    });

    it("renders phone links for coach with phone", () => {
      const wrapper = mount(SchoolSidebar, {
        props: defaultProps,
        global: { stubs },
      });
      const smsLink = wrapper.find('a[href="sms:555-1234"]');
      const telLink = wrapper.find('a[href="tel:555-1234"]');
      expect(smsLink.exists()).toBe(true);
      expect(telLink.exists()).toBe(true);
    });

    it("shows empty state when no coaches", () => {
      const wrapper = mount(SchoolSidebar, {
        props: { ...defaultProps, coaches: [] },
        global: { stubs },
      });
      expect(wrapper.text()).toContain("No coaches added yet");
    });

    it("renders multiple coaches", () => {
      const coaches = [
        createMockCoach({ id: "c1", first_name: "John", last_name: "Smith" }),
        createMockCoach({
          id: "c2",
          first_name: "Jane",
          last_name: "Doe",
          role: "assistant",
        }),
      ];
      const wrapper = mount(SchoolSidebar, {
        props: { ...defaultProps, coaches },
        global: { stubs },
      });
      expect(wrapper.text()).toContain("John Smith");
      expect(wrapper.text()).toContain("Jane Doe");
      expect(wrapper.text()).toContain("Assistant Coach");
    });

    it("hides email link when coach has no email", () => {
      const wrapper = mount(SchoolSidebar, {
        props: {
          ...defaultProps,
          coaches: [createMockCoach({ email: null })],
        },
        global: { stubs },
      });
      const emailLinks = wrapper.findAll('a[href^="mailto:"]');
      expect(emailLinks).toHaveLength(0);
    });

    it("hides phone links when coach has no phone", () => {
      const wrapper = mount(SchoolSidebar, {
        props: {
          ...defaultProps,
          coaches: [createMockCoach({ phone: null })],
        },
        global: { stubs },
      });
      const smsLinks = wrapper.findAll('a[href^="sms:"]');
      const telLinks = wrapper.findAll('a[href^="tel:"]');
      expect(smsLinks).toHaveLength(0);
      expect(telLinks).toHaveLength(0);
    });
  });

  describe("Ranking section", () => {
    it("renders Ranking section", () => {
      const wrapper = mount(SchoolSidebar, {
        props: defaultProps,
        global: { stubs },
      });
      expect(wrapper.text()).toContain("Ranking");
      expect(wrapper.text()).toContain("Current ranking");
    });
  });

  describe("Fit Score section", () => {
    it("renders Fit Score section when fitScore is provided", () => {
      const mockFitScore = {
        score: 85,
        breakdown: {
          academics: { score: 90, weight: 0.3 },
          athletics: { score: 80, weight: 0.4 },
          location: { score: 85, weight: 0.3 },
        },
      };
      const wrapper = mount(SchoolSidebar, {
        props: { ...defaultProps, fitScore: mockFitScore },
        global: { stubs },
      });
      expect(wrapper.text()).toContain("School Fit Analysis");
    });

    it("does not render Fit Score section when fitScore is null", () => {
      const wrapper = mount(SchoolSidebar, {
        props: { ...defaultProps, fitScore: null },
        global: { stubs },
      });
      expect(wrapper.text()).not.toContain("School Fit Analysis");
    });

    it("does not render Fit Score section when fitScore is undefined", () => {
      const wrapper = mount(SchoolSidebar, {
        props: defaultProps,
        global: { stubs },
      });
      expect(wrapper.text()).not.toContain("School Fit Analysis");
    });
  });

  describe("Attribution section", () => {
    it("renders attribution section", () => {
      const wrapper = mount(SchoolSidebar, {
        props: defaultProps,
        global: { stubs },
      });
      expect(wrapper.text()).toContain("Attribution");
      expect(wrapper.text()).toContain("Created by:");
      expect(wrapper.text()).toContain("Last updated:");
    });

    it("renders updated_at date when available", () => {
      const wrapper = mount(SchoolSidebar, {
        props: defaultProps,
        global: { stubs },
      });
      const dateStr = new Date("2024-06-15T10:30:00Z").toLocaleDateString();
      expect(wrapper.text()).toContain(dateStr);
    });

    it("does not render date when updated_at is missing", () => {
      const wrapper = mount(SchoolSidebar, {
        props: {
          ...defaultProps,
          school: createMockSchool({ updated_at: undefined }),
        },
        global: { stubs },
      });
      // Should still have Attribution but no date element
      expect(wrapper.text()).toContain("Attribution");
    });
  });

  describe("Delete button", () => {
    it("renders Delete School button", () => {
      const wrapper = mount(SchoolSidebar, {
        props: defaultProps,
        global: { stubs },
      });
      expect(wrapper.text()).toContain("Delete School");
    });

    it("emits delete on Delete School click", async () => {
      const wrapper = mount(SchoolSidebar, {
        props: defaultProps,
        global: { stubs },
      });
      const deleteBtn = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Delete School"));
      await deleteBtn?.trigger("click");
      expect(wrapper.emitted("delete")).toBeTruthy();
    });
  });
});
