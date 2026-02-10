import { computed, type Ref } from "vue";
import type { Coach, Interaction } from "~/types/models";
import { daysAgo } from "~/utils/dateFormatters";
import { formatType as formatInteractionType } from "~/utils/interactionFormatters";

export interface CoachStats {
  totalInteractions: number;
  daysSinceContact: number;
  preferredMethod: string;
}

/**
 * Composable for calculating coach statistics based on interactions
 * @param coach - Coach reference
 * @param interactions - Filtered interactions for this coach
 * @returns Computed coach statistics
 */
export const useCoachStats = (
  coach: Ref<Coach | null>,
  interactions: Ref<Interaction[]>,
) => {
  const stats = computed<CoachStats>(() => {
    if (!coach.value) {
      return {
        totalInteractions: 0,
        daysSinceContact: 0,
        preferredMethod: "",
      };
    }

    const total = interactions.value.length;
    const daysSince = coach.value.last_contact_date
      ? daysAgo(coach.value.last_contact_date)
      : 0;

    // Calculate preferred communication method
    const methods: Record<string, number> = {};
    interactions.value.forEach((interaction) => {
      methods[interaction.type] = (methods[interaction.type] || 0) + 1;
    });

    const preferredMethod =
      Object.entries(methods).sort(([, a], [, b]) => b - a)[0]?.[0] || "";

    return {
      totalInteractions: total,
      daysSinceContact: daysSince,
      preferredMethod: preferredMethod
        ? formatInteractionType(preferredMethod)
        : "N/A",
    };
  });

  return { stats };
};
