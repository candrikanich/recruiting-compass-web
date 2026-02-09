import type { Ref } from "vue";
import { computed } from "vue";
import type { Interaction } from "~/types/models";

/**
 * Provides analytics computed properties for interaction data
 *
 * @param interactions - Reactive reference to array of interactions to analyze
 * @returns Analytics metrics as computed properties
 */
export const useInteractionAnalytics = (interactions: Ref<Interaction[]>) => {
  const outboundCount = computed(
    () => interactions.value.filter((i) => i.direction === "outbound").length,
  );

  const inboundCount = computed(
    () => interactions.value.filter((i) => i.direction === "inbound").length,
  );

  const thisWeekCount = computed(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return interactions.value.filter((i) => {
      const date = new Date(i.occurred_at || i.created_at || "");
      return date >= weekAgo;
    }).length;
  });

  return {
    outboundCount,
    inboundCount,
    thisWeekCount,
  };
};
