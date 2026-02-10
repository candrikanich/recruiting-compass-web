import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import InteractionAddForm from "~/components/Interactions/InteractionAddForm.vue";
import type { Coach } from "~/types/models";

describe("InteractionAddForm Component", () => {
  const mockCoaches: Coach[] = [
    {
      id: "coach-1",
      school_id: "school-1",
      first_name: "John",
      last_name: "Doe",
      title: "Head Coach",
      email: "john@example.com",
      phone: "555-1234",
      is_primary: true,
      created_at: "2024-01-01",
    },
    {
      id: "coach-2",
      school_id: "school-1",
      first_name: "Jane",
      last_name: "Smith",
      title: "Assistant Coach",
      email: "jane@example.com",
      phone: "555-5678",
      is_primary: false,
      created_at: "2024-01-01",
    },
  ];

  describe("Form Rendering", () => {
    it("should render all required form fields", () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: mockCoaches, loading: false },
      });

      expect(wrapper.find('select[id="type"]').exists()).toBe(true);
      expect(wrapper.find('select[id="direction"]').exists()).toBe(true);
      expect(wrapper.find('textarea[id="content"]').exists()).toBe(true);
      expect(wrapper.find('input[id="occurred_at"]').exists()).toBe(true);
    });

    it("should render coach dropdown with all coaches", () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: mockCoaches, loading: false },
      });

      const coachSelect = wrapper.find('select[id="coach"]');
      expect(coachSelect.exists()).toBe(true);

      const options = coachSelect.findAll("option");
      expect(options.length).toBeGreaterThanOrEqual(mockCoaches.length);
    });

    it("should show optional fields (subject, sentiment)", () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: mockCoaches, loading: false },
      });

      expect(wrapper.find('input[id="subject"]').exists()).toBe(true);
      expect(wrapper.find('select[id="sentiment"]').exists()).toBe(true);
    });

    it("should include reminder toggle", () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: mockCoaches, loading: false },
      });

      expect(wrapper.find('input[id="reminder-enabled"]').exists()).toBe(true);
    });
  });

  describe("Form Validation", () => {
    it("should require type selection", async () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: mockCoaches, loading: false },
      });

      const typeSelect = wrapper.find('select[id="type"]');
      expect(typeSelect.attributes("required")).toBeDefined();
    });

    it("should require direction selection", async () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: mockCoaches, loading: false },
      });

      const directionSelect = wrapper.find('select[id="direction"]');
      expect(directionSelect.attributes("required")).toBeDefined();
    });

    it("should require content field", async () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: mockCoaches, loading: false },
      });

      const contentField = wrapper.find('textarea[id="content"]');
      expect(contentField.attributes("required")).toBeDefined();
    });

    it("should require occurred_at datetime", async () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: mockCoaches, loading: false },
      });

      const dateField = wrapper.find('input[id="occurred_at"]');
      expect(dateField.attributes("required")).toBeDefined();
    });
  });

  describe("Reminder Toggle", () => {
    it("should show reminder fields when enabled", async () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: mockCoaches, loading: false },
      });

      // Initially hidden
      expect(wrapper.find('input[id="reminder-date"]').exists()).toBe(false);

      // Enable reminder
      await wrapper.find('input[id="reminder-enabled"]').setValue(true);

      // Should show reminder fields
      expect(wrapper.find('input[id="reminder-date"]').exists()).toBe(true);
      expect(wrapper.find('select[id="reminder-type"]').exists()).toBe(true);
    });

    it("should hide reminder fields when disabled", async () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: mockCoaches, loading: false },
      });

      // Enable then disable
      await wrapper.find('input[id="reminder-enabled"]').setValue(true);
      await wrapper.find('input[id="reminder-enabled"]').setValue(false);

      // Should hide fields
      expect(wrapper.find('input[id="reminder-date"]').exists()).toBe(false);
    });
  });

  describe("File Attachments", () => {
    it("should include file input field", () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: mockCoaches, loading: false },
      });

      const fileInput = wrapper.find('input[id="attachments"]');
      expect(fileInput.exists()).toBe(true);
      expect(fileInput.attributes("type")).toBe("file");
    });

    it("should accept multiple files", () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: mockCoaches, loading: false },
      });

      const fileInput = wrapper.find('input[id="attachments"]');
      expect(fileInput.attributes("multiple")).toBeDefined();
    });
  });

  describe("Form Submission", () => {
    it("should emit submit event with form data", async () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: mockCoaches, loading: false },
      });

      // Fill form
      await wrapper.find('select[id="type"]').setValue("email");
      await wrapper.find('select[id="direction"]').setValue("outbound");
      await wrapper.find('textarea[id="content"]').setValue("Test content");
      await wrapper
        .find('input[id="occurred_at"]')
        .setValue("2024-02-09T10:00");

      // Submit
      await wrapper.find("form").trigger("submit");

      expect(wrapper.emitted("submit")).toBeTruthy();
      const submitData = wrapper.emitted("submit")?.[0]?.[0] as any;
      expect(submitData.type).toBe("email");
      expect(submitData.direction).toBe("outbound");
      expect(submitData.content).toBe("Test content");
    });

    it("should emit cancel event when cancel clicked", async () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: mockCoaches, loading: false },
      });

      const cancelButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Cancel"));
      await cancelButton?.trigger("click");

      expect(wrapper.emitted("cancel")).toBeTruthy();
    });

    it("should disable submit button when loading", () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: mockCoaches, loading: true },
      });

      const submitBtn = wrapper.find('button[type="submit"]');
      expect(submitBtn.attributes("disabled")).toBeDefined();
    });
  });

  describe("Coach Selection", () => {
    it("should allow empty coach selection", () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: mockCoaches, loading: false },
      });

      const coachSelect = wrapper.find('select[id="coach"]');
      expect(coachSelect.attributes("required")).toBeUndefined();
    });

    it("should handle no coaches available", () => {
      const wrapper = mount(InteractionAddForm, {
        props: { coaches: [], loading: false },
      });

      // When no coaches, the select doesn't render (v-if="coaches.length > 0")
      expect(wrapper.find('select[id="coach"]').exists()).toBe(false);
    });
  });
});
