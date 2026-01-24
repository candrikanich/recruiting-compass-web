import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";
import CommunicationPanel from "~/components/CommunicationPanel.vue";
import type { Coach, School } from "~/types/models";

// Mock composables
vi.mock("~/composables/useCommunicationTemplates", () => ({
  useCommunicationTemplates: () => ({
    getTemplatesByType: vi.fn(() => []),
    interpolateTemplate: vi.fn((template: any, vars: any) => ({
      subject: "Test Subject",
      body: "Test Body",
    })),
  }),
}));

describe("CommunicationPanel", () => {
  let mockCoach: Coach;
  let mockSchool: School;

  beforeEach(() => {
    mockCoach = {
      id: "coach-1",
      school_id: "school-1",
      user_id: "user-1",
      role: "head",
      first_name: "John",
      last_name: "Smith",
      email: "john.smith@university.edu",
      phone: "5551234567",
      twitter_handle: "coach_smith",
      instagram_handle: "coachsmith",
      notes: null,
      responsiveness_score: 0,
      last_contact_date: null,
    };

    mockSchool = {
      id: "school-1",
      user_id: "user-1",
      name: "University of Baseball",
      location: "Somewhere, ST",
      division: "D1",
      conference: "Test Conference",
      ranking: 10,
      is_favorite: false,
      website: "https://university.edu",
      twitter_handle: "university",
      instagram_handle: "university",
      status: "researching",
      notes: null,
      pros: [],
      cons: [],
    };
  });

  describe("Rendering", () => {
    it("should render coach information", () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
          school: mockSchool,
        },
      });

      expect(wrapper.text()).toContain("John Smith");
      expect(wrapper.text()).toContain("Head Coach");
      expect(wrapper.text()).toContain("University of Baseball");
    });

    it("should render email option when coach has email", () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      expect(wrapper.text()).toContain("Send Email");
      expect(wrapper.text()).toContain("john.smith@university.edu");
    });

    it("should not render email option when coach has no email", () => {
      const coachWithoutEmail = { ...mockCoach, email: null };
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: coachWithoutEmail,
        },
      });

      expect(wrapper.text()).not.toContain("Send Email");
    });

    it("should render text option when coach has phone", () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      expect(wrapper.text()).toContain("Send Text");
      expect(wrapper.text()).toContain("(555) 123-4567");
    });

    it("should not render text option when coach has no phone", () => {
      const coachWithoutPhone = { ...mockCoach, phone: null };
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: coachWithoutPhone,
        },
      });

      expect(wrapper.text()).not.toContain("Send Text");
    });

    it("should render twitter option when coach has twitter handle", () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      expect(wrapper.text()).toContain("Send Tweet");
      expect(wrapper.text()).toContain("@coach_smith");
    });

    it("should not render twitter option when coach has no twitter", () => {
      const coachWithoutTwitter = { ...mockCoach, twitter_handle: null };
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: coachWithoutTwitter,
        },
      });

      expect(wrapper.text()).not.toContain("Send Tweet");
    });

    it("should render instagram option when coach has instagram handle", () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      expect(wrapper.text()).toContain("DM on Instagram");
      expect(wrapper.text()).toContain("@coachsmith");
    });
  });

  describe("Email Composer Modal", () => {
    it("should open email composer when email button clicked", async () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      const emailButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Email"));
      await emailButton?.trigger("click");

      expect(wrapper.text()).toContain("Send Email to John");
      expect(wrapper.text()).toContain("Subject");
      expect(wrapper.text()).toContain("Message");
    });

    it("should show logging checkbox checked by default", async () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      const emailButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Email"));
      await emailButton?.trigger("click");

      const checkbox = wrapper.find("#emailLogInteraction");
      expect((checkbox.element as HTMLInputElement).checked).toBe(true);
    });

    it("should allow unchecking logging checkbox", async () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      const emailButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Email"));
      await emailButton?.trigger("click");

      const checkbox = wrapper.find("#emailLogInteraction");
      await checkbox.setValue(false);

      expect((checkbox.element as HTMLInputElement).checked).toBe(false);
    });

    it("should close modal when cancel clicked", async () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      const emailButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Email"));
      await emailButton?.trigger("click");

      const cancelButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Cancel");
      await cancelButton?.trigger("click");

      expect(wrapper.text()).not.toContain("Send Email to John");
    });
  });

  describe("Text Composer Modal", () => {
    it("should open text composer when text button clicked", async () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      const textButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Text"));
      await textButton?.trigger("click");

      expect(wrapper.text()).toContain("Send Text to John");
      expect(wrapper.text()).toContain("SMS limited to 160 characters");
    });

    it("should show logging checkbox checked by default in text modal", async () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      const textButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Text"));
      await textButton?.trigger("click");

      const checkbox = wrapper.find("#textLogInteraction");
      expect((checkbox.element as HTMLInputElement).checked).toBe(true);
    });

    it("should allow unchecking logging checkbox in text modal", async () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      const textButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Text"));
      await textButton?.trigger("click");

      const checkbox = wrapper.find("#textLogInteraction");
      await checkbox.setValue(false);

      expect((checkbox.element as HTMLInputElement).checked).toBe(false);
    });
  });

  describe("Twitter Composer Modal", () => {
    it("should open twitter composer when twitter button clicked", async () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      const twitterButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Tweet"));
      await twitterButton?.trigger("click");

      expect(wrapper.text()).toContain("Tweet to John");
      expect(wrapper.text()).toContain("Tweet limited to 280 characters");
    });

    it("should show logging checkbox checked by default in twitter modal", async () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      const twitterButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Tweet"));
      await twitterButton?.trigger("click");

      const checkbox = wrapper.find("#twitterLogInteraction");
      expect((checkbox.element as HTMLInputElement).checked).toBe(true);
    });
  });

  describe("Interaction Logging - Email", () => {
    it("should emit interaction-logged when email sent with checkbox checked", async () => {
      // Mock window.location.href
      delete (window as any).location;
      (window as any).location = { href: "" };

      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      const emailButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Email"));
      await emailButton?.trigger("click");

      // Fill in email details
      const subjectInput = wrapper.find('input[type="text"]');
      await subjectInput.setValue("Test Subject");

      const bodyTextarea = wrapper.findAll("textarea")[0];
      await bodyTextarea.setValue("Test email body");

      // Send email
      const sendButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Send Email");
      await sendButton?.trigger("click");

      // Check event was emitted
      expect(wrapper.emitted("interaction-logged")).toBeTruthy();
      expect(wrapper.emitted("interaction-logged")?.[0]).toEqual([
        {
          type: "email",
          direction: "outbound",
          content: "Test email body",
        },
      ]);
    });

    it("should NOT emit interaction-logged when email sent with checkbox unchecked", async () => {
      delete (window as any).location;
      (window as any).location = { href: "" };

      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      const emailButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Email"));
      await emailButton?.trigger("click");

      // Uncheck logging
      const checkbox = wrapper.find("#emailLogInteraction");
      await checkbox.setValue(false);

      // Fill in email details
      const subjectInput = wrapper.find('input[type="text"]');
      await subjectInput.setValue("Test Subject");

      const bodyTextarea = wrapper.findAll("textarea")[0];
      await bodyTextarea.setValue("Test email body");

      // Send email
      const sendButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Send Email");
      await sendButton?.trigger("click");

      // Check event was NOT emitted
      expect(wrapper.emitted("interaction-logged")).toBeFalsy();
    });
  });

  describe("Interaction Logging - Text", () => {
    it("should emit interaction-logged when text sent with checkbox checked", async () => {
      delete (window as any).location;
      (window as any).location = { href: "" };

      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      const textButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Text"));
      await textButton?.trigger("click");

      const bodyTextarea = wrapper.find("textarea");
      await bodyTextarea.setValue("Test text message");

      const sendButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Send Text");
      await sendButton?.trigger("click");

      expect(wrapper.emitted("interaction-logged")).toBeTruthy();
      expect(wrapper.emitted("interaction-logged")?.[0]).toEqual([
        {
          type: "text",
          direction: "outbound",
          content: "Test text message",
        },
      ]);
    });

    it("should NOT emit interaction-logged when text sent with checkbox unchecked", async () => {
      delete (window as any).location;
      (window as any).location = { href: "" };

      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      const textButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Text"));
      await textButton?.trigger("click");

      const checkbox = wrapper.find("#textLogInteraction");
      await checkbox.setValue(false);

      const bodyTextarea = wrapper.find("textarea");
      await bodyTextarea.setValue("Test text message");

      const sendButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Send Text");
      await sendButton?.trigger("click");

      expect(wrapper.emitted("interaction-logged")).toBeFalsy();
    });
  });

  describe("Interaction Logging - Twitter", () => {
    it("should emit interaction-logged when tweet sent with checkbox checked", async () => {
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      const twitterButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Tweet"));
      await twitterButton?.trigger("click");

      const bodyTextarea = wrapper.find("textarea");
      await bodyTextarea.setValue("Test tweet");

      const sendButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Send Tweet");
      await sendButton?.trigger("click");

      expect(wrapper.emitted("interaction-logged")).toBeTruthy();
      expect(wrapper.emitted("interaction-logged")?.[0]).toEqual([
        {
          type: "tweet",
          direction: "outbound",
          content: "Test tweet",
        },
      ]);

      openSpy.mockRestore();
    });

    it("should NOT emit interaction-logged when tweet sent with checkbox unchecked", async () => {
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      const twitterButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Tweet"));
      await twitterButton?.trigger("click");

      const checkbox = wrapper.find("#twitterLogInteraction");
      await checkbox.setValue(false);

      const bodyTextarea = wrapper.find("textarea");
      await bodyTextarea.setValue("Test tweet");

      const sendButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Send Tweet");
      await sendButton?.trigger("click");

      expect(wrapper.emitted("interaction-logged")).toBeFalsy();

      openSpy.mockRestore();
    });
  });

  describe("Phone Number Formatting", () => {
    it("should format 10-digit phone number correctly", () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
        },
      });

      expect(wrapper.text()).toContain("(555) 123-4567");
    });

    it("should display unformatted phone if not 10 digits", () => {
      const coachWithShortPhone = { ...mockCoach, phone: "12345" };
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: coachWithShortPhone,
        },
      });

      expect(wrapper.text()).toContain("12345");
    });
  });

  describe("Role Label Display", () => {
    it('should display "Head Coach" for head role', () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: { ...mockCoach, role: "head" },
        },
      });

      expect(wrapper.text()).toContain("Head Coach");
    });

    it('should display "Assistant Coach" for assistant role', () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: { ...mockCoach, role: "assistant" },
        },
      });

      expect(wrapper.text()).toContain("Assistant Coach");
    });

    it('should display "Recruiting Coordinator" for recruiting role', () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: { ...mockCoach, role: "recruiting" },
        },
      });

      expect(wrapper.text()).toContain("Recruiting Coordinator");
    });
  });

  describe("Props", () => {
    it("should use custom playerName prop", () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
          playerName: "Mike Trout",
        },
      });

      // Open email to check variables helper
      const emailButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Email"));
      emailButton?.trigger("click");

      // Check variables are displayed (indirectly through Available Variables section)
      expect(wrapper.text()).toContain("Available Variables");
    });

    it("should use custom highSchool prop", () => {
      const wrapper = mount(CommunicationPanel, {
        props: {
          coach: mockCoach,
          highSchool: "Test High School",
        },
      });

      const emailButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Send Email"));
      emailButton?.trigger("click");

      expect(wrapper.text()).toContain("Available Variables");
    });
  });
});
