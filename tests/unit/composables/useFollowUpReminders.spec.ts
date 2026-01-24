import { describe, it, expect, beforeEach } from "vitest";
import { useFollowUpReminders } from "~/composables/useFollowUpReminders";

describe("useFollowUpReminders", () => {
  let reminders: ReturnType<typeof useFollowUpReminders>;

  beforeEach(() => {
    reminders = useFollowUpReminders();
  });

  describe("initialization", () => {
    it("should initialize with empty reminders", () => {
      expect(reminders.reminders).toBeDefined();
      expect(Array.isArray(reminders.reminders.value)).toBe(true);
    });
  });

  describe("API surface", () => {
    it("should expose required methods", () => {
      expect(typeof reminders.createReminder).toBe("function");
      expect(typeof reminders.completeReminder).toBe("function");
      expect(typeof reminders.deleteReminder).toBe("function");
      expect(typeof reminders.updateReminder).toBe("function");
    });

    it("should expose filtered reminders", () => {
      expect(reminders.activeReminders).toBeDefined();
      expect(reminders.overdueReminders).toBeDefined();
      expect(reminders.upcomingReminders).toBeDefined();
      expect(reminders.completedReminders).toBeDefined();
    });

    it("should expose loading and error states", () => {
      expect(reminders.isLoading).toBeDefined();
      expect(reminders.error).toBeDefined();
    });
  });

  describe("state management", () => {
    it("should have no reminders initially", () => {
      expect(reminders.reminders.value.length).toBe(0);
    });

    it("should have no active reminders initially", () => {
      expect(reminders.activeReminders.value.length).toBe(0);
    });

    it("should have no overdue reminders initially", () => {
      expect(reminders.overdueReminders.value.length).toBe(0);
    });
  });
});
