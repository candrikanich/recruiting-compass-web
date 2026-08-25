import { computed, type Ref } from "vue";
import type { Coach, Interaction } from "~/types/models";

export const OVERDUE_DAYS = 14;

export function useCoachInsights(coach: Ref<Coach | null>, interactions: Ref<Interaction[]>) {
  const daysSinceContact = computed<number | null>(() => {
    const d = coach.value?.last_contact_date;
    if (!d) return null;
    return Math.floor((Date.now() - new Date(d).getTime()) / 864e5);
  });

  const isOverdue = computed(() => daysSinceContact.value != null && daysSinceContact.value > OVERDUE_DAYS);

  const totalInteractions = computed(() => interactions.value.length);

  const sentReceived = computed(() => interactions.value.reduce(
    (acc, i) => i.direction === "outbound" ? { ...acc, sent: acc.sent + 1 } : { ...acc, received: acc.received + 1 },
    { sent: 0, received: 0 },
  ));

  const responseRate = computed(() => {
    const t = totalInteractions.value;
    return t === 0 ? 0 : Math.round((sentReceived.value.received / t) * 100);
  });

  const preferredChannel = computed<Interaction["type"] | null>(() => {
    if (interactions.value.length === 0) return null;
    const counts = new Map<Interaction["type"], number>();
    for (const i of interactions.value) counts.set(i.type, (counts.get(i.type) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  });

  const overdueAlert = computed(() => isOverdue.value);
  const channelPreferenceAlert = computed(() => preferredChannel.value != null && totalInteractions.value >= 1);

  return { daysSinceContact, isOverdue, preferredChannel, totalInteractions, sentReceived, responseRate, overdueAlert, channelPreferenceAlert };
}
