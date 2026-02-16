// composables/useCoachListStats.ts
import { computed } from 'vue';
import type { Ref } from 'vue';
import type { Coach } from '~/types/models';
import {
  UserGroupIcon,
  StarIcon,
  ChatBubbleLeftIcon,
  ClockIcon
} from '@heroicons/vue/24/outline';

export function useCoachListStats(coaches: Ref<Coach[]>) {
  const stats = computed(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return [
      {
        label: 'Total Coaches',
        value: coaches.value.length,
        icon: UserGroupIcon,
        color: 'blue' as const,
        testId: 'stat-total-coaches'
      },
      {
        label: 'Head Coaches',
        value: coaches.value.filter(c => c.role === 'head').length,
        icon: StarIcon,
        color: 'purple' as const,
        testId: 'stat-head-coaches'
      },
      {
        label: 'Recent Contacts',
        value: coaches.value.filter(c =>
          c.last_contact_date && new Date(c.last_contact_date) >= sevenDaysAgo
        ).length,
        icon: ChatBubbleLeftIcon,
        color: 'green' as const,
        testId: 'stat-recent-contacts'
      },
      {
        label: 'Need Follow-up',
        value: coaches.value.filter(c =>
          !c.last_contact_date || new Date(c.last_contact_date) < thirtyDaysAgo
        ).length,
        icon: ClockIcon,
        color: 'amber' as const,
        testId: 'stat-need-followup'
      }
    ];
  });

  return { stats };
}
