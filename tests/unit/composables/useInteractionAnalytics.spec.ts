import { describe, it, expect } from "vitest";
import { ref } from "vue";
import type { Interaction } from "~/types/models";
import { useInteractionAnalytics } from "~/composables/useInteractionAnalytics";

describe("useInteractionAnalytics", () => {
  const createInteraction = (
    overrides: Partial<Interaction> = {},
  ): Interaction => ({
    id: "test-id",
    type: "email",
    direction: "outbound",
    created_at: new Date().toISOString(),
    ...overrides,
  });

  describe("outboundCount", () => {
    it("returns 0 when no interactions exist", () => {
      const interactions = ref<Interaction[]>([]);
      const { outboundCount } = useInteractionAnalytics(interactions);

      expect(outboundCount.value).toBe(0);
    });

    it("counts only outbound interactions", () => {
      const interactions = ref<Interaction[]>([
        createInteraction({ direction: "outbound" }),
        createInteraction({ direction: "outbound" }),
        createInteraction({ direction: "inbound" }),
      ]);
      const { outboundCount } = useInteractionAnalytics(interactions);

      expect(outboundCount.value).toBe(2);
    });

    it("updates reactively when interactions change", () => {
      const interactions = ref<Interaction[]>([
        createInteraction({ direction: "outbound" }),
      ]);
      const { outboundCount } = useInteractionAnalytics(interactions);

      expect(outboundCount.value).toBe(1);

      interactions.value.push(createInteraction({ direction: "outbound" }));
      expect(outboundCount.value).toBe(2);
    });
  });

  describe("inboundCount", () => {
    it("returns 0 when no interactions exist", () => {
      const interactions = ref<Interaction[]>([]);
      const { inboundCount } = useInteractionAnalytics(interactions);

      expect(inboundCount.value).toBe(0);
    });

    it("counts only inbound interactions", () => {
      const interactions = ref<Interaction[]>([
        createInteraction({ direction: "inbound" }),
        createInteraction({ direction: "inbound" }),
        createInteraction({ direction: "outbound" }),
      ]);
      const { inboundCount } = useInteractionAnalytics(interactions);

      expect(inboundCount.value).toBe(2);
    });

    it("updates reactively when interactions change", () => {
      const interactions = ref<Interaction[]>([
        createInteraction({ direction: "inbound" }),
      ]);
      const { inboundCount } = useInteractionAnalytics(interactions);

      expect(inboundCount.value).toBe(1);

      interactions.value.push(createInteraction({ direction: "inbound" }));
      expect(inboundCount.value).toBe(2);
    });
  });

  describe("thisWeekCount", () => {
    it("returns 0 when no interactions exist", () => {
      const interactions = ref<Interaction[]>([]);
      const { thisWeekCount } = useInteractionAnalytics(interactions);

      expect(thisWeekCount.value).toBe(0);
    });

    it("counts interactions from last 7 days using occurred_at", () => {
      const today = new Date();
      const fiveDaysAgo = new Date(today);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const tenDaysAgo = new Date(today);
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const interactions = ref<Interaction[]>([
        createInteraction({ occurred_at: today.toISOString() }),
        createInteraction({ occurred_at: fiveDaysAgo.toISOString() }),
        createInteraction({ occurred_at: tenDaysAgo.toISOString() }),
      ]);
      const { thisWeekCount } = useInteractionAnalytics(interactions);

      expect(thisWeekCount.value).toBe(2);
    });

    it("falls back to created_at when occurred_at is missing", () => {
      const today = new Date();
      const fiveDaysAgo = new Date(today);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const tenDaysAgo = new Date(today);
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const interactions = ref<Interaction[]>([
        createInteraction({
          occurred_at: undefined,
          created_at: today.toISOString(),
        }),
        createInteraction({
          occurred_at: undefined,
          created_at: fiveDaysAgo.toISOString(),
        }),
        createInteraction({
          occurred_at: undefined,
          created_at: tenDaysAgo.toISOString(),
        }),
      ]);
      const { thisWeekCount } = useInteractionAnalytics(interactions);

      expect(thisWeekCount.value).toBe(2);
    });

    it("handles boundary case exactly 7 days ago", () => {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const interactions = ref<Interaction[]>([
        createInteraction({ occurred_at: sevenDaysAgo.toISOString() }),
      ]);
      const { thisWeekCount } = useInteractionAnalytics(interactions);

      // Exactly 7 days ago should be included (>= comparison)
      expect(thisWeekCount.value).toBe(1);
    });

    it("updates reactively when interactions change", () => {
      const today = new Date();
      const interactions = ref<Interaction[]>([
        createInteraction({ occurred_at: today.toISOString() }),
      ]);
      const { thisWeekCount } = useInteractionAnalytics(interactions);

      expect(thisWeekCount.value).toBe(1);

      interactions.value.push(
        createInteraction({ occurred_at: today.toISOString() }),
      );
      expect(thisWeekCount.value).toBe(2);
    });

    it("handles empty date strings gracefully", () => {
      const interactions = ref<Interaction[]>([
        createInteraction({ occurred_at: "", created_at: "" }),
      ]);
      const { thisWeekCount } = useInteractionAnalytics(interactions);

      // Invalid date should be filtered out (date < weekAgo)
      expect(thisWeekCount.value).toBe(0);
    });
  });

  describe("combined analytics", () => {
    it("provides all analytics metrics together", () => {
      const today = new Date();
      const fiveDaysAgo = new Date(today);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const interactions = ref<Interaction[]>([
        createInteraction({
          direction: "outbound",
          occurred_at: today.toISOString(),
        }),
        createInteraction({
          direction: "inbound",
          occurred_at: fiveDaysAgo.toISOString(),
        }),
        createInteraction({
          direction: "outbound",
          occurred_at: fiveDaysAgo.toISOString(),
        }),
      ]);

      const { outboundCount, inboundCount, thisWeekCount } =
        useInteractionAnalytics(interactions);

      expect(outboundCount.value).toBe(2);
      expect(inboundCount.value).toBe(1);
      expect(thisWeekCount.value).toBe(3);
    });
  });
});
