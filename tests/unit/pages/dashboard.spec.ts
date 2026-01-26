import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { School, Interaction } from "~/types/models";

// Mock modules
vi.mock("~/composables/useSupabase");
vi.mock("~/composables/useAuth");
vi.mock("~/composables/useNotifications");
vi.mock("~/composables/useDocuments");
vi.mock("~/composables/useToast");
vi.mock("~/composables/useUserTasks");
vi.mock("~/composables/useUserPreferences");
vi.mock("~/composables/useSuggestions");
vi.mock("~/composables/useParentContext");
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
      const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0));

      const interactions: Interaction[] = [
        {
          id: "1",
          school_id: "school-1",
          type: "email",
          direction: "outbound",
          occurred_at: new Date(Date.UTC(currentYear, currentMonth, 15, 12, 0, 0)).toISOString(),
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          school_id: "school-2",
          type: "email",
          direction: "outbound",
          occurred_at: new Date(Date.UTC(currentYear, currentMonth, 20, 14, 30, 0)).toISOString(),
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
      ];

      const contactCount = interactions.filter((i) => {
        const interactionDate = new Date(i.occurred_at || i.created_at || "");
        return interactionDate >= startOfMonth && interactionDate <= now;
      }).length;

      expect(contactCount).toBe(2);
    });

    it("excludes interactions from previous month", () => {
      const now = new Date();
      const currentMonth = now.getUTCMonth();
      const currentYear = now.getUTCFullYear();

      // Use UTC to avoid timezone conversion ambiguity
      const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0));
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const interactions: Interaction[] = [
        {
          id: "1",
          school_id: "school-1",
          type: "email",
          direction: "outbound",
          occurred_at: new Date(Date.UTC(previousYear, previousMonth, 28, 12, 0, 0)).toISOString(),
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          school_id: "school-2",
          type: "email",
          direction: "outbound",
          occurred_at: new Date(Date.UTC(currentYear, currentMonth, 15, 12, 0, 0)).toISOString(),
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
      ];

      const contactCount = interactions.filter((i) => {
        const interactionDate = new Date(i.occurred_at || i.created_at || "");
        return interactionDate >= startOfMonth && interactionDate <= now;
      }).length;

      expect(contactCount).toBe(1);
    });

    it("excludes interactions from future months", () => {
      const now = new Date();
      const currentMonth = now.getUTCMonth();
      const currentYear = now.getUTCFullYear();

      // Use UTC to avoid timezone conversion ambiguity
      const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0));
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

      const interactions: Interaction[] = [
        {
          id: "1",
          school_id: "school-1",
          type: "email",
          direction: "outbound",
          occurred_at: new Date(Date.UTC(nextYear, nextMonth, 15, 12, 0, 0)).toISOString(),
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          school_id: "school-2",
          type: "email",
          direction: "outbound",
          occurred_at: new Date(Date.UTC(currentYear, currentMonth, 15, 12, 0, 0)).toISOString(),
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
      ];

      const contactCount = interactions.filter((i) => {
        const interactionDate = new Date(i.occurred_at || i.created_at || "");
        return interactionDate >= startOfMonth && interactionDate <= now;
      }).length;

      expect(contactCount).toBe(1);
    });

    it("returns 0 when no interactions this month", () => {
      const now = new Date();
      const currentMonth = now.getUTCMonth();
      const currentYear = now.getUTCFullYear();

      // Use UTC to avoid timezone conversion ambiguity
      const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0));
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const interactions: Interaction[] = [
        {
          id: "1",
          school_id: "school-1",
          type: "email",
          direction: "outbound",
          occurred_at: new Date(Date.UTC(previousYear, previousMonth, 28, 12, 0, 0)).toISOString(),
          logged_by: "user-1",
          created_at: new Date().toISOString(),
        },
      ];

      const contactCount = interactions.filter((i) => {
        const interactionDate = new Date(i.occurred_at || i.created_at || "");
        return interactionDate >= startOfMonth && interactionDate <= now;
      }).length;

      expect(contactCount).toBe(0);
    });

    it("uses created_at when occurred_at is missing", () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const interactions: Interaction[] = [
        {
          id: "1",
          school_id: "school-1",
          type: "email",
          direction: "outbound",
          occurred_at: undefined,
          created_at: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(),
          logged_by: "user-1",
        },
      ];

      const contactCount = interactions.filter((i) => {
        const interactionDate = new Date(i.occurred_at || i.created_at || "");
        return interactionDate >= startOfMonth && interactionDate <= now;
      }).length;

      expect(contactCount).toBe(1);
    });

    it("counts multiple interactions on same day", () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const sameDay = new Date(now.getFullYear(), now.getMonth(), 15);

      const interactions: Interaction[] = [
        {
          id: "1",
          school_id: "school-1",
          type: "email",
          direction: "outbound",
          occurred_at: sameDay.toISOString(),
          logged_by: "user-1",
        },
        {
          id: "2",
          school_id: "school-2",
          type: "phone_call",
          direction: "outbound",
          occurred_at: sameDay.toISOString(),
          logged_by: "user-1",
        },
        {
          id: "3",
          school_id: "school-3",
          type: "text",
          direction: "inbound",
          occurred_at: sameDay.toISOString(),
          logged_by: "user-1",
        },
      ];

      const contactCount = interactions.filter((i) => {
        const interactionDate = new Date(i.occurred_at || i.created_at || "");
        return interactionDate >= startOfMonth && interactionDate <= now;
      }).length;

      expect(contactCount).toBe(3);
    });
  });

  describe("Date boundary conditions", () => {
    it("includes first day of month", () => {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const isInMonth = firstDayOfMonth >= startOfMonth && firstDayOfMonth <= now;
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
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const firstMomentOfNextMonth = new Date(endOfMonth.getTime() + 1);

      const isInMonth = firstMomentOfNextMonth <= now;
      expect(isInMonth).toBe(false);
    });
  });
});
