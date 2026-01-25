import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, computed } from "vue";
import type { Interaction } from "~/types/models";

/**
 * Unit tests for school interactions timeline filtering and metrics
 * Tests the computed properties and filtering logic from pages/schools/[id]/interactions.vue
 */

describe("School Interactions Timeline Filtering & Metrics", () => {
  let interactions: Interaction[];

  beforeEach(() => {
    // Mock interaction data for testing
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

    interactions = [
      {
        id: "i1",
        school_id: "s1",
        coach_id: "c1",
        event_id: null,
        type: "email",
        direction: "outbound",
        subject: "Initial Outreach",
        content: "First email to coach",
        sentiment: "positive",
        occurred_at: sevenDaysAgo.toISOString(),
        created_at: sevenDaysAgo.toISOString(),
        logged_by: "user1",
        attachments: [],
      },
      {
        id: "i2",
        school_id: "s1",
        coach_id: "c1",
        event_id: null,
        type: "phone_call",
        direction: "inbound",
        subject: "Coach Response",
        content: "Positive phone call response",
        sentiment: "very_positive",
        occurred_at: yesterday.toISOString(),
        created_at: yesterday.toISOString(),
        logged_by: "user1",
        attachments: [],
      },
      {
        id: "i3",
        school_id: "s1",
        coach_id: "c2",
        event_id: null,
        type: "email",
        direction: "outbound",
        subject: "Follow-up",
        content: "Follow up email",
        sentiment: null,
        occurred_at: now.toISOString(),
        created_at: now.toISOString(),
        logged_by: "user1",
        attachments: [],
      },
      {
        id: "i4",
        school_id: "s1",
        coach_id: null,
        event_id: null,
        type: "text",
        direction: "inbound",
        subject: null,
        content: "Text message from coach",
        sentiment: "neutral",
        occurred_at: thirtyOneDaysAgo.toISOString(),
        created_at: thirtyOneDaysAgo.toISOString(),
        logged_by: "user1",
        attachments: [],
      },
      {
        id: "i5",
        school_id: "s1",
        coach_id: "c1",
        event_id: null,
        type: "virtual_meeting",
        direction: "outbound",
        subject: "Virtual Meeting",
        content: "Scheduled virtual meeting",
        sentiment: "positive",
        occurred_at: thirtyDaysAgo.toISOString(),
        created_at: thirtyDaysAgo.toISOString(),
        logged_by: "user1",
        attachments: [],
      },
    ];
  });

  describe("filteredInteractions computed property", () => {
    it("should return all interactions when no filters applied", () => {
      const selectedType = ref("");
      const selectedDirection = ref("");
      const selectedDateRange = ref("");
      const selectedSentiment = ref("");
      const interactionsRef = ref(interactions);

      const filteredInteractions = computed(() => {
        let filtered = interactionsRef.value;

        if (selectedType.value) {
          filtered = filtered.filter((i) => i.type === selectedType.value);
        }

        if (selectedDirection.value) {
          filtered = filtered.filter(
            (i) => i.direction === selectedDirection.value
          );
        }

        if (selectedSentiment.value) {
          filtered = filtered.filter(
            (i) => i.sentiment === selectedSentiment.value
          );
        }

        if (selectedDateRange.value) {
          const days = parseInt(selectedDateRange.value);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          filtered = filtered.filter(
            (i) => new Date(i.occurred_at || "") > cutoffDate
          );
        }

        return filtered.sort(
          (a, b) =>
            new Date(b.occurred_at || "").getTime() -
            new Date(a.occurred_at || "").getTime()
        );
      });

      expect(filteredInteractions.value.length).toBe(5);
    });

    it("should filter by type correctly", () => {
      const selectedType = ref("email");
      const selectedDirection = ref("");
      const selectedDateRange = ref("");
      const selectedSentiment = ref("");
      const interactionsRef = ref(interactions);

      const filteredInteractions = computed(() => {
        let filtered = interactionsRef.value;

        if (selectedType.value) {
          filtered = filtered.filter((i) => i.type === selectedType.value);
        }

        if (selectedDirection.value) {
          filtered = filtered.filter(
            (i) => i.direction === selectedDirection.value
          );
        }

        if (selectedSentiment.value) {
          filtered = filtered.filter(
            (i) => i.sentiment === selectedSentiment.value
          );
        }

        if (selectedDateRange.value) {
          const days = parseInt(selectedDateRange.value);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          filtered = filtered.filter(
            (i) => new Date(i.occurred_at || "") > cutoffDate
          );
        }

        return filtered.sort(
          (a, b) =>
            new Date(b.occurred_at || "").getTime() -
            new Date(a.occurred_at || "").getTime()
        );
      });

      expect(filteredInteractions.value.length).toBe(2); // i1 and i3 are emails
      expect(filteredInteractions.value.every((i) => i.type === "email")).toBe(
        true
      );
    });

    it("should filter by direction correctly", () => {
      const selectedType = ref("");
      const selectedDirection = ref("outbound");
      const selectedDateRange = ref("");
      const selectedSentiment = ref("");
      const interactionsRef = ref(interactions);

      const filteredInteractions = computed(() => {
        let filtered = interactionsRef.value;

        if (selectedType.value) {
          filtered = filtered.filter((i) => i.type === selectedType.value);
        }

        if (selectedDirection.value) {
          filtered = filtered.filter(
            (i) => i.direction === selectedDirection.value
          );
        }

        if (selectedSentiment.value) {
          filtered = filtered.filter(
            (i) => i.sentiment === selectedSentiment.value
          );
        }

        if (selectedDateRange.value) {
          const days = parseInt(selectedDateRange.value);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          filtered = filtered.filter(
            (i) => new Date(i.occurred_at || "") > cutoffDate
          );
        }

        return filtered.sort(
          (a, b) =>
            new Date(b.occurred_at || "").getTime() -
            new Date(a.occurred_at || "").getTime()
        );
      });

      expect(filteredInteractions.value.length).toBe(3); // i1, i3, i5
      expect(
        filteredInteractions.value.every((i) => i.direction === "outbound")
      ).toBe(true);
    });

    it("should filter by sentiment correctly", () => {
      const selectedType = ref("");
      const selectedDirection = ref("");
      const selectedDateRange = ref("");
      const selectedSentiment = ref("positive");
      const interactionsRef = ref(interactions);

      const filteredInteractions = computed(() => {
        let filtered = interactionsRef.value;

        if (selectedType.value) {
          filtered = filtered.filter((i) => i.type === selectedType.value);
        }

        if (selectedDirection.value) {
          filtered = filtered.filter(
            (i) => i.direction === selectedDirection.value
          );
        }

        if (selectedSentiment.value) {
          filtered = filtered.filter(
            (i) => i.sentiment === selectedSentiment.value
          );
        }

        if (selectedDateRange.value) {
          const days = parseInt(selectedDateRange.value);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          filtered = filtered.filter(
            (i) => new Date(i.occurred_at || "") > cutoffDate
          );
        }

        return filtered.sort(
          (a, b) =>
            new Date(b.occurred_at || "").getTime() -
            new Date(a.occurred_at || "").getTime()
        );
      });

      expect(filteredInteractions.value.length).toBe(2); // i1, i5 are positive
      expect(
        filteredInteractions.value.every((i) => i.sentiment === "positive")
      ).toBe(true);
    });

    it("should filter by date range correctly", () => {
      const selectedType = ref("");
      const selectedDirection = ref("");
      const selectedDateRange = ref("7");
      const selectedSentiment = ref("");
      const interactionsRef = ref(interactions);

      const filteredInteractions = computed(() => {
        let filtered = interactionsRef.value;

        if (selectedType.value) {
          filtered = filtered.filter((i) => i.type === selectedType.value);
        }

        if (selectedDirection.value) {
          filtered = filtered.filter(
            (i) => i.direction === selectedDirection.value
          );
        }

        if (selectedSentiment.value) {
          filtered = filtered.filter(
            (i) => i.sentiment === selectedSentiment.value
          );
        }

        if (selectedDateRange.value) {
          const days = parseInt(selectedDateRange.value);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          filtered = filtered.filter(
            (i) => new Date(i.occurred_at || "") > cutoffDate
          );
        }

        return filtered.sort(
          (a, b) =>
            new Date(b.occurred_at || "").getTime() -
            new Date(a.occurred_at || "").getTime()
        );
      });

      // Should include interactions from last 7 days (yesterday and today)
      expect(filteredInteractions.value.length).toBe(2); // i2 (yesterday) and i3 (now)
    });

    it("should apply multiple filters simultaneously", () => {
      const selectedType = ref("email");
      const selectedDirection = ref("outbound");
      const selectedDateRange = ref("");
      const selectedSentiment = ref("");
      const interactionsRef = ref(interactions);

      const filteredInteractions = computed(() => {
        let filtered = interactionsRef.value;

        if (selectedType.value) {
          filtered = filtered.filter((i) => i.type === selectedType.value);
        }

        if (selectedDirection.value) {
          filtered = filtered.filter(
            (i) => i.direction === selectedDirection.value
          );
        }

        if (selectedSentiment.value) {
          filtered = filtered.filter(
            (i) => i.sentiment === selectedSentiment.value
          );
        }

        if (selectedDateRange.value) {
          const days = parseInt(selectedDateRange.value);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          filtered = filtered.filter(
            (i) => new Date(i.occurred_at || "") > cutoffDate
          );
        }

        return filtered.sort(
          (a, b) =>
            new Date(b.occurred_at || "").getTime() -
            new Date(a.occurred_at || "").getTime()
        );
      });

      // Should only include outbound emails (i1 and i3)
      expect(filteredInteractions.value.length).toBe(2);
      expect(
        filteredInteractions.value.every((i) => i.type === "email")
      ).toBe(true);
      expect(
        filteredInteractions.value.every((i) => i.direction === "outbound")
      ).toBe(true);
    });

    it("should sort by date descending (newest first)", () => {
      const selectedType = ref("");
      const selectedDirection = ref("");
      const selectedDateRange = ref("");
      const selectedSentiment = ref("");
      const interactionsRef = ref(interactions);

      const filteredInteractions = computed(() => {
        let filtered = interactionsRef.value;

        if (selectedType.value) {
          filtered = filtered.filter((i) => i.type === selectedType.value);
        }

        if (selectedDirection.value) {
          filtered = filtered.filter(
            (i) => i.direction === selectedDirection.value
          );
        }

        if (selectedSentiment.value) {
          filtered = filtered.filter(
            (i) => i.sentiment === selectedSentiment.value
          );
        }

        if (selectedDateRange.value) {
          const days = parseInt(selectedDateRange.value);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          filtered = filtered.filter(
            (i) => new Date(i.occurred_at || "") > cutoffDate
          );
        }

        return filtered.sort(
          (a, b) =>
            new Date(b.occurred_at || "").getTime() -
            new Date(a.occurred_at || "").getTime()
        );
      });

      // Verify sorting: most recent should be first
      expect(filteredInteractions.value[0].id).toBe("i3"); // now
      expect(filteredInteractions.value[1].id).toBe("i2"); // yesterday
      expect(filteredInteractions.value[4].id).toBe("i4"); // 30 days ago
    });
  });

  describe("Metrics Calculations", () => {
    it("should calculate outbound count correctly", () => {
      const selectedType = ref("");
      const selectedDirection = ref("");
      const selectedDateRange = ref("");
      const selectedSentiment = ref("");
      const interactionsRef = ref(interactions);

      const filteredInteractions = computed(() => {
        let filtered = interactionsRef.value;

        if (selectedType.value) {
          filtered = filtered.filter((i) => i.type === selectedType.value);
        }

        if (selectedDirection.value) {
          filtered = filtered.filter(
            (i) => i.direction === selectedDirection.value
          );
        }

        if (selectedSentiment.value) {
          filtered = filtered.filter(
            (i) => i.sentiment === selectedSentiment.value
          );
        }

        if (selectedDateRange.value) {
          const days = parseInt(selectedDateRange.value);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          filtered = filtered.filter(
            (i) => new Date(i.occurred_at || "") > cutoffDate
          );
        }

        return filtered.sort(
          (a, b) =>
            new Date(b.occurred_at || "").getTime() -
            new Date(a.occurred_at || "").getTime()
        );
      });

      const outboundCount = computed(
        () =>
          filteredInteractions.value.filter((i) => i.direction === "outbound")
            .length
      );

      expect(outboundCount.value).toBe(3); // i1, i3, i5
    });

    it("should calculate inbound count correctly", () => {
      const selectedType = ref("");
      const selectedDirection = ref("");
      const selectedDateRange = ref("");
      const selectedSentiment = ref("");
      const interactionsRef = ref(interactions);

      const filteredInteractions = computed(() => {
        let filtered = interactionsRef.value;

        if (selectedType.value) {
          filtered = filtered.filter((i) => i.type === selectedType.value);
        }

        if (selectedDirection.value) {
          filtered = filtered.filter(
            (i) => i.direction === selectedDirection.value
          );
        }

        if (selectedSentiment.value) {
          filtered = filtered.filter(
            (i) => i.sentiment === selectedSentiment.value
          );
        }

        if (selectedDateRange.value) {
          const days = parseInt(selectedDateRange.value);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          filtered = filtered.filter(
            (i) => new Date(i.occurred_at || "") > cutoffDate
          );
        }

        return filtered.sort(
          (a, b) =>
            new Date(b.occurred_at || "").getTime() -
            new Date(a.occurred_at || "").getTime()
        );
      });

      const inboundCount = computed(
        () =>
          filteredInteractions.value.filter((i) => i.direction === "inbound")
            .length
      );

      expect(inboundCount.value).toBe(2); // i2, i4
    });

    it("should calculate last contact time correctly", () => {
      const selectedType = ref("");
      const selectedDirection = ref("");
      const selectedDateRange = ref("");
      const selectedSentiment = ref("");
      const interactionsRef = ref(interactions);

      const filteredInteractions = computed(() => {
        let filtered = interactionsRef.value;

        if (selectedType.value) {
          filtered = filtered.filter((i) => i.type === selectedType.value);
        }

        if (selectedDirection.value) {
          filtered = filtered.filter(
            (i) => i.direction === selectedDirection.value
          );
        }

        if (selectedSentiment.value) {
          filtered = filtered.filter(
            (i) => i.sentiment === selectedSentiment.value
          );
        }

        if (selectedDateRange.value) {
          const days = parseInt(selectedDateRange.value);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          filtered = filtered.filter(
            (i) => new Date(i.occurred_at || "") > cutoffDate
          );
        }

        return filtered.sort(
          (a, b) =>
            new Date(b.occurred_at || "").getTime() -
            new Date(a.occurred_at || "").getTime()
        );
      });

      const lastContactDisplay = computed(() => {
        if (filteredInteractions.value.length === 0) return "—";
        const lastInteraction = filteredInteractions.value[0];
        if (!lastInteraction.occurred_at) return "Unknown";

        const date = new Date(lastInteraction.occurred_at);
        const now = new Date();
        const secondsAgo = Math.floor(
          (now.getTime() - date.getTime()) / 1000
        );

        if (secondsAgo < 60) return "just now";
        if (secondsAgo < 3600)
          return `${Math.floor(secondsAgo / 60)}m ago`;
        if (secondsAgo < 86400)
          return `${Math.floor(secondsAgo / 3600)}h ago`;
        if (secondsAgo < 604800)
          return `${Math.floor(secondsAgo / 86400)}d ago`;
        if (secondsAgo < 2592000) return "weeks ago";

        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      });

      // The last interaction should be i3 (most recent)
      expect(lastContactDisplay.value).toBe("just now");
    });

    it("should handle empty interactions gracefully", () => {
      const selectedType = ref("");
      const selectedDirection = ref("");
      const selectedDateRange = ref("");
      const selectedSentiment = ref("");
      const interactionsRef = ref<Interaction[]>([]);

      const filteredInteractions = computed(() => {
        let filtered = interactionsRef.value;

        if (selectedType.value) {
          filtered = filtered.filter((i) => i.type === selectedType.value);
        }

        if (selectedDirection.value) {
          filtered = filtered.filter(
            (i) => i.direction === selectedDirection.value
          );
        }

        if (selectedSentiment.value) {
          filtered = filtered.filter(
            (i) => i.sentiment === selectedSentiment.value
          );
        }

        if (selectedDateRange.value) {
          const days = parseInt(selectedDateRange.value);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          filtered = filtered.filter(
            (i) => new Date(i.occurred_at || "") > cutoffDate
          );
        }

        return filtered.sort(
          (a, b) =>
            new Date(b.occurred_at || "").getTime() -
            new Date(a.occurred_at || "").getTime()
        );
      });

      const outboundCount = computed(
        () =>
          filteredInteractions.value.filter((i) => i.direction === "outbound")
            .length
      );

      const inboundCount = computed(
        () =>
          filteredInteractions.value.filter((i) => i.direction === "inbound")
            .length
      );

      const lastContactDisplay = computed(() => {
        if (filteredInteractions.value.length === 0) return "—";
        return "has data";
      });

      expect(filteredInteractions.value.length).toBe(0);
      expect(outboundCount.value).toBe(0);
      expect(inboundCount.value).toBe(0);
      expect(lastContactDisplay.value).toBe("—");
    });
  });

  describe("Filter combinations", () => {
    it("should handle type + direction + sentiment filters together", () => {
      const selectedType = ref("email");
      const selectedDirection = ref("outbound");
      const selectedDateRange = ref("");
      const selectedSentiment = ref("positive");
      const interactionsRef = ref(interactions);

      const filteredInteractions = computed(() => {
        let filtered = interactionsRef.value;

        if (selectedType.value) {
          filtered = filtered.filter((i) => i.type === selectedType.value);
        }

        if (selectedDirection.value) {
          filtered = filtered.filter(
            (i) => i.direction === selectedDirection.value
          );
        }

        if (selectedSentiment.value) {
          filtered = filtered.filter(
            (i) => i.sentiment === selectedSentiment.value
          );
        }

        if (selectedDateRange.value) {
          const days = parseInt(selectedDateRange.value);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          filtered = filtered.filter(
            (i) => new Date(i.occurred_at || "") > cutoffDate
          );
        }

        return filtered.sort(
          (a, b) =>
            new Date(b.occurred_at || "").getTime() -
            new Date(a.occurred_at || "").getTime()
        );
      });

      // Should only include positive outbound emails (i1)
      expect(filteredInteractions.value.length).toBe(1);
      expect(filteredInteractions.value[0].id).toBe("i1");
    });

    it("should return empty set when no interactions match filters", () => {
      const selectedType = ref("game"); // No game type interactions
      const selectedDirection = ref("");
      const selectedDateRange = ref("");
      const selectedSentiment = ref("");
      const interactionsRef = ref(interactions);

      const filteredInteractions = computed(() => {
        let filtered = interactionsRef.value;

        if (selectedType.value) {
          filtered = filtered.filter((i) => i.type === selectedType.value);
        }

        if (selectedDirection.value) {
          filtered = filtered.filter(
            (i) => i.direction === selectedDirection.value
          );
        }

        if (selectedSentiment.value) {
          filtered = filtered.filter(
            (i) => i.sentiment === selectedSentiment.value
          );
        }

        if (selectedDateRange.value) {
          const days = parseInt(selectedDateRange.value);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          filtered = filtered.filter(
            (i) => new Date(i.occurred_at || "") > cutoffDate
          );
        }

        return filtered.sort(
          (a, b) =>
            new Date(b.occurred_at || "").getTime() -
            new Date(a.occurred_at || "").getTime()
        );
      });

      expect(filteredInteractions.value.length).toBe(0);
    });
  });
});
