import { useCoaches } from "./useCoaches";
import type { CoachAvailability, DayAvailability } from "~/types/models";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DEFAULT_AVAILABILITY: CoachAvailability = {
  timezone: "UTC",
  monday: { available: false, start_time: "09:00", end_time: "17:00" },
  tuesday: { available: false, start_time: "09:00", end_time: "17:00" },
  wednesday: { available: false, start_time: "09:00", end_time: "17:00" },
  thursday: { available: false, start_time: "09:00", end_time: "17:00" },
  friday: { available: false, start_time: "09:00", end_time: "17:00" },
  saturday: { available: false, start_time: "10:00", end_time: "16:00" },
  sunday: { available: false, start_time: "10:00", end_time: "16:00" },
  blackout_dates: [],
};

export const useCoachAvailability = () => {
  const { coaches, updateCoach } = useCoaches();

  /**
   * Get availability for a specific coach
   */
  const getCoachAvailability = (coachId: string): CoachAvailability => {
    const coach = coaches.value.find((c) => c.id === coachId);
    if (!coach || !coach.availability) {
      return JSON.parse(JSON.stringify(DEFAULT_AVAILABILITY));
    }
    return coach.availability as CoachAvailability;
  };

  /**
   * Update coach availability
   */
  const updateCoachAvailability = async (
    coachId: string,
    availability: CoachAvailability,
  ) => {
    const coach = coaches.value.find((c) => c.id === coachId);
    if (!coach) return false;

    try {
      const success = await updateCoach(coachId, { availability });
      return success;
    } catch (err) {
      console.error("Failed to update coach availability:", err);
      return false;
    }
  };

  /**
   * Set availability for a specific day
   */
  const setDayAvailability = async (
    coachId: string,
    day: string,
    dayAvailability: DayAvailability,
  ) => {
    const availability = getCoachAvailability(coachId);
    const key = day.toLowerCase();
    if (DAYS.includes(key)) {
      availability[key] = dayAvailability;
      return updateCoachAvailability(coachId, availability);
    }
    return false;
  };

  /**
   * Toggle availability for a day
   */
  const toggleDayAvailability = async (coachId: string, day: string) => {
    const availability = getCoachAvailability(coachId);
    const key = day.toLowerCase() as keyof CoachAvailability;
    if (key in availability && typeof availability[key] === "object") {
      const dayData = availability[key] as DayAvailability;
      dayData.available = !dayData.available;
      return updateCoachAvailability(coachId, availability);
    }
    return false;
  };

  /**
   * Add blackout date (coach not available)
   */
  const addBlackoutDate = async (coachId: string, date: string) => {
    const availability = getCoachAvailability(coachId);
    if (!availability.blackout_dates.includes(date)) {
      availability.blackout_dates.push(date);
      return updateCoachAvailability(coachId, availability);
    }
    return false;
  };

  /**
   * Remove blackout date
   */
  const removeBlackoutDate = async (coachId: string, date: string) => {
    const availability = getCoachAvailability(coachId);
    availability.blackout_dates = availability.blackout_dates.filter(
      (d) => d !== date,
    );
    return updateCoachAvailability(coachId, availability);
  };

  /**
   * Check if coach is available on a specific date/time
   */
  const isAvailableAt = (
    coachId: string,
    date: Date,
    timeStr?: string,
  ): boolean => {
    const availability = getCoachAvailability(coachId);

    // Check blackout dates
    const dateStr = date.toISOString().split("T")[0];
    if (availability.blackout_dates.includes(dateStr)) {
      return false;
    }

    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayIndex = date.getDay();
    const dayName = DAYS[dayIndex === 0 ? 6 : dayIndex - 1]; // Convert to 0-6 Monday-Sunday
    const dayData = availability[dayName as keyof CoachAvailability] as
      | DayAvailability
      | undefined;

    if (!dayData || !dayData.available) {
      return false;
    }

    // If no specific time provided, just check day availability
    if (!timeStr) {
      return true;
    }

    // Check if time falls within available window
    const [hour, minute] = timeStr.split(":").map(Number);
    const timeValue = hour * 60 + minute;

    const [startHour, startMin] = dayData.start_time.split(":").map(Number);
    const startValue = startHour * 60 + startMin;

    const [endHour, endMin] = dayData.end_time.split(":").map(Number);
    const endValue = endHour * 60 + endMin;

    return timeValue >= startValue && timeValue <= endValue;
  };

  /**
   * Get next available slot for a coach
   */
  const getNextAvailableSlot = (
    coachId: string,
    startDate: Date = new Date(),
  ): Date | null => {
    const availability = getCoachAvailability(coachId);
    const currentDate = new Date(startDate);

    // Check up to 60 days ahead
    for (let i = 0; i < 60; i++) {
      const dateStr = currentDate.toISOString().split("T")[0];

      // Skip blackout dates
      if (availability.blackout_dates.includes(dateStr)) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const dayIndex = currentDate.getDay();
      const dayName = DAYS[dayIndex === 0 ? 6 : dayIndex - 1];
      const dayData = availability[dayName as keyof CoachAvailability] as
        | DayAvailability
        | undefined;

      if (dayData?.available) {
        return currentDate;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return null;
  };

  /**
   * Get availability summary for display
   */
  const getAvailabilitySummary = (coachId: string): string => {
    const availability = getCoachAvailability(coachId);
    const available = DAYS.filter((day) => {
      const dayData = availability[day as keyof CoachAvailability] as
        | DayAvailability
        | undefined;
      return dayData?.available;
    });

    if (available.length === 0) return "Not available";
    if (available.length === 7) return "Available daily";
    if (
      available.length === 5 &&
      !available.includes("saturday") &&
      !available.includes("sunday")
    ) {
      return "Available weekdays";
    }

    return `Available ${available.length} days/week`;
  };

  return {
    getCoachAvailability,
    updateCoachAvailability,
    setDayAvailability,
    toggleDayAvailability,
    addBlackoutDate,
    removeBlackoutDate,
    isAvailableAt,
    getNextAvailableSlot,
    getAvailabilitySummary,
    DAYS,
  };
};
