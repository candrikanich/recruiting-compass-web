import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCoachAvailability } from "~/composables/useCoachAvailability";
import { ref } from "vue";
import type { Coach, CoachAvailability, DayAvailability } from "~/types/models";

// Mock composables
const mockCoaches = ref<Coach[]>([]);
const mockUpdateCoach = vi.fn();

vi.mock("~/composables/useCoaches", () => ({
  useCoaches: () => ({
    coaches: mockCoaches,
    updateCoach: mockUpdateCoach,
  }),
}));

describe("useCoachAvailability", () => {
  const createMockCoach = (overrides = {}): Coach => ({
    id: "coach-1",
    school_id: "school-1",
    user_id: "user-1",
    role: "head",
    first_name: "John",
    last_name: "Smith",
    email: "john@example.com",
    phone: "555-1234",
    twitter_handle: "@coach",
    instagram_handle: "coach",
    notes: "",
    responsiveness_score: 75,
    last_contact_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    availability: {
      timezone: "EST",
      monday: { available: true, start_time: "09:00", end_time: "17:00" },
      tuesday: { available: true, start_time: "09:00", end_time: "17:00" },
      wednesday: { available: true, start_time: "09:00", end_time: "17:00" },
      thursday: { available: true, start_time: "09:00", end_time: "17:00" },
      friday: { available: true, start_time: "09:00", end_time: "17:00" },
      saturday: { available: false, start_time: "10:00", end_time: "16:00" },
      sunday: { available: false, start_time: "10:00", end_time: "16:00" },
      blackout_dates: [],
    },
    ...overrides,
  });

  beforeEach(() => {
    mockCoaches.value = [createMockCoach()];
    mockUpdateCoach.mockClear();
    mockUpdateCoach.mockResolvedValue(true);
  });

  describe("getCoachAvailability", () => {
    it("should get coach availability", () => {
      const availability = useCoachAvailability();
      const result = availability.getCoachAvailability("coach-1");

      expect(result).toBeDefined();
      expect(result.timezone).toBe("EST");
      expect(result.monday.available).toBe(true);
    });

    it("should return default availability if coach has none", () => {
      mockCoaches.value = [createMockCoach({ availability: null })];

      const availability = useCoachAvailability();
      const result = availability.getCoachAvailability("coach-1");

      expect(result.timezone).toBe("UTC");
      expect(result.monday.available).toBe(false);
    });

    it("should return default availability for non-existent coach", () => {
      const availability = useCoachAvailability();
      const result = availability.getCoachAvailability("non-existent");

      expect(result.timezone).toBe("UTC");
    });
  });

  describe("updateCoachAvailability", () => {
    it("should update coach availability", async () => {
      const newAvailability: CoachAvailability = {
        timezone: "PST",
        monday: { available: false, start_time: "10:00", end_time: "18:00" },
        tuesday: { available: true, start_time: "10:00", end_time: "18:00" },
        wednesday: { available: true, start_time: "10:00", end_time: "18:00" },
        thursday: { available: true, start_time: "10:00", end_time: "18:00" },
        friday: { available: true, start_time: "10:00", end_time: "18:00" },
        saturday: { available: true, start_time: "10:00", end_time: "16:00" },
        sunday: { available: false, start_time: "10:00", end_time: "16:00" },
        blackout_dates: [],
      };

      const availability = useCoachAvailability();
      const result = await availability.updateCoachAvailability(
        "coach-1",
        newAvailability,
      );

      expect(result).toBe(true);
      expect(mockUpdateCoach).toHaveBeenCalledWith("coach-1", {
        availability: newAvailability,
      });
    });

    it("should return false if coach not found", async () => {
      const availability = useCoachAvailability();
      const result = await availability.updateCoachAvailability(
        "non-existent",
        {} as CoachAvailability,
      );

      expect(result).toBe(false);
    });

    it("should handle update error gracefully", async () => {
      mockUpdateCoach.mockRejectedValue(new Error("Update failed"));

      const availability = useCoachAvailability();
      const result = await availability.updateCoachAvailability(
        "coach-1",
        {} as CoachAvailability,
      );

      expect(result).toBe(false);
    });
  });

  describe("setDayAvailability", () => {
    it("should set availability for a specific day", async () => {
      const dayAvailability: DayAvailability = {
        available: true,
        start_time: "08:00",
        end_time: "18:00",
      };

      const availability = useCoachAvailability();
      const result = await availability.setDayAvailability(
        "coach-1",
        "monday",
        dayAvailability,
      );

      expect(result).toBe(true);
      expect(mockUpdateCoach).toHaveBeenCalled();
    });

    it("should handle case-insensitive day names", async () => {
      const dayAvailability: DayAvailability = {
        available: true,
        start_time: "08:00",
        end_time: "18:00",
      };

      const availability = useCoachAvailability();
      const result = await availability.setDayAvailability(
        "coach-1",
        "MONDAY",
        dayAvailability,
      );

      expect(result).toBe(true);
    });

    it("should return false for invalid day", async () => {
      const dayAvailability: DayAvailability = {
        available: true,
        start_time: "08:00",
        end_time: "18:00",
      };

      const availability = useCoachAvailability();
      const result = await availability.setDayAvailability(
        "coach-1",
        "invalid-day",
        dayAvailability,
      );

      expect(result).toBe(false);
    });
  });

  describe("toggleDayAvailability", () => {
    it("should toggle day availability on", async () => {
      mockCoaches.value = [
        createMockCoach({
          availability: {
            timezone: "EST",
            monday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            tuesday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            wednesday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            thursday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            friday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            saturday: {
              available: false,
              start_time: "10:00",
              end_time: "16:00",
            },
            sunday: {
              available: false,
              start_time: "10:00",
              end_time: "16:00",
            },
            blackout_dates: [],
          },
        }),
      ];

      const availability = useCoachAvailability();
      const result = await availability.toggleDayAvailability(
        "coach-1",
        "monday",
      );

      expect(result).toBe(true);
      expect(mockUpdateCoach).toHaveBeenCalled();
    });

    it("should toggle day availability off", async () => {
      const availability = useCoachAvailability();
      const result = await availability.toggleDayAvailability(
        "coach-1",
        "monday",
      );

      expect(result).toBe(true);
    });

    it("should handle invalid day", async () => {
      const availability = useCoachAvailability();
      const result = await availability.toggleDayAvailability(
        "coach-1",
        "invalid-day",
      );

      expect(result).toBe(false);
    });
  });

  describe("addBlackoutDate", () => {
    it("should add a blackout date", async () => {
      const availability = useCoachAvailability();
      const result = await availability.addBlackoutDate(
        "coach-1",
        "2024-12-25",
      );

      expect(result).toBe(true);
      expect(mockUpdateCoach).toHaveBeenCalled();
    });

    it("should not add duplicate blackout dates", async () => {
      mockCoaches.value = [
        createMockCoach({
          availability: {
            timezone: "EST",
            monday: { available: true, start_time: "09:00", end_time: "17:00" },
            tuesday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            wednesday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            thursday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            friday: { available: true, start_time: "09:00", end_time: "17:00" },
            saturday: {
              available: false,
              start_time: "10:00",
              end_time: "16:00",
            },
            sunday: {
              available: false,
              start_time: "10:00",
              end_time: "16:00",
            },
            blackout_dates: ["2024-12-25"],
          },
        }),
      ];

      const availability = useCoachAvailability();
      const result = await availability.addBlackoutDate(
        "coach-1",
        "2024-12-25",
      );

      expect(result).toBe(false);
    });

    it("should add multiple blackout dates", async () => {
      const availability = useCoachAvailability();

      await availability.addBlackoutDate("coach-1", "2024-12-25");
      await availability.addBlackoutDate("coach-1", "2024-12-26");

      expect(mockUpdateCoach).toHaveBeenCalledTimes(2);
    });
  });

  describe("removeBlackoutDate", () => {
    it("should remove a blackout date", async () => {
      mockCoaches.value = [
        createMockCoach({
          availability: {
            timezone: "EST",
            monday: { available: true, start_time: "09:00", end_time: "17:00" },
            tuesday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            wednesday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            thursday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            friday: { available: true, start_time: "09:00", end_time: "17:00" },
            saturday: {
              available: false,
              start_time: "10:00",
              end_time: "16:00",
            },
            sunday: {
              available: false,
              start_time: "10:00",
              end_time: "16:00",
            },
            blackout_dates: ["2024-12-25", "2024-12-26"],
          },
        }),
      ];

      const availability = useCoachAvailability();
      const result = await availability.removeBlackoutDate(
        "coach-1",
        "2024-12-25",
      );

      expect(result).toBe(true);
      expect(mockUpdateCoach).toHaveBeenCalled();
    });

    it("should handle removing non-existent blackout date", async () => {
      const availability = useCoachAvailability();
      const result = await availability.removeBlackoutDate(
        "coach-1",
        "2024-01-01",
      );

      expect(result).toBe(true);
    });
  });

  describe("isAvailableAt", () => {
    it("should check blackout dates", () => {
      mockCoaches.value = [
        createMockCoach({
          availability: {
            timezone: "EST",
            monday: { available: true, start_time: "09:00", end_time: "17:00" },
            tuesday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            wednesday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            thursday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            friday: { available: true, start_time: "09:00", end_time: "17:00" },
            saturday: {
              available: false,
              start_time: "10:00",
              end_time: "16:00",
            },
            sunday: {
              available: false,
              start_time: "10:00",
              end_time: "16:00",
            },
            blackout_dates: ["2024-01-08"],
          },
        }),
      ];

      const dateStr = "2024-01-08";
      const date = new Date(dateStr);
      const availability = useCoachAvailability();
      const result = availability.isAvailableAt("coach-1", date);

      expect(result).toBe(false);
    });

    it("should return default availability for coach without custom availability", () => {
      mockCoaches.value = [createMockCoach({ availability: null })];

      const availability = useCoachAvailability();
      // Default availability has all days unavailable
      const date = new Date();
      const result = availability.isAvailableAt("coach-1", date);

      expect(result).toBe(false);
    });
  });

  describe("getNextAvailableSlot", () => {
    it("should find next available slot", () => {
      const availability = useCoachAvailability();
      const today = new Date();
      const nextSlot = availability.getNextAvailableSlot("coach-1", today);

      expect(nextSlot).not.toBeNull();
      expect(nextSlot).toBeInstanceOf(Date);
    });

    it("should return null if no availability in 60 days", () => {
      mockCoaches.value = [
        createMockCoach({
          availability: {
            timezone: "EST",
            monday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            tuesday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            wednesday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            thursday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            friday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            saturday: {
              available: false,
              start_time: "10:00",
              end_time: "16:00",
            },
            sunday: {
              available: false,
              start_time: "10:00",
              end_time: "16:00",
            },
            blackout_dates: [],
          },
        }),
      ];

      const availability = useCoachAvailability();
      const nextSlot = availability.getNextAvailableSlot("coach-1");

      expect(nextSlot).toBeNull();
    });

    it("should skip blackout dates", () => {
      mockCoaches.value = [
        createMockCoach({
          availability: {
            timezone: "EST",
            monday: { available: true, start_time: "09:00", end_time: "17:00" },
            tuesday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            wednesday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            thursday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            friday: { available: true, start_time: "09:00", end_time: "17:00" },
            saturday: {
              available: true,
              start_time: "10:00",
              end_time: "16:00",
            },
            sunday: { available: true, start_time: "10:00", end_time: "16:00" },
            blackout_dates: ["2024-01-08", "2024-01-09"],
          },
        }),
      ];

      const availability = useCoachAvailability();
      const startDate = new Date("2024-01-08");
      const nextSlot = availability.getNextAvailableSlot("coach-1", startDate);

      expect(nextSlot).not.toBeNull();
      // Should skip the blackout dates
      expect(nextSlot?.toISOString().split("T")[0]).not.toBe("2024-01-08");
    });
  });

  describe("getAvailabilitySummary", () => {
    it('should return "Not available" if no days available', () => {
      mockCoaches.value = [
        createMockCoach({
          availability: {
            timezone: "EST",
            monday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            tuesday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            wednesday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            thursday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            friday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            saturday: {
              available: false,
              start_time: "10:00",
              end_time: "16:00",
            },
            sunday: {
              available: false,
              start_time: "10:00",
              end_time: "16:00",
            },
            blackout_dates: [],
          },
        }),
      ];

      const availability = useCoachAvailability();
      const summary = availability.getAvailabilitySummary("coach-1");

      expect(summary).toBe("Not available");
    });

    it('should return "Available daily" if all days available', () => {
      mockCoaches.value = [
        createMockCoach({
          availability: {
            timezone: "EST",
            monday: { available: true, start_time: "09:00", end_time: "17:00" },
            tuesday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            wednesday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            thursday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            friday: { available: true, start_time: "09:00", end_time: "17:00" },
            saturday: {
              available: true,
              start_time: "10:00",
              end_time: "16:00",
            },
            sunday: { available: true, start_time: "10:00", end_time: "16:00" },
            blackout_dates: [],
          },
        }),
      ];

      const availability = useCoachAvailability();
      const summary = availability.getAvailabilitySummary("coach-1");

      expect(summary).toBe("Available daily");
    });

    it('should return "Available weekdays" if only weekdays available', () => {
      mockCoaches.value = [
        createMockCoach({
          availability: {
            timezone: "EST",
            monday: { available: true, start_time: "09:00", end_time: "17:00" },
            tuesday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            wednesday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            thursday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            friday: { available: true, start_time: "09:00", end_time: "17:00" },
            saturday: {
              available: false,
              start_time: "10:00",
              end_time: "16:00",
            },
            sunday: {
              available: false,
              start_time: "10:00",
              end_time: "16:00",
            },
            blackout_dates: [],
          },
        }),
      ];

      const availability = useCoachAvailability();
      const summary = availability.getAvailabilitySummary("coach-1");

      expect(summary).toBe("Available weekdays");
    });

    it("should return availability count for partial availability", () => {
      mockCoaches.value = [
        createMockCoach({
          availability: {
            timezone: "EST",
            monday: { available: true, start_time: "09:00", end_time: "17:00" },
            tuesday: {
              available: true,
              start_time: "09:00",
              end_time: "17:00",
            },
            wednesday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            thursday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            friday: {
              available: false,
              start_time: "09:00",
              end_time: "17:00",
            },
            saturday: {
              available: false,
              start_time: "10:00",
              end_time: "16:00",
            },
            sunday: {
              available: false,
              start_time: "10:00",
              end_time: "16:00",
            },
            blackout_dates: [],
          },
        }),
      ];

      const availability = useCoachAvailability();
      const summary = availability.getAvailabilitySummary("coach-1");

      expect(summary).toContain("2 days/week");
    });
  });

  describe("Constants", () => {
    it("should expose days constant", () => {
      const availability = useCoachAvailability();

      expect(availability.DAYS).toEqual([
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ]);
    });
  });
});
