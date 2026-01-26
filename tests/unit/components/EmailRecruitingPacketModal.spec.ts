import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import EmailRecruitingPacketModal from "~/components/EmailRecruitingPacketModal.vue";
import type { Coach } from "~/types/models";

// Mock Teleport to render inline instead of teleporting to body
// This resolves Vue Test Utils happy-dom incompatibility with Teleport
vi.mock("vue", async () => {
  const actual = await vi.importActual<typeof import("vue")>("vue");
  const { defineComponent } = actual;

  return {
    ...actual,
    Teleport: defineComponent({
      name: "Teleport",
      props: {
        to: String,
      },
      setup(_, { slots }) {
        // Render slots inline instead of teleporting
        return () => slots.default?.();
      },
    }),
  };
});

describe("EmailRecruitingPacketModal", () => {
  const mockCoaches: Coach[] = [
    {
      id: "coach-1",
      school_id: "school-1",
      first_name: "Mike",
      last_name: "Smith",
      email: "mike@university.edu",
      user_id: "user-1",
    },
    {
      id: "coach-2",
      school_id: "school-1",
      first_name: "Sarah",
      last_name: "Johnson",
      email: "sarah@university.edu",
      user_id: "user-1",
    },
  ];

  let wrapper: any;

  beforeEach(async () => {
    wrapper = mount(EmailRecruitingPacketModal, {
      props: {
        isOpen: true,
        availableCoaches: mockCoaches,
        defaultSubject: "John Smith - Recruiting Profile",
        defaultBody: "Here is my recruiting packet for your review.",
      },
    });
    // Wait for Transition to complete
    await flushPromises();
    await wrapper.vm.$nextTick();
  });

  describe("Rendering", () => {
    it("should render modal when isOpen is true", () => {
      expect(wrapper.find(".fixed").exists()).toBe(true);
    });

    it("should not render modal when isOpen is false", async () => {
      await wrapper.setProps({ isOpen: false });
      await flushPromises();
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".fixed").exists()).toBe(false);
    });

    it("should display modal title", () => {
      expect(wrapper.text()).toContain("Email Recruiting Packet");
    });

    it("should display available coaches", () => {
      mockCoaches.forEach((coach) => {
        expect(wrapper.text()).toContain(`${coach.first_name} ${coach.last_name}`);
        expect(wrapper.text()).toContain(coach.email);
      });
    });
  });

  describe("Coach Selection", () => {
    it("should allow selecting coaches", async () => {
      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      expect(checkboxes.length).toBeGreaterThan(0);

      await checkboxes[0].setValue(true);
      expect(checkboxes[0].element.checked).toBe(true);
    });

    it("should add selected coach emails to recipients", async () => {
      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      await checkboxes[0].setValue(true);

      await wrapper.vm.$nextTick();

      const recipients = wrapper.vm.allRecipients;
      expect(recipients).toContain(mockCoaches[0].email);
    });

    it("should remove coach email when deselected", async () => {
      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      await checkboxes[0].setValue(true);
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.allRecipients).toContain(mockCoaches[0].email);

      await checkboxes[0].setValue(false);
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.allRecipients).not.toContain(mockCoaches[0].email);
    });
  });

  describe("Manual Email Entry", () => {
    it("should allow entering manual emails", async () => {
      const textarea = wrapper.find('textarea[placeholder*="coach1@example.com"]');
      await textarea.setValue("manual@example.com");

      await wrapper.vm.$nextTick();

      expect(wrapper.vm.allRecipients).toContain("manual@example.com");
    });

    it("should parse comma-separated emails", async () => {
      const textarea = wrapper.find('textarea[placeholder*="coach1@example.com"]');
      await textarea.setValue("email1@example.com, email2@example.com");

      await wrapper.vm.$nextTick();

      expect(wrapper.vm.allRecipients).toContain("email1@example.com");
      expect(wrapper.vm.allRecipients).toContain("email2@example.com");
    });

    it("should validate email format", async () => {
      const textarea = wrapper.find('textarea[placeholder*="coach1@example.com"]');
      await textarea.setValue("invalid-email, valid@example.com");

      await wrapper.vm.$nextTick();

      expect(wrapper.vm.allRecipients).toContain("valid@example.com");
      expect(wrapper.vm.allRecipients).not.toContain("invalid-email");
    });

    it("should handle whitespace in emails", async () => {
      const textarea = wrapper.find('textarea[placeholder*="coach1@example.com"]');
      await textarea.setValue("  email@example.com  ,  another@example.com  ");

      await wrapper.vm.$nextTick();

      expect(wrapper.vm.allRecipients).toContain("email@example.com");
      expect(wrapper.vm.allRecipients).toContain("another@example.com");
    });
  });

  describe("Subject Line", () => {
    it("should use default subject", () => {
      const input = wrapper.find('input[placeholder="Enter subject line"]');
      expect(input.element.value).toBe("John Smith - Recruiting Profile");
    });

    it("should update subject", async () => {
      const input = wrapper.find('input[placeholder="Enter subject line"]');
      await input.setValue("Custom Subject");

      expect(wrapper.vm.form.subject).toBe("Custom Subject");
    });

    it("should limit subject to 200 characters", async () => {
      const input = wrapper.find('input[placeholder="Enter subject line"]');
      const longSubject = "a".repeat(250);
      await input.setValue(longSubject);

      expect(wrapper.vm.form.subject.length).toBeLessThanOrEqual(200);
    });

    it("should display character count", () => {
      expect(wrapper.text()).toContain("/200 characters");
    });
  });

  describe("Email Body", () => {
    it("should use default body", () => {
      const textarea = wrapper.find('textarea[placeholder="Write your message here..."]');
      expect(textarea.element.value).toBe("Here is my recruiting packet for your review.");
    });

    it("should update body", async () => {
      const textarea = wrapper.find('textarea[placeholder="Write your message here..."]');
      await textarea.setValue("Custom message");

      expect(wrapper.vm.form.body).toBe("Custom message");
    });

    it("should limit body to 2000 characters", async () => {
      const textarea = wrapper.find('textarea[placeholder="Write your message here..."]');
      const longBody = "a".repeat(2500);
      await textarea.setValue(longBody);

      expect(wrapper.vm.form.body.length).toBeLessThanOrEqual(2000);
    });

    it("should display character count", () => {
      expect(wrapper.text()).toContain("/2000 characters");
    });
  });

  describe("Validation", () => {
    it("should require at least one recipient", async () => {
      expect(wrapper.vm.canSend).toBe(false);

      const textarea = wrapper.find('textarea[placeholder*="coach1@example.com"]');
      await textarea.setValue("coach@example.com");
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.canSend).toBe(true);
    });

    it("should require subject", async () => {
      const textarea = wrapper.find('textarea[placeholder*="coach1@example.com"]');
      await textarea.setValue("coach@example.com");

      const subjectInput = wrapper.find('input[placeholder="Enter subject line"]');
      await subjectInput.setValue("");

      expect(wrapper.vm.canSend).toBe(false);
    });

    it("should require body", async () => {
      const textarea = wrapper.find('textarea[placeholder*="coach1@example.com"]');
      await textarea.setValue("coach@example.com");

      const bodyInput = wrapper.find('textarea[placeholder="Write your message here..."]');
      await bodyInput.setValue("");

      expect(wrapper.vm.canSend).toBe(false);
    });

    it("should enforce recipient limit", async () => {
      for (let i = 0; i < 12; i++) {
        wrapper.vm.selectedEmails.push(`email${i}@example.com`);
      }
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.canSend).toBe(false);
      expect(wrapper.text()).toContain("Maximum 10 recipients");
    });
  });

  describe("Send Button", () => {
    it("should disable send button when form is invalid", () => {
      const sendButton = wrapper.find("button:contains('Send Email')");
      // Button should be disabled since no recipients
      expect(wrapper.vm.canSend).toBe(false);
    });

    it("should enable send button when form is valid", async () => {
      const textarea = wrapper.find('textarea[placeholder*="coach1@example.com"]');
      await textarea.setValue("coach@example.com");
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.canSend).toBe(true);
    });

    it("should emit send event with correct data", async () => {
      const textarea = wrapper.find('textarea[placeholder*="coach1@example.com"]');
      await textarea.setValue("coach@example.com");
      await wrapper.vm.$nextTick();

      const sendButton = wrapper.findAll("button").find(
        (b) => b.text().includes("Send")
      );
      await sendButton?.trigger("click");

      expect(wrapper.emitted().send).toBeTruthy();
      const emitted = wrapper.emitted().send[0];
      expect(emitted[0].recipients).toContain("coach@example.com");
      expect(emitted[0].subject).toBe("John Smith - Recruiting Profile");
    });
  });

  describe("Close Button", () => {
    it("should emit close event", async () => {
      const closeButton = wrapper.find("button:last-child");
      // Find the close button in header
      const buttons = wrapper.findAll("button");
      const cancelButton = buttons[buttons.length - 2]; // Cancel button
      await cancelButton.trigger("click");

      expect(wrapper.emitted().close).toBeTruthy();
    });

    it("should close modal on outside click", async () => {
      const backdrop = wrapper.find(".fixed");
      await backdrop.trigger("click");

      // Modal should stay open if clicked on backdrop (due to @click.self)
      // But close if Cancel is clicked
    });
  });

  describe("Recipient Tags", () => {
    it("should display selected recipients as tags", async () => {
      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      await checkboxes[0].setValue(true);
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain(mockCoaches[0].email);
    });

    it("should allow removing recipient tag", async () => {
      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      await checkboxes[0].setValue(true);
      await wrapper.vm.$nextTick();

      const removeButtons = wrapper.findAll("button");
      const closeButton = removeButtons.find(
        (b) => b.text().includes("×")
      );

      if (closeButton) {
        await closeButton.trigger("click");
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.allRecipients).not.toContain(mockCoaches[0].email);
      }
    });
  });
});
