// composables/useEventStats.ts
import { computed } from 'vue';
import type { Ref } from 'vue';
import type { Event } from '~/types/models';
import {
  CalendarIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  CheckBadgeIcon
} from '@heroicons/vue/24/outline';

export function useEventStats(events: Ref<Event[]>) {
  const stats = computed(() => {
    // Get today's date as YYYY-MM-DD string for timezone-agnostic comparison
    const todayStr = new Date().toISOString().split('T')[0];

    return [
      {
        label: 'Total Events',
        value: events.value.length,
        icon: CalendarIcon,
        color: 'blue' as const,
        testId: 'stat-total-events'
      },
      {
        label: 'Upcoming',
        value: events.value.filter(e => e.start_date >= todayStr).length,
        icon: ArrowRightIcon,
        color: 'purple' as const,
        testId: 'stat-upcoming'
      },
      {
        label: 'Registered',
        value: events.value.filter(e => e.registered && !e.attended).length,
        icon: CheckCircleIcon,
        color: 'green' as const,
        testId: 'stat-registered'
      },
      {
        label: 'Attended',
        value: events.value.filter(e => e.attended).length,
        icon: CheckBadgeIcon,
        color: 'amber' as const,
        testId: 'stat-attended'
      }
    ];
  });

  return { stats };
}
