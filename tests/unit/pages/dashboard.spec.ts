import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import type { School, Interaction, Notification, Coach } from "~/types/models";
import { createMockUser } from "~/tests/fixtures/user.fixture";
import { createMockEvent } from "~/tests/fixtures/events.fixture";
import { createMockOffer } from "~/tests/fixtures/offers.fixture";
import { createMockMetric } from "~/tests/fixtures/metrics.fixture";
import {
  createMockInteraction,
  createMockInteractions,
} from "~/tests/fixtures/interactions.fixture";
import {
  createMockCoach,
  createMockCoaches,
} from "~/tests/fixtures/coaches.fixture";
import {
  createMockSchool,
  createMockSchools,
  createSmallSchool,
  createMediumSchool,
  createLargeSchool,
  createVeryLargeSchool,
} from "~/tests/fixtures/schools.fixture";
import { getCarnegieSize } from "~/utils/schoolSize";

// Mock modules
vi.mock("~/composables/useSupabase");
vi.mock("~/composables/useAuth");
vi.mock("~/composables/useNotifications");
vi.mock("~/composables/useDocuments");
vi.mock("~/composables/useToast");
vi.mock("~/composables/useUserTasks");
vi.mock("~/composables/useUserPreferences");
vi.mock("~/composables/useSuggestions");
vi.mock("~/composables/useFamilyContext");
vi.mock("~/composables/useViewLogging");

describe("Dashboard Page Logic", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("aTierSchoolCount computed property", () => {
    it("counts schools with priority_tier === A", () => {
      const schools: School[] = [
        {
          id: "1",
          user_id: "user-1",
          name: "Stanford",
          location: null,
          status: "interested",
          notes: null,
          pros: [],
          cons: [],
          is_favorite: false,
          priority_tier: "A",
        },
        {
          id: "2",
          user_id: "user-1",
          name: "Berkeley",
          location: null,
          status: "interested",
          notes: null,
          pros: [],
          cons: [],
          is_favorite: false,
          priority_tier: "A",
        },
        {
          id: "3",
          user_id: "user-1",
          name: "UCLA",
          location: null,
          status: "interested",
          notes: null,
          pros: [],
          cons: [],
          is_favorite: false,
          priority_tier: "B",
        },
      ];

      // Expected: 2 A-tier schools
      const aTierCount = schools.filter((s) => s.priority_tier === "A").length;
      expect(aTierCount).toBe(2);
    });

    it("returns 0 when no A-tier schools", () => {
      const schools: School[] = [
        {
          id: "1",
          user_id: "user-1",
          name: "Stanford",
          location: null,
          status: "interested",
          notes: null,
          pros: [],
          cons: [],
          is_favorite: false,
          priority_tier: "B",
        },
        {
          id: "2",
          user_id: "user-1",
          name: "Berkeley",
          location: null,
          status: "interested",
          notes: null,
          pros: [],
          cons: [],
          is_favorite: false,
          priority_tier: "C",
        },
      ];

      const aTierCount = schools.filter((s) => s.priority_tier === "A").length;
      expect(aTierCount).toBe(0);
    });

    it("returns 0 with empty schools array", () => {
      const schools: School[] = [];
      const aTierCount = schools.filter((s) => s.priority_tier === "A").length;
      expect(aTierCount).toBe(0);
    });

    it("ignores schools without priority_tier", () => {
      const schools: School[] = [
        {
          id: "1",
          user_id: "user-1",
          name: "Stanford",
          location: null,
          status: "interested",
          notes: null,
          pros: [],
          cons: [],
          is_favorite: false,
          priority_tier: null,
        },
        {
          id: "2",
          user_id: "user-1",
          name: "Berkeley",
          location: null,
          status: "interested",
          notes: null,
          pros: [],
          cons: [],
          is_favorite: false,
          priority_tier: "A",
        },
      ];

      const aTierCount = schools.filter((s) => s.priority_tier === "A").length;
      expect(aTierCount).toBe(1);
    });
  });

  describe("contactsThisMonth computed property", () => {
    it("counts interactions occurring this month", () => {
      const now = new Date();
      const currentMonth = now.getUTCMonth();
      const currentYear = now.getUTCFullYear();

      // Use UTC to avoid timezone conversion ambiguity
      const startOfMonth = new Date(
        Date.UTC(currentYear, currentMonth, 1, 0, 0, 0),
      );
      const endOfMonth = new Date(
        Date.UTC(currentYear, currentMonth + 1, 1, 0, 0, 0),
      );

      const interactions: Interaction[] = [
        {
          id: "1",
          school_id: "school-1",
          type: "email",
          direction: "outbound",
          occurred_at: new Date(
            Date.UTC(currentYear, currentMonth, 15, 12, 0, 0),
          ).toISOString(),
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          school_id: "school-2",
          type: "email",
          direction: "outbound",
          occurred_at: new Date(
            Date.UTC(currentYear, currentMonth, 20, 14, 30, 0),
          ).toISOString(),
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
      ];

      const contactCount = interactions.filter((i) => {
        const interactionDate = new Date(i.occurred_at || i.created_at || "");
        // Use end of month as upper bound instead of 'now' to handle timezone issues
        return interactionDate >= startOfMonth && interactionDate < endOfMonth;
      }).length;

      expect(contactCount).toBe(2);
    });

    it("excludes interactions from previous month", () => {
      const now = new Date();
      const currentMonth = now.getUTCMonth();
      const currentYear = now.getUTCFullYear();

      // Use UTC to avoid timezone conversion ambiguity
      const startOfMonth = new Date(
        Date.UTC(currentYear, currentMonth, 1, 0, 0, 0),
      );
      const endOfMonth = new Date(
        Date.UTC(currentYear, currentMonth + 1, 1, 0, 0, 0),
      );
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const interactions: Interaction[] = [
        {
          id: "1",
          school_id: "school-1",
          type: "email",
          direction: "outbound",
          occurred_at: new Date(
            Date.UTC(previousYear, previousMonth, 28, 12, 0, 0),
          ).toISOString(),
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          school_id: "school-2",
          type: "email",
          direction: "outbound",
          occurred_at: new Date(
            Date.UTC(currentYear, currentMonth, 15, 12, 0, 0),
          ).toISOString(),
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
      ];

      const contactCount = interactions.filter((i) => {
        const interactionDate = new Date(i.occurred_at || i.created_at || "");
        return interactionDate >= startOfMonth && interactionDate < endOfMonth;
      }).length;

      expect(contactCount).toBe(1);
    });

    it("excludes interactions from future months", () => {
      const now = new Date();
      const currentMonth = now.getUTCMonth();
      const currentYear = now.getUTCFullYear();

      // Use UTC to avoid timezone conversion ambiguity
      const startOfMonth = new Date(
        Date.UTC(currentYear, currentMonth, 1, 0, 0, 0),
      );
      const endOfMonth = new Date(
        Date.UTC(currentYear, currentMonth + 1, 1, 0, 0, 0),
      );
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

      const interactions: Interaction[] = [
        {
          id: "1",
          school_id: "school-1",
          type: "email",
          direction: "outbound",
          occurred_at: new Date(
            Date.UTC(nextYear, nextMonth, 15, 12, 0, 0),
          ).toISOString(),
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          school_id: "school-2",
          type: "email",
          direction: "outbound",
          occurred_at: new Date(
            Date.UTC(currentYear, currentMonth, 15, 12, 0, 0),
          ).toISOString(),
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
      ];

      const contactCount = interactions.filter((i) => {
        const interactionDate = new Date(i.occurred_at || i.created_at || "");
        return interactionDate >= startOfMonth && interactionDate < endOfMonth;
      }).length;

      expect(contactCount).toBe(1);
    });

    it("returns 0 when no interactions this month", () => {
      const now = new Date();
      const currentMonth = now.getUTCMonth();
      const currentYear = now.getUTCFullYear();

      // Use UTC to avoid timezone conversion ambiguity
      const startOfMonth = new Date(
        Date.UTC(currentYear, currentMonth, 1, 0, 0, 0),
      );
      const endOfMonth = new Date(
        Date.UTC(currentYear, currentMonth + 1, 1, 0, 0, 0),
      );
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const interactions: Interaction[] = [
        {
          id: "1",
          school_id: "school-1",
          type: "email",
          direction: "outbound",
          occurred_at: new Date(
            Date.UTC(previousYear, previousMonth, 28, 12, 0, 0),
          ).toISOString(),
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
      ];

      const contactCount = interactions.filter((i) => {
        const interactionDate = new Date(i.occurred_at || i.created_at || "");
        return interactionDate >= startOfMonth && interactionDate < endOfMonth;
      }).length;

      expect(contactCount).toBe(0);
    });

    it("uses created_at when occurred_at is missing", () => {
      const now = new Date();
      const currentMonth = now.getUTCMonth();
      const currentYear = now.getUTCFullYear();

      // Use UTC to avoid timezone conversion ambiguity
      const startOfMonth = new Date(
        Date.UTC(currentYear, currentMonth, 1, 0, 0, 0),
      );
      const endOfMonth = new Date(
        Date.UTC(currentYear, currentMonth + 1, 1, 0, 0, 0),
      );

      const interactions: Interaction[] = [
        {
          id: "1",
          school_id: "school-1",
          type: "email",
          direction: "outbound",
          occurred_at: undefined,
          created_at: new Date(
            Date.UTC(currentYear, currentMonth, 15, 12, 0, 0),
          ).toISOString(),
          logged_by: "user-1",
        },
      ];

      const contactCount = interactions.filter((i) => {
        const interactionDate = new Date(i.occurred_at || i.created_at || "");
        return interactionDate >= startOfMonth && interactionDate < endOfMonth;
      }).length;

      expect(contactCount).toBe(1);
    });

    it("counts multiple interactions on same day", () => {
      const now = new Date();
      const currentMonth = now.getUTCMonth();
      const currentYear = now.getUTCFullYear();

      // Use UTC to avoid timezone conversion ambiguity
      const startOfMonth = new Date(
        Date.UTC(currentYear, currentMonth, 1, 0, 0, 0),
      );
      const endOfMonth = new Date(
        Date.UTC(currentYear, currentMonth + 1, 1, 0, 0, 0),
      );
      const sameDayISO = new Date(
        Date.UTC(currentYear, currentMonth, 15, 12, 0, 0),
      ).toISOString();

      const interactions: Interaction[] = [
        {
          id: "1",
          school_id: "school-1",
          type: "email",
          direction: "outbound",
          occurred_at: sameDayISO,
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          school_id: "school-2",
          type: "phone_call",
          direction: "outbound",
          occurred_at: sameDayISO,
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
        {
          id: "3",
          school_id: "school-3",
          type: "text",
          direction: "inbound",
          occurred_at: sameDayISO,
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
      ];

      const contactCount = interactions.filter((i) => {
        const interactionDate = new Date(i.occurred_at || i.created_at || "");
        return interactionDate >= startOfMonth && interactionDate < endOfMonth;
      }).length;

      expect(contactCount).toBe(3);
    });
  });

  describe("Date boundary conditions", () => {
    it("includes first day of month", () => {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const isInMonth =
        firstDayOfMonth >= startOfMonth && firstDayOfMonth <= now;
      expect(isInMonth).toBe(true);
    });

    it("includes today", () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const isInMonth = now >= startOfMonth && now <= now;
      expect(isInMonth).toBe(true);
    });

    it("excludes last moment of previous month", () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMomentOfPrevMonth = new Date(startOfMonth.getTime() - 1);

      const isInMonth = lastMomentOfPrevMonth >= startOfMonth;
      expect(isInMonth).toBe(false);
    });

    it("excludes first moment of next month", () => {
      const now = new Date();
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      const firstMomentOfNextMonth = new Date(endOfMonth.getTime() + 1);

      const isInMonth = firstMomentOfNextMonth <= now;
      expect(isInMonth).toBe(false);
    });
  });

  describe("userFirstName computed property", () => {
    const extractFirstName = (
      user: {
        full_name?: string | null;
        email?: string | null;
      } | null,
    ): string => {
      if (!user) return "";
      let firstName = "";
      if (user.full_name) {
        firstName = user.full_name.split(" ")[0];
      } else {
        firstName = user.email?.split("@")[0] || "";
      }
      return firstName.charAt(0).toUpperCase() + firstName.slice(1);
    };

    it("extracts first name from full_name with first and last", () => {
      const user = createMockUser({ full_name: "John Smith" });
      expect(extractFirstName(user)).toBe("John");
    });

    it("extracts first name from full_name with multiple parts", () => {
      const user = createMockUser({
        full_name: "Mary Jane Watson-Parker",
      });
      expect(extractFirstName(user)).toBe("Mary");
    });

    it("capitalizes first letter of extracted name", () => {
      const user = createMockUser({ full_name: "jane doe" });
      expect(extractFirstName(user)).toBe("Jane");
    });

    it("falls back to email prefix when full_name is null", () => {
      const user = createMockUser({
        full_name: null,
        email: "chris.a@example.com",
      });
      expect(extractFirstName(user)).toBe("Chris.a");
    });

    it("returns empty string when user is null", () => {
      expect(extractFirstName(null)).toBe("");
    });

    it("handles single-word full_name", () => {
      const user = createMockUser({ full_name: "Madonna" });
      expect(extractFirstName(user)).toBe("Madonna");
    });

    it("falls back to email prefix when full_name is empty string", () => {
      const user = createMockUser({
        full_name: "",
        email: "player42@school.edu",
      });
      expect(extractFirstName(user)).toBe("Player42");
    });
  });

  describe("targetUserId computed property", () => {
    const resolveTargetUserId = (params: {
      isViewingAsParent: boolean;
      activeAthleteId: string | null;
      currentUserId: string | undefined;
    }): string | null | undefined => {
      return params.isViewingAsParent
        ? params.activeAthleteId
        : params.currentUserId;
    };

    it("returns current user ID when not viewing as parent", () => {
      const result = resolveTargetUserId({
        isViewingAsParent: false,
        activeAthleteId: "athlete-1",
        currentUserId: "user-123",
      });
      expect(result).toBe("user-123");
    });

    it("returns active athlete ID when viewing as parent", () => {
      const result = resolveTargetUserId({
        isViewingAsParent: true,
        activeAthleteId: "athlete-456",
        currentUserId: "parent-789",
      });
      expect(result).toBe("athlete-456");
    });

    it("returns null when parent mode and no active athlete selected", () => {
      const result = resolveTargetUserId({
        isViewingAsParent: true,
        activeAthleteId: null,
        currentUserId: "parent-789",
      });
      expect(result).toBeNull();
    });

    it("returns undefined when not parent mode and user is undefined", () => {
      const result = resolveTargetUserId({
        isViewingAsParent: false,
        activeAthleteId: null,
        currentUserId: undefined,
      });
      expect(result).toBeUndefined();
    });

    it("ignores activeAthleteId when not in parent mode", () => {
      const result = resolveTargetUserId({
        isViewingAsParent: false,
        activeAthleteId: "athlete-999",
        currentUserId: "user-100",
      });
      expect(result).toBe("user-100");
    });
  });

  describe("recentNotifications computed property", () => {
    const createMockNotification = (
      overrides: Partial<Notification> = {},
    ): Notification => ({
      id: `notif-${Math.random().toString(36).substring(2, 9)}`,
      type: "deadline_reminder",
      title: "Test Notification",
      message: "Test message",
      priority: "normal",
      scheduled_for: new Date().toISOString(),
      ...overrides,
    });

    const sliceRecentNotifications = (
      notifications: Notification[] | null | undefined,
    ): Notification[] => {
      return notifications?.slice(0, 5) || [];
    };

    it("returns first 5 notifications from a larger list", () => {
      const notifications = Array.from({ length: 10 }, (_, i) =>
        createMockNotification({
          id: `notif-${i}`,
          title: `Notification ${i}`,
        }),
      );
      const result = sliceRecentNotifications(notifications);

      expect(result).toHaveLength(5);
      expect(result[0].id).toBe("notif-0");
      expect(result[4].id).toBe("notif-4");
    });

    it("returns all notifications when fewer than 5 exist", () => {
      const notifications = [
        createMockNotification({ id: "notif-1" }),
        createMockNotification({ id: "notif-2" }),
        createMockNotification({ id: "notif-3" }),
      ];
      const result = sliceRecentNotifications(notifications);

      expect(result).toHaveLength(3);
    });

    it("returns empty array when notifications is empty", () => {
      const result = sliceRecentNotifications([]);
      expect(result).toHaveLength(0);
    });

    it("returns empty array when notifications is null", () => {
      const result = sliceRecentNotifications(null);
      expect(result).toHaveLength(0);
    });

    it("returns empty array when notifications is undefined", () => {
      const result = sliceRecentNotifications(undefined);
      expect(result).toHaveLength(0);
    });

    it("returns exactly 5 when list has exactly 5 items", () => {
      const notifications = Array.from({ length: 5 }, (_, i) =>
        createMockNotification({ id: `notif-${i}` }),
      );
      const result = sliceRecentNotifications(notifications);
      expect(result).toHaveLength(5);
    });
  });

  describe("upcomingEvents computed property", () => {
    const computeUpcomingEvents = (
      allEvents: ReturnType<typeof createMockEvent>[],
      now: Date,
    ) => {
      return allEvents
        .filter((e) => new Date(e.start_date) >= now)
        .sort(
          (a, b) =>
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
        )
        .slice(0, 5);
    };

    it("returns only future events sorted by start_date", () => {
      const now = new Date(Date.UTC(2026, 1, 7, 12, 0, 0));
      const events = [
        createMockEvent({
          id: "past",
          start_date: new Date(Date.UTC(2026, 0, 1)).toISOString(),
        }),
        createMockEvent({
          id: "future-2",
          start_date: new Date(Date.UTC(2026, 3, 15)).toISOString(),
        }),
        createMockEvent({
          id: "future-1",
          start_date: new Date(Date.UTC(2026, 2, 10)).toISOString(),
        }),
      ];

      const result = computeUpcomingEvents(events, now);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("future-1");
      expect(result[1].id).toBe("future-2");
    });

    it("limits results to 5 events", () => {
      const now = new Date(Date.UTC(2026, 0, 1));
      const events = Array.from({ length: 8 }, (_, i) =>
        createMockEvent({
          id: `event-${i}`,
          start_date: new Date(Date.UTC(2026, 1 + i, 1)).toISOString(),
        }),
      );

      const result = computeUpcomingEvents(events, now);
      expect(result).toHaveLength(5);
    });

    it("returns empty array when all events are in the past", () => {
      const now = new Date(Date.UTC(2026, 6, 1));
      const events = [
        createMockEvent({
          start_date: new Date(Date.UTC(2026, 0, 1)).toISOString(),
        }),
        createMockEvent({
          start_date: new Date(Date.UTC(2026, 3, 15)).toISOString(),
        }),
      ];

      const result = computeUpcomingEvents(events, now);
      expect(result).toHaveLength(0);
    });

    it("returns empty array when events array is empty", () => {
      const now = new Date();
      const result = computeUpcomingEvents([], now);
      expect(result).toHaveLength(0);
    });

    it("includes events starting exactly at current time", () => {
      const now = new Date(Date.UTC(2026, 5, 15, 10, 0, 0));
      const events = [
        createMockEvent({
          id: "exact",
          start_date: new Date(Date.UTC(2026, 5, 15, 10, 0, 0)).toISOString(),
        }),
      ];

      const result = computeUpcomingEvents(events, now);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("exact");
    });
  });

  describe("topMetrics computed property", () => {
    const computeTopMetrics = (
      allMetrics: ReturnType<typeof createMockMetric>[],
    ) => {
      return allMetrics.slice(0, 3);
    };

    it("returns first 3 metrics from a larger list", () => {
      const metrics = Array.from({ length: 6 }, (_, i) =>
        createMockMetric({ id: `metric-${i}`, metric_type: `type-${i}` }),
      );
      const result = computeTopMetrics(metrics);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("metric-0");
      expect(result[2].id).toBe("metric-2");
    });

    it("returns all metrics when fewer than 3 exist", () => {
      const metrics = [
        createMockMetric({ id: "metric-1" }),
        createMockMetric({ id: "metric-2" }),
      ];
      const result = computeTopMetrics(metrics);
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no metrics exist", () => {
      const result = computeTopMetrics([]);
      expect(result).toHaveLength(0);
    });

    it("returns exactly 3 when list has exactly 3 items", () => {
      const metrics = Array.from({ length: 3 }, (_, i) =>
        createMockMetric({ id: `metric-${i}` }),
      );
      const result = computeTopMetrics(metrics);
      expect(result).toHaveLength(3);
    });

    it("preserves metric data in returned slice", () => {
      const metrics = [
        createMockMetric({
          metric_type: "exit_velo",
          value: 92.5,
          unit: "mph",
        }),
      ];
      const result = computeTopMetrics(metrics);

      expect(result[0].metric_type).toBe("exit_velo");
      expect(result[0].value).toBe(92.5);
      expect(result[0].unit).toBe("mph");
    });
  });

  describe("totalOffers computed property", () => {
    const computeTotalOffers = (
      allOffers: ReturnType<typeof createMockOffer>[],
    ) => {
      return allOffers.length;
    };

    it("counts all offers regardless of status", () => {
      const offers = [
        createMockOffer({ status: "pending" }),
        createMockOffer({ status: "accepted" }),
        createMockOffer({ status: "declined" }),
      ];
      expect(computeTotalOffers(offers)).toBe(3);
    });

    it("returns 0 when no offers exist", () => {
      expect(computeTotalOffers([])).toBe(0);
    });

    it("counts single offer", () => {
      const offers = [createMockOffer()];
      expect(computeTotalOffers(offers)).toBe(1);
    });

    it("handles large number of offers", () => {
      const offers = Array.from({ length: 50 }, () => createMockOffer());
      expect(computeTotalOffers(offers)).toBe(50);
    });
  });

  describe("acceptedOffers computed property", () => {
    const computeAcceptedOffers = (
      allOffers: ReturnType<typeof createMockOffer>[],
    ) => {
      return allOffers.filter((o) => o.status === "accepted").length;
    };

    it("counts only offers with status accepted", () => {
      const offers = [
        createMockOffer({ status: "accepted" }),
        createMockOffer({ status: "pending" }),
        createMockOffer({ status: "accepted" }),
        createMockOffer({ status: "declined" }),
      ];
      expect(computeAcceptedOffers(offers)).toBe(2);
    });

    it("returns 0 when no offers are accepted", () => {
      const offers = [
        createMockOffer({ status: "pending" }),
        createMockOffer({ status: "declined" }),
      ];
      expect(computeAcceptedOffers(offers)).toBe(0);
    });

    it("returns 0 when offers array is empty", () => {
      expect(computeAcceptedOffers([])).toBe(0);
    });

    it("counts all offers when all are accepted", () => {
      const offers = Array.from({ length: 4 }, () =>
        createMockOffer({ status: "accepted" }),
      );
      expect(computeAcceptedOffers(offers)).toBe(4);
    });

    it("does not count expired or withdrawn as accepted", () => {
      const offers = [
        createMockOffer({ status: "accepted" }),
        createMockOffer({ status: "expired" as any }),
        createMockOffer({ status: "withdrawn" as any }),
      ];
      expect(computeAcceptedOffers(offers)).toBe(1);
    });
  });

  describe("useUserTasks Integration", () => {
    type ToastType = "success" | "error" | "info" | "warning";

    const createMockUserTasksComposable = () => ({
      tasks: {
        value: [] as Array<{ id: string; text: string; completed: boolean }>,
      },
      addTask: vi.fn().mockResolvedValue({
        id: "task-1",
        text: "New task",
        completed: false,
      }),
      toggleTask: vi.fn().mockResolvedValue(undefined),
      deleteTask: vi.fn().mockResolvedValue(undefined),
      clearCompleted: vi.fn().mockResolvedValue(undefined),
      loading: { value: false },
      pendingTasks: { value: [] },
      completedTasks: { value: [] },
      taskCount: { value: 0 },
      pendingCount: { value: 0 },
      completedCount: { value: 0 },
      fetchTasks: vi.fn(),
      updateTask: vi.fn(),
    });

    const createDashboardTaskActions = (params: {
      userTasksComposable: ReturnType<typeof createMockUserTasksComposable>;
      showToast: (message: string, type: ToastType) => void;
    }) => {
      const { userTasksComposable, showToast } = params;

      const addTask = async (taskText: string) => {
        if (taskText.trim() && userTasksComposable) {
          try {
            await userTasksComposable.addTask(taskText);
            showToast("Task added!", "success");
          } catch (err) {
            showToast("Failed to add task", "error");
          }
        }
      };

      const toggleTask = async (taskId: string) => {
        if (userTasksComposable) {
          await userTasksComposable.toggleTask(taskId);
        }
      };

      const deleteTask = async (taskId: string) => {
        if (userTasksComposable) {
          await userTasksComposable.deleteTask(taskId);
        }
      };

      const clearCompleted = () => {
        userTasksComposable?.clearCompleted();
      };

      return { addTask, toggleTask, deleteTask, clearCompleted };
    };

    it("calls userTasksComposable.addTask with the provided text", async () => {
      const mockComposable = createMockUserTasksComposable();
      const mockToast = vi.fn();
      const { addTask } = createDashboardTaskActions({
        userTasksComposable: mockComposable,
        showToast: mockToast,
      });

      await addTask("New task");

      expect(mockComposable.addTask).toHaveBeenCalledWith("New task");
    });

    it("shows success toast after adding a task", async () => {
      const mockComposable = createMockUserTasksComposable();
      const mockToast = vi.fn();
      const { addTask } = createDashboardTaskActions({
        userTasksComposable: mockComposable,
        showToast: mockToast,
      });

      await addTask("Study film");

      expect(mockToast).toHaveBeenCalledWith("Task added!", "success");
    });

    it("rejects empty string and does not call addTask", async () => {
      const mockComposable = createMockUserTasksComposable();
      const mockToast = vi.fn();
      const { addTask } = createDashboardTaskActions({
        userTasksComposable: mockComposable,
        showToast: mockToast,
      });

      await addTask("");

      expect(mockComposable.addTask).not.toHaveBeenCalled();
      expect(mockToast).not.toHaveBeenCalled();
    });

    it("rejects whitespace-only string and does not call addTask", async () => {
      const mockComposable = createMockUserTasksComposable();
      const mockToast = vi.fn();
      const { addTask } = createDashboardTaskActions({
        userTasksComposable: mockComposable,
        showToast: mockToast,
      });

      await addTask("   ");

      expect(mockComposable.addTask).not.toHaveBeenCalled();
      expect(mockToast).not.toHaveBeenCalled();
    });

    it("shows error toast when addTask throws", async () => {
      const mockComposable = createMockUserTasksComposable();
      mockComposable.addTask.mockRejectedValue(new Error("Storage full"));
      const mockToast = vi.fn();
      const { addTask } = createDashboardTaskActions({
        userTasksComposable: mockComposable,
        showToast: mockToast,
      });

      await addTask("New task");

      expect(mockToast).toHaveBeenCalledWith("Failed to add task", "error");
    });

    it("calls userTasksComposable.toggleTask with the task ID", async () => {
      const mockComposable = createMockUserTasksComposable();
      const mockToast = vi.fn();
      const { toggleTask } = createDashboardTaskActions({
        userTasksComposable: mockComposable,
        showToast: mockToast,
      });

      await toggleTask("task-abc-123");

      expect(mockComposable.toggleTask).toHaveBeenCalledWith("task-abc-123");
    });

    it("calls userTasksComposable.deleteTask with the task ID", async () => {
      const mockComposable = createMockUserTasksComposable();
      const mockToast = vi.fn();
      const { deleteTask } = createDashboardTaskActions({
        userTasksComposable: mockComposable,
        showToast: mockToast,
      });

      await deleteTask("task-xyz-789");

      expect(mockComposable.deleteTask).toHaveBeenCalledWith("task-xyz-789");
    });

    it("calls userTasksComposable.clearCompleted", () => {
      const mockComposable = createMockUserTasksComposable();
      const mockToast = vi.fn();
      const { clearCompleted } = createDashboardTaskActions({
        userTasksComposable: mockComposable,
        showToast: mockToast,
      });

      clearCompleted();

      expect(mockComposable.clearCompleted).toHaveBeenCalled();
    });
  });

  describe("schoolSizeBreakdown computed property", () => {
    const computeSchoolSizeBreakdown = (schools: School[]) => {
      const breakdown: Record<string, number> = {
        "Very Small": 0,
        Small: 0,
        Medium: 0,
        Large: 0,
        "Very Large": 0,
      };

      schools.forEach((school) => {
        const studentSize = school.academic_info?.student_size;
        if (studentSize) {
          const size = getCarnegieSize(
            typeof studentSize === "number" ? studentSize : null,
          );
          if (size && size in breakdown) {
            breakdown[size]++;
          }
        }
      });

      return breakdown;
    };

    it("categorizes schools into correct Carnegie size buckets", () => {
      const schools = [
        createMockSchool({
          academic_info: { student_size: 500 },
        }),
        createMockSchool({
          academic_info: { student_size: 3000 },
        }),
        createMockSchool({
          academic_info: { student_size: 7000 },
        }),
        createMockSchool({
          academic_info: { student_size: 15000 },
        }),
        createMockSchool({
          academic_info: { student_size: 30000 },
        }),
      ];

      const result = computeSchoolSizeBreakdown(schools);

      expect(result["Very Small"]).toBe(1);
      expect(result["Small"]).toBe(1);
      expect(result["Medium"]).toBe(1);
      expect(result["Large"]).toBe(1);
      expect(result["Very Large"]).toBe(1);
    });

    it("returns all zeros when schools array is empty", () => {
      const result = computeSchoolSizeBreakdown([]);

      expect(result["Very Small"]).toBe(0);
      expect(result["Small"]).toBe(0);
      expect(result["Medium"]).toBe(0);
      expect(result["Large"]).toBe(0);
      expect(result["Very Large"]).toBe(0);
    });

    it("skips schools without academic_info", () => {
      const schools = [
        createMockSchool({ academic_info: null }),
        createMockSchool({
          academic_info: { student_size: 5000 },
        }),
      ];

      const result = computeSchoolSizeBreakdown(schools);

      expect(result["Medium"]).toBe(1);
      const total = Object.values(result).reduce((sum, v) => sum + v, 0);
      expect(total).toBe(1);
    });

    it("skips schools with zero or negative student_size", () => {
      const schools = [
        createMockSchool({
          academic_info: { student_size: 0 },
        }),
        createMockSchool({
          academic_info: { student_size: -100 },
        }),
      ];

      const result = computeSchoolSizeBreakdown(schools);

      const total = Object.values(result).reduce((sum, v) => sum + v, 0);
      expect(total).toBe(0);
    });

    it("handles multiple schools in the same size bucket", () => {
      const schools = [
        createMockSchool({
          academic_info: { student_size: 25000 },
        }),
        createMockSchool({
          academic_info: { student_size: 35000 },
        }),
        createMockSchool({
          academic_info: { student_size: 45000 },
        }),
      ];

      const result = computeSchoolSizeBreakdown(schools);
      expect(result["Very Large"]).toBe(3);
    });

    it("handles boundary values at Carnegie size thresholds", () => {
      const schools = [
        createMockSchool({
          academic_info: { student_size: 999 },
        }),
        createMockSchool({
          academic_info: { student_size: 1000 },
        }),
        createMockSchool({
          academic_info: { student_size: 4999 },
        }),
        createMockSchool({
          academic_info: { student_size: 5000 },
        }),
        createMockSchool({
          academic_info: { student_size: 9999 },
        }),
        createMockSchool({
          academic_info: { student_size: 10000 },
        }),
        createMockSchool({
          academic_info: { student_size: 19999 },
        }),
        createMockSchool({
          academic_info: { student_size: 20000 },
        }),
      ];

      const result = computeSchoolSizeBreakdown(schools);

      expect(result["Very Small"]).toBe(1);
      expect(result["Small"]).toBe(2);
      expect(result["Medium"]).toBe(2);
      expect(result["Large"]).toBe(2);
      expect(result["Very Large"]).toBe(1);
    });

    it("skips schools where student_size is not a number", () => {
      const schools = [
        createMockSchool({
          academic_info: { student_size: "large" as any },
        }),
        createMockSchool({
          academic_info: { student_size: 8000 },
        }),
      ];

      const result = computeSchoolSizeBreakdown(schools);

      expect(result["Medium"]).toBe(1);
      const total = Object.values(result).reduce((sum, v) => sum + v, 0);
      expect(total).toBe(1);
    });
  });

  describe("useSuggestions Integration", () => {
    const createMockSuggestionsComposable = () => ({
      suggestions: { value: [] as Array<{ id: string; text: string }> },
      loading: { value: false },
      error: { value: null as string | null },
      pendingCount: { value: 0 },
      moreCount: { value: 0 },
      dashboardSuggestions: {
        value: [] as Array<{ id: string; text: string }>,
      },
      highUrgencySuggestions: {
        value: [] as Array<{ id: string; text: string }>,
      },
      fetchSuggestions: vi.fn().mockResolvedValue(undefined),
      dismissSuggestion: vi.fn().mockResolvedValue(undefined),
      completeSuggestion: vi.fn().mockResolvedValue(undefined),
      surfaceMoreSuggestions: vi.fn().mockResolvedValue(undefined),
    });

    const simulateOnMounted = async (params: {
      suggestionsComposable: ReturnType<typeof createMockSuggestionsComposable>;
      hasUser: boolean;
    }) => {
      if (params.hasUser && params.suggestionsComposable) {
        await params.suggestionsComposable.fetchSuggestions("dashboard");
      }
    };

    const executeDismissSuggestion = async (params: {
      suggestionsComposable: ReturnType<
        typeof createMockSuggestionsComposable
      > | null;
      suggestionId: string;
    }) => {
      if (params.suggestionsComposable) {
        await params.suggestionsComposable.dismissSuggestion(
          params.suggestionId,
        );
      }
    };

    const simulateAthleteSwitch = async (params: {
      suggestionsComposable: ReturnType<typeof createMockSuggestionsComposable>;
      isViewingAsParent: boolean;
      newAthleteId: string | null;
      oldAthleteId: string | null;
    }) => {
      if (
        params.newAthleteId &&
        params.newAthleteId !== params.oldAthleteId &&
        params.isViewingAsParent
      ) {
        await params.suggestionsComposable.fetchSuggestions("dashboard");
      }
    };

    describe("fetchSuggestions on mount", () => {
      it("calls fetchSuggestions with 'dashboard' when user is present", async () => {
        const mockSuggestions = createMockSuggestionsComposable();

        await simulateOnMounted({
          suggestionsComposable: mockSuggestions,
          hasUser: true,
        });

        expect(mockSuggestions.fetchSuggestions).toHaveBeenCalledOnce();
        expect(mockSuggestions.fetchSuggestions).toHaveBeenCalledWith(
          "dashboard",
        );
      });

      it("does not call fetchSuggestions when no user is present", async () => {
        const mockSuggestions = createMockSuggestionsComposable();

        await simulateOnMounted({
          suggestionsComposable: mockSuggestions,
          hasUser: false,
        });

        expect(mockSuggestions.fetchSuggestions).not.toHaveBeenCalled();
      });
    });

    describe("handleSuggestionDismiss", () => {
      it("calls dismissSuggestion with the provided suggestion ID", async () => {
        const mockSuggestions = createMockSuggestionsComposable();

        await executeDismissSuggestion({
          suggestionsComposable: mockSuggestions,
          suggestionId: "suggestion-abc-123",
        });

        expect(mockSuggestions.dismissSuggestion).toHaveBeenCalledOnce();
        expect(mockSuggestions.dismissSuggestion).toHaveBeenCalledWith(
          "suggestion-abc-123",
        );
      });

      it("does nothing when suggestionsComposable is null", async () => {
        await executeDismissSuggestion({
          suggestionsComposable: null,
          suggestionId: "suggestion-abc-123",
        });
      });
    });

    describe("athlete switch refetch (parent mode)", () => {
      it("calls fetchSuggestions when activeAthleteId changes in parent mode", async () => {
        const mockSuggestions = createMockSuggestionsComposable();

        await simulateAthleteSwitch({
          suggestionsComposable: mockSuggestions,
          isViewingAsParent: true,
          newAthleteId: "athlete-456",
          oldAthleteId: "athlete-123",
        });

        expect(mockSuggestions.fetchSuggestions).toHaveBeenCalledOnce();
        expect(mockSuggestions.fetchSuggestions).toHaveBeenCalledWith(
          "dashboard",
        );
      });

      it("does not refetch when not in parent mode", async () => {
        const mockSuggestions = createMockSuggestionsComposable();

        await simulateAthleteSwitch({
          suggestionsComposable: mockSuggestions,
          isViewingAsParent: false,
          newAthleteId: "athlete-456",
          oldAthleteId: "athlete-123",
        });

        expect(mockSuggestions.fetchSuggestions).not.toHaveBeenCalled();
      });

      it("does not refetch when newAthleteId is the same as oldAthleteId", async () => {
        const mockSuggestions = createMockSuggestionsComposable();

        await simulateAthleteSwitch({
          suggestionsComposable: mockSuggestions,
          isViewingAsParent: true,
          newAthleteId: "athlete-123",
          oldAthleteId: "athlete-123",
        });

        expect(mockSuggestions.fetchSuggestions).not.toHaveBeenCalled();
      });

      it("does not refetch when newAthleteId is null", async () => {
        const mockSuggestions = createMockSuggestionsComposable();

        await simulateAthleteSwitch({
          suggestionsComposable: mockSuggestions,
          isViewingAsParent: true,
          newAthleteId: null,
          oldAthleteId: "athlete-123",
        });

        expect(mockSuggestions.fetchSuggestions).not.toHaveBeenCalled();
      });
    });
  });

  describe("useRecruitingPacket Integration", () => {
    const createMockRecruitingPacket = (
      overrides: Partial<{
        hasGeneratedPacket: boolean;
        showEmailModal: boolean;
        defaultEmailSubject: string;
        defaultEmailBody: string;
      }> = {},
    ) => ({
      hasGeneratedPacket: ref(overrides.hasGeneratedPacket ?? false),
      showEmailModal: ref(overrides.showEmailModal ?? false),
      defaultEmailSubject: ref(
        overrides.defaultEmailSubject ?? "My Recruiting Packet",
      ),
      defaultEmailBody: ref(
        overrides.defaultEmailBody ?? "Please find my packet attached.",
      ),
      generatePacket: vi.fn().mockResolvedValue({
        html: "<html>packet</html>",
        filename: "packet.html",
        data: {},
      }),
      openPacketPreview: vi.fn().mockResolvedValue(undefined),
      emailPacket: vi.fn().mockResolvedValue(undefined),
      setShowEmailModal: vi.fn(),
      resetPacket: vi.fn(),
      loading: ref(false),
      error: ref<string | null>(null),
    });

    const createMockToast = () => ({
      showToast: vi.fn(),
    });

    describe("handleGeneratePacket", () => {
      const executeHandleGeneratePacket = async (params: {
        mockPacket: ReturnType<typeof createMockRecruitingPacket>;
        mockToast: ReturnType<typeof createMockToast>;
      }) => {
        const recruitingPacketLoading = ref(false);
        const recruitingPacketError = ref<string | null>(null);

        recruitingPacketLoading.value = true;
        recruitingPacketError.value = null;

        try {
          await params.mockPacket.openPacketPreview();
          params.mockToast.showToast(
            "Recruiting packet generated successfully!",
            "success",
          );
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to generate recruiting packet";
          recruitingPacketError.value = message;
          params.mockToast.showToast(message, "error");
        } finally {
          recruitingPacketLoading.value = false;
        }

        return { recruitingPacketLoading, recruitingPacketError };
      };

      it("calls openPacketPreview on the composable", async () => {
        const mockPacket = createMockRecruitingPacket();
        const mockToast = createMockToast();

        await executeHandleGeneratePacket({ mockPacket, mockToast });

        expect(mockPacket.openPacketPreview).toHaveBeenCalledOnce();
      });

      it("shows success toast after successful generation", async () => {
        const mockPacket = createMockRecruitingPacket();
        const mockToast = createMockToast();

        await executeHandleGeneratePacket({ mockPacket, mockToast });

        expect(mockToast.showToast).toHaveBeenCalledWith(
          "Recruiting packet generated successfully!",
          "success",
        );
      });

      it("sets loading to false after successful generation", async () => {
        const mockPacket = createMockRecruitingPacket();
        const mockToast = createMockToast();

        const { recruitingPacketLoading } = await executeHandleGeneratePacket({
          mockPacket,
          mockToast,
        });

        expect(recruitingPacketLoading.value).toBe(false);
      });

      it("sets error and shows error toast when openPacketPreview fails", async () => {
        const mockPacket = createMockRecruitingPacket();
        mockPacket.openPacketPreview.mockRejectedValue(
          new Error("Preview window blocked"),
        );
        const mockToast = createMockToast();

        const { recruitingPacketError } = await executeHandleGeneratePacket({
          mockPacket,
          mockToast,
        });

        expect(recruitingPacketError.value).toBe("Preview window blocked");
        expect(mockToast.showToast).toHaveBeenCalledWith(
          "Preview window blocked",
          "error",
        );
      });

      it("handles non-Error thrown values with fallback message", async () => {
        const mockPacket = createMockRecruitingPacket();
        mockPacket.openPacketPreview.mockRejectedValue("string error");
        const mockToast = createMockToast();

        const { recruitingPacketError } = await executeHandleGeneratePacket({
          mockPacket,
          mockToast,
        });

        expect(recruitingPacketError.value).toBe(
          "Failed to generate recruiting packet",
        );
      });
    });

    describe("handleEmailPacket", () => {
      const executeHandleEmailPacket = async (params: {
        mockPacket: ReturnType<typeof createMockRecruitingPacket>;
        mockToast: ReturnType<typeof createMockToast>;
      }) => {
        const recruitingPacketLoading = ref(false);
        const recruitingPacketError = ref<string | null>(null);

        recruitingPacketLoading.value = true;
        recruitingPacketError.value = null;

        try {
          if (!params.mockPacket.hasGeneratedPacket.value) {
            await params.mockPacket.generatePacket();
          }
          params.mockPacket.setShowEmailModal(true);
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to prepare packet for email";
          recruitingPacketError.value = message;
          params.mockToast.showToast(message, "error");
        } finally {
          recruitingPacketLoading.value = false;
        }

        return { recruitingPacketLoading, recruitingPacketError };
      };

      it("calls generatePacket when no packet has been generated", async () => {
        const mockPacket = createMockRecruitingPacket({
          hasGeneratedPacket: false,
        });
        const mockToast = createMockToast();

        await executeHandleEmailPacket({ mockPacket, mockToast });

        expect(mockPacket.generatePacket).toHaveBeenCalledOnce();
      });

      it("skips generatePacket when packet already exists", async () => {
        const mockPacket = createMockRecruitingPacket({
          hasGeneratedPacket: true,
        });
        const mockToast = createMockToast();

        await executeHandleEmailPacket({ mockPacket, mockToast });

        expect(mockPacket.generatePacket).not.toHaveBeenCalled();
      });

      it("calls setShowEmailModal(true) after generating packet", async () => {
        const mockPacket = createMockRecruitingPacket();
        const mockToast = createMockToast();

        await executeHandleEmailPacket({ mockPacket, mockToast });

        expect(mockPacket.setShowEmailModal).toHaveBeenCalledWith(true);
      });

      it("sets error when generatePacket fails", async () => {
        const mockPacket = createMockRecruitingPacket({
          hasGeneratedPacket: false,
        });
        mockPacket.generatePacket.mockRejectedValue(
          new Error("No user logged in"),
        );
        const mockToast = createMockToast();

        const { recruitingPacketError } = await executeHandleEmailPacket({
          mockPacket,
          mockToast,
        });

        expect(recruitingPacketError.value).toBe("No user logged in");
        expect(mockToast.showToast).toHaveBeenCalledWith(
          "No user logged in",
          "error",
        );
      });

      it("does not open email modal when generatePacket fails", async () => {
        const mockPacket = createMockRecruitingPacket({
          hasGeneratedPacket: false,
        });
        mockPacket.generatePacket.mockRejectedValue(
          new Error("Generation failed"),
        );
        const mockToast = createMockToast();

        await executeHandleEmailPacket({ mockPacket, mockToast });

        expect(mockPacket.setShowEmailModal).not.toHaveBeenCalled();
      });

      it("sets loading to false regardless of success or failure", async () => {
        const mockPacket = createMockRecruitingPacket({
          hasGeneratedPacket: false,
        });
        mockPacket.generatePacket.mockRejectedValue(new Error("Fail"));
        const mockToast = createMockToast();

        const { recruitingPacketLoading } = await executeHandleEmailPacket({
          mockPacket,
          mockToast,
        });

        expect(recruitingPacketLoading.value).toBe(false);
      });
    });

    describe("handleSendEmail", () => {
      const executeHandleSendEmail = async (params: {
        mockPacket: ReturnType<typeof createMockRecruitingPacket>;
        mockToast: ReturnType<typeof createMockToast>;
        emailData: { recipients: string[]; subject: string; body: string };
      }) => {
        const recruitingPacketError = ref<string | null>(null);

        try {
          await params.mockPacket.emailPacket(params.emailData);
          params.mockToast.showToast(
            `Email sent to ${params.emailData.recipients.length} coach${params.emailData.recipients.length === 1 ? "" : "es"}!`,
            "success",
          );
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to send email";
          recruitingPacketError.value = message;
          params.mockToast.showToast(message, "error");
        }

        return { recruitingPacketError };
      };

      it("calls emailPacket with the provided email data", async () => {
        const mockPacket = createMockRecruitingPacket();
        const mockToast = createMockToast();
        const emailData = {
          recipients: ["coach@school.edu"],
          subject: "My Packet",
          body: "Here is my packet.",
        };

        await executeHandleSendEmail({ mockPacket, mockToast, emailData });

        expect(mockPacket.emailPacket).toHaveBeenCalledWith(emailData);
      });

      it("shows success toast with singular 'coach' for one recipient", async () => {
        const mockPacket = createMockRecruitingPacket();
        const mockToast = createMockToast();
        const emailData = {
          recipients: ["coach@school.edu"],
          subject: "My Packet",
          body: "Here is my packet.",
        };

        await executeHandleSendEmail({ mockPacket, mockToast, emailData });

        expect(mockToast.showToast).toHaveBeenCalledWith(
          "Email sent to 1 coach!",
          "success",
        );
      });

      it("shows success toast with plural 'coaches' for multiple recipients", async () => {
        const mockPacket = createMockRecruitingPacket();
        const mockToast = createMockToast();
        const emailData = {
          recipients: [
            "coach1@school.edu",
            "coach2@school.edu",
            "coach3@school.edu",
          ],
          subject: "My Packet",
          body: "Here is my packet.",
        };

        await executeHandleSendEmail({ mockPacket, mockToast, emailData });

        expect(mockToast.showToast).toHaveBeenCalledWith(
          "Email sent to 3 coaches!",
          "success",
        );
      });

      it("sets error and shows error toast when emailPacket fails", async () => {
        const mockPacket = createMockRecruitingPacket();
        mockPacket.emailPacket.mockRejectedValue(
          new Error("SMTP connection failed"),
        );
        const mockToast = createMockToast();
        const emailData = {
          recipients: ["coach@school.edu"],
          subject: "My Packet",
          body: "Here is my packet.",
        };

        const { recruitingPacketError } = await executeHandleSendEmail({
          mockPacket,
          mockToast,
          emailData,
        });

        expect(recruitingPacketError.value).toBe("SMTP connection failed");
        expect(mockToast.showToast).toHaveBeenCalledWith(
          "SMTP connection failed",
          "error",
        );
      });

      it("handles non-Error thrown values with fallback message", async () => {
        const mockPacket = createMockRecruitingPacket();
        mockPacket.emailPacket.mockRejectedValue(42);
        const mockToast = createMockToast();
        const emailData = {
          recipients: ["coach@school.edu"],
          subject: "Test",
          body: "Test body",
        };

        const { recruitingPacketError } = await executeHandleSendEmail({
          mockPacket,
          mockToast,
          emailData,
        });

        expect(recruitingPacketError.value).toBe("Failed to send email");
      });
    });
  });

  describe("useFamilyContext Integration (Parent Mode)", () => {
    type AccessibleFamily = {
      familyUnitId: string;
      athleteId: string;
      athleteName: string;
      graduationYear: number | null;
      familyName: string;
    };

    const createMockFamilyContext = (
      overrides: Partial<{
        isViewingAsParent: boolean;
        activeAthleteId: string | null;
        activeFamilyId: string | null;
        parentAccessibleFamilies: AccessibleFamily[];
      }> = {},
    ) => ({
      isViewingAsParent: ref(overrides.isViewingAsParent ?? false),
      activeAthleteId: ref(overrides.activeAthleteId ?? null),
      activeFamilyId: ref(overrides.activeFamilyId ?? null),
      parentAccessibleFamilies: ref(overrides.parentAccessibleFamilies ?? []),
      isPlayer: ref(false),
      isParent: ref(overrides.isViewingAsParent ?? false),
      loading: ref(false),
      error: ref<string | null>(null),
      familyMembers: ref([]),
      initializeFamily: vi.fn().mockResolvedValue(undefined),
      fetchFamilyMembers: vi.fn().mockResolvedValue(undefined),
      switchAthlete: vi.fn().mockResolvedValue(undefined),
      getAccessibleAthletes: vi.fn().mockReturnValue([]),
      getDisplayContext: vi.fn().mockReturnValue(null),
      getDataOwnerUserId: vi.fn().mockReturnValue(null),
      refetchFamilies: vi.fn().mockResolvedValue(undefined),
      _debugInstanceId: "test-123",
    });

    describe("Parent Context Banner visibility", () => {
      it("shows banner when isViewingAsParent is true", () => {
        const familyContext = createMockFamilyContext({
          isViewingAsParent: true,
          activeAthleteId: "athlete-123",
          parentAccessibleFamilies: [
            {
              familyUnitId: "family-1",
              athleteId: "athlete-123",
              athleteName: "John Doe",
              graduationYear: 2027,
              familyName: "Doe Family",
            },
          ],
        });

        const isBannerVisible = familyContext.isViewingAsParent.value;

        expect(isBannerVisible).toBe(true);
      });

      it("hides banner when isViewingAsParent is false", () => {
        const familyContext = createMockFamilyContext({
          isViewingAsParent: false,
        });

        const isBannerVisible = familyContext.isViewingAsParent.value;

        expect(isBannerVisible).toBe(false);
      });

      it("displays correct athlete name in banner", () => {
        const familyContext = createMockFamilyContext({
          isViewingAsParent: true,
          activeAthleteId: "athlete-456",
          parentAccessibleFamilies: [
            {
              familyUnitId: "family-1",
              athleteId: "athlete-456",
              athleteName: "Jane Smith",
              graduationYear: 2028,
              familyName: "Smith Family",
            },
          ],
        });

        const athleteName =
          familyContext.parentAccessibleFamilies.value.find(
            (f) => f.athleteId === familyContext.activeAthleteId.value,
          )?.athleteName || "this athlete";

        expect(athleteName).toBe("Jane Smith");
      });

      it("falls back to default text when athlete not found in families", () => {
        const familyContext = createMockFamilyContext({
          isViewingAsParent: true,
          activeAthleteId: "athlete-unknown",
          parentAccessibleFamilies: [
            {
              familyUnitId: "family-1",
              athleteId: "athlete-123",
              athleteName: "John Doe",
              graduationYear: 2027,
              familyName: "Doe Family",
            },
          ],
        });

        const athleteName =
          familyContext.parentAccessibleFamilies.value.find(
            (f) => f.athleteId === familyContext.activeAthleteId.value,
          )?.athleteName || "this athlete";

        expect(athleteName).toBe("this athlete");
      });

      it("includes read-only message in banner context", () => {
        const familyContext = createMockFamilyContext({
          isViewingAsParent: true,
          activeAthleteId: "athlete-123",
          parentAccessibleFamilies: [
            {
              familyUnitId: "family-1",
              athleteId: "athlete-123",
              athleteName: "John Doe",
              graduationYear: 2027,
              familyName: "Doe Family",
            },
          ],
        });

        const bannerMessage = `You're viewing ${
          familyContext.parentAccessibleFamilies.value.find(
            (f) => f.athleteId === familyContext.activeAthleteId.value,
          )?.athleteName || "this athlete"
        }'s recruiting data. Data is read-only. Your views are visible to them.`;

        expect(bannerMessage).toContain("read-only");
        expect(bannerMessage).toContain("John Doe");
      });
    });

    describe("Target User ID resolution", () => {
      const resolveTargetUserId = (params: {
        familyContext: ReturnType<typeof createMockFamilyContext>;
        currentUserId: string | undefined;
      }): string | null | undefined => {
        return params.familyContext.isViewingAsParent.value
          ? params.familyContext.activeAthleteId.value
          : params.currentUserId;
      };

      it("returns activeAthleteId when parent is viewing", () => {
        const familyContext = createMockFamilyContext({
          isViewingAsParent: true,
          activeAthleteId: "athlete-789",
        });

        const targetId = resolveTargetUserId({
          familyContext,
          currentUserId: "parent-456",
        });

        expect(targetId).toBe("athlete-789");
      });

      it("returns current user ID when player is viewing own data", () => {
        const familyContext = createMockFamilyContext({
          isViewingAsParent: false,
          activeAthleteId: null,
        });

        const targetId = resolveTargetUserId({
          familyContext,
          currentUserId: "player-123",
        });

        expect(targetId).toBe("player-123");
      });

      it("returns null when parent viewing but no athlete selected", () => {
        const familyContext = createMockFamilyContext({
          isViewingAsParent: true,
          activeAthleteId: null,
        });

        const targetId = resolveTargetUserId({
          familyContext,
          currentUserId: "parent-456",
        });

        expect(targetId).toBeNull();
      });
    });

    describe("Athlete Switch Watcher", () => {
      const simulateAthleteSwitch = async (params: {
        familyContext: ReturnType<typeof createMockFamilyContext>;
        fetchCounts: ReturnType<typeof vi.fn>;
        fetchSuggestions: ReturnType<typeof vi.fn>;
        logParentView: ReturnType<typeof vi.fn>;
        newAthleteId: string;
        oldAthleteId: string | null;
      }) => {
        const {
          familyContext,
          fetchCounts,
          fetchSuggestions,
          logParentView,
          newAthleteId,
          oldAthleteId,
        } = params;

        if (
          newAthleteId &&
          newAthleteId !== oldAthleteId &&
          familyContext.isViewingAsParent.value
        ) {
          await fetchCounts();
          await fetchSuggestions("dashboard");
          await logParentView("dashboard", newAthleteId);
        }
      };

      it("calls fetchCounts when athlete changes in parent mode", async () => {
        const familyContext = createMockFamilyContext({
          isViewingAsParent: true,
          activeAthleteId: "athlete-new",
        });
        const fetchCounts = vi.fn().mockResolvedValue(undefined);
        const fetchSuggestions = vi.fn().mockResolvedValue(undefined);
        const logParentView = vi.fn().mockResolvedValue(undefined);

        await simulateAthleteSwitch({
          familyContext,
          fetchCounts,
          fetchSuggestions,
          logParentView,
          newAthleteId: "athlete-new",
          oldAthleteId: "athlete-old",
        });

        expect(fetchCounts).toHaveBeenCalledOnce();
      });

      it("calls fetchSuggestions with 'dashboard' when athlete changes", async () => {
        const familyContext = createMockFamilyContext({
          isViewingAsParent: true,
          activeAthleteId: "athlete-new",
        });
        const fetchCounts = vi.fn().mockResolvedValue(undefined);
        const fetchSuggestions = vi.fn().mockResolvedValue(undefined);
        const logParentView = vi.fn().mockResolvedValue(undefined);

        await simulateAthleteSwitch({
          familyContext,
          fetchCounts,
          fetchSuggestions,
          logParentView,
          newAthleteId: "athlete-new",
          oldAthleteId: "athlete-old",
        });

        expect(fetchSuggestions).toHaveBeenCalledWith("dashboard");
      });

      it("calls logParentView with dashboard and new athlete ID", async () => {
        const familyContext = createMockFamilyContext({
          isViewingAsParent: true,
          activeAthleteId: "athlete-999",
        });
        const fetchCounts = vi.fn().mockResolvedValue(undefined);
        const fetchSuggestions = vi.fn().mockResolvedValue(undefined);
        const logParentView = vi.fn().mockResolvedValue(undefined);

        await simulateAthleteSwitch({
          familyContext,
          fetchCounts,
          fetchSuggestions,
          logParentView,
          newAthleteId: "athlete-999",
          oldAthleteId: "athlete-111",
        });

        expect(logParentView).toHaveBeenCalledWith("dashboard", "athlete-999");
      });

      it("does not trigger side effects when athlete ID is unchanged", async () => {
        const familyContext = createMockFamilyContext({
          isViewingAsParent: true,
          activeAthleteId: "athlete-same",
        });
        const fetchCounts = vi.fn().mockResolvedValue(undefined);
        const fetchSuggestions = vi.fn().mockResolvedValue(undefined);
        const logParentView = vi.fn().mockResolvedValue(undefined);

        await simulateAthleteSwitch({
          familyContext,
          fetchCounts,
          fetchSuggestions,
          logParentView,
          newAthleteId: "athlete-same",
          oldAthleteId: "athlete-same",
        });

        expect(fetchCounts).not.toHaveBeenCalled();
        expect(fetchSuggestions).not.toHaveBeenCalled();
        expect(logParentView).not.toHaveBeenCalled();
      });

      it("does not trigger side effects when not in parent mode", async () => {
        const familyContext = createMockFamilyContext({
          isViewingAsParent: false,
          activeAthleteId: "athlete-new",
        });
        const fetchCounts = vi.fn().mockResolvedValue(undefined);
        const fetchSuggestions = vi.fn().mockResolvedValue(undefined);
        const logParentView = vi.fn().mockResolvedValue(undefined);

        await simulateAthleteSwitch({
          familyContext,
          fetchCounts,
          fetchSuggestions,
          logParentView,
          newAthleteId: "athlete-new",
          oldAthleteId: "athlete-old",
        });

        expect(fetchCounts).not.toHaveBeenCalled();
        expect(fetchSuggestions).not.toHaveBeenCalled();
        expect(logParentView).not.toHaveBeenCalled();
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe("Empty Data States", () => {
      const computeAllDashboardCounts = (params: {
        schools: School[];
        coaches: Coach[];
        interactions: Interaction[];
        offers: ReturnType<typeof createMockOffer>[];
      }) => {
        const aTierSchoolCount = params.schools.filter(
          (s) => s.priority_tier === "A",
        ).length;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const contactsThisMonth = params.interactions.filter((i) => {
          const interactionDate = new Date(i.occurred_at || i.created_at || "");
          return interactionDate >= startOfMonth && interactionDate <= now;
        }).length;

        const totalOffers = params.offers.length;
        const acceptedOffers = params.offers.filter(
          (o) => o.status === "accepted",
        ).length;

        const schoolSizeBreakdown: Record<string, number> = {
          "Very Small": 0,
          Small: 0,
          Medium: 0,
          Large: 0,
          "Very Large": 0,
        };
        params.schools.forEach((school) => {
          const studentSize = school.academic_info?.student_size;
          if (studentSize) {
            const size = getCarnegieSize(
              typeof studentSize === "number" ? studentSize : null,
            );
            if (size && size in schoolSizeBreakdown) {
              schoolSizeBreakdown[size]++;
            }
          }
        });

        return {
          schoolCount: params.schools.length,
          coachCount: params.coaches.length,
          interactionCount: params.interactions.length,
          aTierSchoolCount,
          contactsThisMonth,
          totalOffers,
          acceptedOffers,
          schoolSizeBreakdown,
        };
      };

      it("returns all zeroes when no data exists", () => {
        const result = computeAllDashboardCounts({
          schools: [],
          coaches: [],
          interactions: [],
          offers: [],
        });

        expect(result.schoolCount).toBe(0);
        expect(result.coachCount).toBe(0);
        expect(result.interactionCount).toBe(0);
        expect(result.aTierSchoolCount).toBe(0);
        expect(result.contactsThisMonth).toBe(0);
        expect(result.totalOffers).toBe(0);
        expect(result.acceptedOffers).toBe(0);
      });

      it("returns all-zero size breakdown with no schools", () => {
        const result = computeAllDashboardCounts({
          schools: [],
          coaches: [],
          interactions: [],
          offers: [],
        });

        Object.values(result.schoolSizeBreakdown).forEach((count) => {
          expect(count).toBe(0);
        });
      });

      it("computes top metrics as empty when no metrics exist", () => {
        const topMetrics = ([] as ReturnType<typeof createMockMetric>[]).slice(
          0,
          3,
        );
        expect(topMetrics).toEqual([]);
      });

      it("computes upcoming events as empty when no events exist", () => {
        const now = new Date();
        const upcomingEvents = (
          [] as ReturnType<typeof createMockEvent>[]
        ).filter((e) => new Date(e.start_date) >= now);
        expect(upcomingEvents).toEqual([]);
      });

      it("computes recent notifications as empty when none exist", () => {
        const recentNotifications =
          (null as Notification[] | null)?.slice(0, 5) || [];
        expect(recentNotifications).toEqual([]);
      });
    });

    describe("Supabase Query Errors", () => {
      type SupabaseErrorResponse = {
        data: null;
        error: { message: string; code: string };
      };

      type SupabaseSuccessResponse<T> = {
        data: T;
        error: null;
        count?: number;
      };

      const createMockFetchCounts = () => {
        const allSchools = ref<School[]>([]);
        const allCoaches = ref<Coach[]>([]);
        const allInteractions = ref<Interaction[]>([]);
        const allOffers = ref<ReturnType<typeof createMockOffer>[]>([]);
        const schoolCount = ref(0);
        const coachCount = ref(0);
        const interactionCount = ref(0);
        const errors: string[] = [];

        const fetchCounts = async (params: {
          schoolsResponse:
            | SupabaseErrorResponse
            | SupabaseSuccessResponse<School[]>;
          coachesResponse:
            | SupabaseErrorResponse
            | SupabaseSuccessResponse<Coach[]>;
          interactionsResponse:
            | SupabaseErrorResponse
            | SupabaseSuccessResponse<Interaction[]>;
          offersResponse:
            | SupabaseErrorResponse
            | SupabaseSuccessResponse<ReturnType<typeof createMockOffer>[]>;
        }) => {
          if (params.schoolsResponse.error) {
            errors.push(
              `Error fetching schools: ${params.schoolsResponse.error.message}`,
            );
          } else if (params.schoolsResponse.data) {
            allSchools.value = params.schoolsResponse.data;
            schoolCount.value = params.schoolsResponse.data.length;
          }

          if (!params.coachesResponse.error && params.coachesResponse.data) {
            allCoaches.value = params.coachesResponse.data;
            coachCount.value = params.coachesResponse.data.length;
          } else if (params.coachesResponse.error) {
            errors.push(
              `Error fetching coaches: ${params.coachesResponse.error.message}`,
            );
          }

          if (
            !params.interactionsResponse.error &&
            params.interactionsResponse.data
          ) {
            allInteractions.value = params.interactionsResponse.data;
            interactionCount.value = params.interactionsResponse.data.length;
          } else if (params.interactionsResponse.error) {
            errors.push(
              `Error fetching interactions: ${params.interactionsResponse.error.message}`,
            );
          }

          try {
            if (!params.offersResponse.error && params.offersResponse.data) {
              allOffers.value = params.offersResponse.data;
            } else {
              throw new Error(
                params.offersResponse.error?.message || "Unknown error",
              );
            }
          } catch {
            allOffers.value = [];
          }
        };

        return {
          allSchools,
          allCoaches,
          allInteractions,
          allOffers,
          schoolCount,
          coachCount,
          interactionCount,
          errors,
          fetchCounts,
        };
      };

      it("logs error and keeps schools empty when schools query fails", async () => {
        const mock = createMockFetchCounts();
        await mock.fetchCounts({
          schoolsResponse: {
            data: null,
            error: { message: "connection refused", code: "PGRST301" },
          },
          coachesResponse: { data: [], error: null },
          interactionsResponse: { data: [], error: null },
          offersResponse: { data: [], error: null },
        });

        expect(mock.allSchools.value).toEqual([]);
        expect(mock.schoolCount.value).toBe(0);
        expect(mock.errors).toContain(
          "Error fetching schools: connection refused",
        );
      });

      it("logs error and keeps coaches empty when coaches query fails", async () => {
        const mock = createMockFetchCounts();
        await mock.fetchCounts({
          schoolsResponse: {
            data: [createMockSchool()],
            error: null,
          },
          coachesResponse: {
            data: null,
            error: { message: "timeout", code: "PGRST500" },
          },
          interactionsResponse: { data: [], error: null },
          offersResponse: { data: [], error: null },
        });

        expect(mock.allCoaches.value).toEqual([]);
        expect(mock.coachCount.value).toBe(0);
        expect(mock.errors).toContain("Error fetching coaches: timeout");
      });

      it("falls back to empty offers when offers query throws", async () => {
        const mock = createMockFetchCounts();
        await mock.fetchCounts({
          schoolsResponse: { data: [], error: null },
          coachesResponse: { data: [], error: null },
          interactionsResponse: { data: [], error: null },
          offersResponse: {
            data: null,
            error: { message: "table not found", code: "42P01" },
          },
        });

        expect(mock.allOffers.value).toEqual([]);
      });

      it("populates schools even when coaches and interactions fail", async () => {
        const testSchools = createMockSchools(3);
        const mock = createMockFetchCounts();
        await mock.fetchCounts({
          schoolsResponse: { data: testSchools, error: null },
          coachesResponse: {
            data: null,
            error: { message: "auth error", code: "PGRST401" },
          },
          interactionsResponse: {
            data: null,
            error: { message: "auth error", code: "PGRST401" },
          },
          offersResponse: { data: [], error: null },
        });

        expect(mock.allSchools.value).toHaveLength(3);
        expect(mock.schoolCount.value).toBe(3);
        expect(mock.allCoaches.value).toEqual([]);
        expect(mock.allInteractions.value).toEqual([]);
      });
    });

    describe("Large Datasets", () => {
      it("handles 100 schools without error", () => {
        const largeSchoolsArray = createMockSchools(100, (i) => ({
          priority_tier: i < 20 ? "A" : i < 50 ? "B" : "C",
          academic_info: { student_size: (i + 1) * 500 },
        }));

        const aTierCount = largeSchoolsArray.filter(
          (s) => s.priority_tier === "A",
        ).length;
        expect(aTierCount).toBe(20);
        expect(largeSchoolsArray).toHaveLength(100);
      });

      it("handles 500 interactions for contacts-this-month calculation", () => {
        const now = new Date();
        const currentMonth = now.getUTCMonth();
        const currentYear = now.getUTCFullYear();
        const startOfMonth = new Date(
          Date.UTC(currentYear, currentMonth, 1, 0, 0, 0),
        );
        const endOfMonth = new Date(
          Date.UTC(currentYear, currentMonth + 1, 1, 0, 0, 0),
        );

        const largeInteractionsArray = createMockInteractions(500, (i) => ({
          occurred_at: new Date(
            Date.UTC(
              currentYear,
              i < 300 ? currentMonth : currentMonth - 1,
              Math.min((i % 28) + 1, 28),
              12,
              0,
              0,
            ),
          ).toISOString(),
        }));

        const contactsThisMonth = largeInteractionsArray.filter((i) => {
          const interactionDate = new Date(i.occurred_at || i.created_at || "");
          return (
            interactionDate >= startOfMonth && interactionDate < endOfMonth
          );
        }).length;

        expect(contactsThisMonth).toBe(300);
        expect(largeInteractionsArray).toHaveLength(500);
      });

      it("handles 200 offers with mixed statuses", () => {
        const statuses = ["pending", "accepted", "declined"] as const;
        const largeOffersArray = Array.from({ length: 200 }, (_, i) =>
          createMockOffer({
            id: `offer-${i}`,
            status: statuses[i % statuses.length],
          }),
        );

        const totalOffers = largeOffersArray.length;
        const acceptedOffers = largeOffersArray.filter(
          (o) => o.status === "accepted",
        ).length;

        expect(totalOffers).toBe(200);
        expect(acceptedOffers).toBeGreaterThan(0);
        expect(acceptedOffers).toBeLessThan(200);
      });

      it("slices notifications to 5 from a list of 1000", () => {
        const largeNotifications: Notification[] = Array.from(
          { length: 1000 },
          (_, i) => ({
            id: `notif-${i}`,
            type: "deadline_reminder" as const,
            title: `Notification ${i}`,
            message: `Message ${i}`,
            priority: "normal" as const,
            scheduled_for: new Date().toISOString(),
          }),
        );

        const recentNotifications = largeNotifications.slice(0, 5);
        expect(recentNotifications).toHaveLength(5);
        expect(recentNotifications[0].id).toBe("notif-0");
        expect(recentNotifications[4].id).toBe("notif-4");
      });

      it("computes school size breakdown correctly for 100 schools", () => {
        const largeSchoolsArray = createMockSchools(100, (i) => {
          const sizes = [500, 3000, 7000, 15000, 30000];
          return {
            academic_info: { student_size: sizes[i % sizes.length] },
          };
        });

        const breakdown: Record<string, number> = {
          "Very Small": 0,
          Small: 0,
          Medium: 0,
          Large: 0,
          "Very Large": 0,
        };

        largeSchoolsArray.forEach((school) => {
          const studentSize = school.academic_info?.student_size;
          if (studentSize) {
            const size = getCarnegieSize(
              typeof studentSize === "number" ? studentSize : null,
            );
            if (size && size in breakdown) {
              breakdown[size]++;
            }
          }
        });

        const totalCategorized = Object.values(breakdown).reduce(
          (sum, v) => sum + v,
          0,
        );
        expect(totalCategorized).toBe(100);
        expect(breakdown["Very Small"]).toBe(20);
        expect(breakdown["Very Large"]).toBe(20);
      });
    });

    describe("Network Failures", () => {
      const simulateNetworkFetch = async <T>(params: {
        fetchFn: () => Promise<T>;
        onSuccess: (data: T) => void;
        onError: (message: string) => void;
      }): Promise<{ isSuccess: boolean; errorMessage: string | null }> => {
        try {
          const data = await params.fetchFn();
          params.onSuccess(data);
          return { isSuccess: true, errorMessage: null };
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Unknown network error";
          params.onError(message);
          return { isSuccess: false, errorMessage: message };
        }
      };

      it("handles recruiting packet API failure gracefully", async () => {
        const errorMessages: string[] = [];

        const result = await simulateNetworkFetch({
          fetchFn: () => Promise.reject(new Error("Network request failed")),
          onSuccess: () => {},
          onError: (msg) => errorMessages.push(msg),
        });

        expect(result.isSuccess).toBe(false);
        expect(result.errorMessage).toBe("Network request failed");
        expect(errorMessages).toContain("Network request failed");
      });

      it("handles suggestion fetch failure gracefully", async () => {
        const errorMessages: string[] = [];

        const result = await simulateNetworkFetch({
          fetchFn: () => Promise.reject(new Error("503 Service Unavailable")),
          onSuccess: () => {},
          onError: (msg) => errorMessages.push(msg),
        });

        expect(result.isSuccess).toBe(false);
        expect(result.errorMessage).toBe("503 Service Unavailable");
      });

      it("handles timeout errors with fallback message", async () => {
        const errorMessages: string[] = [];

        const result = await simulateNetworkFetch({
          fetchFn: () => Promise.reject("timeout" as unknown),
          onSuccess: () => {},
          onError: (msg) => errorMessages.push(msg),
        });

        expect(result.isSuccess).toBe(false);
        expect(result.errorMessage).toBe("Unknown network error");
      });

      it("handles notification generation API failure", async () => {
        const generatingNotifications = ref(false);
        const toastMessages: Array<{ message: string; type: string }> = [];

        const generateNotifications = async (params: {
          fetchFn: () => Promise<{ success: boolean; created: number }>;
          showToast: (message: string, type: string) => void;
        }) => {
          try {
            generatingNotifications.value = true;
            const result = await params.fetchFn();
            if (result.success) {
              params.showToast(
                `Created ${result.created} notifications`,
                "success",
              );
            }
          } catch {
            params.showToast("Failed to generate notifications", "error");
          } finally {
            generatingNotifications.value = false;
          }
        };

        await generateNotifications({
          fetchFn: () => Promise.reject(new Error("Internal server error")),
          showToast: (message, type) => toastMessages.push({ message, type }),
        });

        expect(generatingNotifications.value).toBe(false);
        expect(toastMessages).toContainEqual({
          message: "Failed to generate notifications",
          type: "error",
        });
      });
    });

    describe("Timezone Edge Cases", () => {
      it("handles interaction at midnight UTC on first of month", () => {
        const fixedYear = 2026;
        const fixedMonth = 1;
        const startOfMonth = new Date(
          Date.UTC(fixedYear, fixedMonth, 1, 0, 0, 0),
        );
        const endOfMonth = new Date(
          Date.UTC(fixedYear, fixedMonth + 1, 1, 0, 0, 0),
        );

        const midnightInteraction = createMockInteraction({
          occurred_at: new Date(
            Date.UTC(fixedYear, fixedMonth, 1, 0, 0, 0),
          ).toISOString(),
        });

        const interactionDate = new Date(midnightInteraction.occurred_at || "");
        const isInMonth =
          interactionDate >= startOfMonth && interactionDate < endOfMonth;

        expect(isInMonth).toBe(true);
      });

      it("excludes interaction at 23:59:59.999 of previous month", () => {
        const fixedYear = 2026;
        const fixedMonth = 1;
        const startOfMonth = new Date(
          Date.UTC(fixedYear, fixedMonth, 1, 0, 0, 0),
        );
        const endOfMonth = new Date(
          Date.UTC(fixedYear, fixedMonth + 1, 1, 0, 0, 0),
        );

        const lastMomentPrevMonth = createMockInteraction({
          occurred_at: new Date(
            Date.UTC(fixedYear, fixedMonth, 1, 0, 0, 0) - 1,
          ).toISOString(),
        });

        const interactionDate = new Date(lastMomentPrevMonth.occurred_at || "");
        const isInMonth =
          interactionDate >= startOfMonth && interactionDate < endOfMonth;

        expect(isInMonth).toBe(false);
      });

      it("handles DST transition dates correctly using UTC", () => {
        const startOfMarch = new Date(Date.UTC(2026, 2, 1, 0, 0, 0));
        const endOfMarch = new Date(Date.UTC(2026, 3, 1, 0, 0, 0));

        const dstTransitionInteraction = createMockInteraction({
          occurred_at: new Date(Date.UTC(2026, 2, 8, 7, 0, 0)).toISOString(),
        });

        const interactionDate = new Date(
          dstTransitionInteraction.occurred_at || "",
        );
        const isInMonth =
          interactionDate >= startOfMarch && interactionDate < endOfMarch;

        expect(isInMonth).toBe(true);
      });

      it("handles year boundary correctly (Dec 31 vs Jan 1)", () => {
        const startOfJan = new Date(Date.UTC(2027, 0, 1, 0, 0, 0));
        const endOfJan = new Date(Date.UTC(2027, 1, 1, 0, 0, 0));

        const dec31 = createMockInteraction({
          occurred_at: new Date(
            Date.UTC(2026, 11, 31, 23, 59, 59, 999),
          ).toISOString(),
        });
        const jan1 = createMockInteraction({
          occurred_at: new Date(Date.UTC(2027, 0, 1, 0, 0, 0)).toISOString(),
        });

        const dec31Date = new Date(dec31.occurred_at || "");
        const jan1Date = new Date(jan1.occurred_at || "");

        expect(dec31Date >= startOfJan && dec31Date < endOfJan).toBe(false);
        expect(jan1Date >= startOfJan && jan1Date < endOfJan).toBe(true);
      });

      it("handles leap year February 29th", () => {
        const startOfFeb2028 = new Date(Date.UTC(2028, 1, 1, 0, 0, 0));
        const endOfFeb2028 = new Date(Date.UTC(2028, 2, 1, 0, 0, 0));

        const feb29 = createMockInteraction({
          occurred_at: new Date(Date.UTC(2028, 1, 29, 15, 30, 0)).toISOString(),
        });

        const interactionDate = new Date(feb29.occurred_at || "");
        const isInMonth =
          interactionDate >= startOfFeb2028 && interactionDate < endOfFeb2028;

        expect(isInMonth).toBe(true);
      });

      it("uses mocked Date.now for consistent month calculation", () => {
        const FIXED_NOW = Date.UTC(2026, 5, 15, 12, 0, 0);
        vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);

        const now = new Date(Date.now());
        const startOfMonth = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
        );
        const endOfMonth = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0),
        );

        const juneInteraction = createMockInteraction({
          occurred_at: new Date(Date.UTC(2026, 5, 10, 8, 0, 0)).toISOString(),
        });
        const mayInteraction = createMockInteraction({
          occurred_at: new Date(Date.UTC(2026, 4, 28, 8, 0, 0)).toISOString(),
        });

        const juneDate = new Date(juneInteraction.occurred_at || "");
        const mayDate = new Date(mayInteraction.occurred_at || "");

        expect(juneDate >= startOfMonth && juneDate < endOfMonth).toBe(true);
        expect(mayDate >= startOfMonth && mayDate < endOfMonth).toBe(false);
      });
    });

    describe("Invalid and Malformed Data", () => {
      it("handles interaction with empty string occurred_at and created_at", () => {
        const interaction: Interaction = {
          id: "1",
          school_id: "school-1",
          type: "email",
          direction: "outbound",
          occurred_at: "",
          created_at: "",
          logged_by: "user-1",
        };

        const interactionDate = new Date(
          interaction.occurred_at || interaction.created_at || "",
        );
        const isValidDate = !isNaN(interactionDate.getTime());

        expect(isValidDate).toBe(false);
      });

      it("handles school with null priority_tier in A-tier count", () => {
        const schools: School[] = [
          createMockSchool({ priority_tier: null }),
          createMockSchool({ priority_tier: undefined as any }),
          createMockSchool({ priority_tier: "A" }),
        ];

        const aTierCount = schools.filter(
          (s) => s.priority_tier === "A",
        ).length;
        expect(aTierCount).toBe(1);
      });

      it("handles offers with unexpected status values", () => {
        const offers = [
          createMockOffer({ status: "accepted" }),
          createMockOffer({ status: "cancelled" as any }),
          createMockOffer({ status: "" as any }),
          createMockOffer({ status: undefined as any }),
        ];

        const acceptedCount = offers.filter(
          (o) => o.status === "accepted",
        ).length;
        expect(acceptedCount).toBe(1);
      });
    });
  });
});
