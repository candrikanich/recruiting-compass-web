// composables/useSchoolStats.ts
import { computed } from 'vue';
import type { Ref } from 'vue';
import type { School } from '~/types/models';
import {
  AcademicCapIcon,
  StarIcon,
  TrophyIcon,
  MapPinIcon
} from '@heroicons/vue/24/outline';

export function useSchoolStats(schools: Ref<School[]>) {
  const stats = computed(() => [
    {
      label: 'Total Schools',
      value: schools.value.length,
      icon: AcademicCapIcon,
      color: 'blue' as const,
      testId: 'stat-total-schools'
    },
    {
      label: 'Favorites',
      value: schools.value.filter(s => s.is_favorite).length,
      icon: StarIcon,
      color: 'amber' as const,
      testId: 'stat-favorites'
    },
    {
      label: 'Tier A',
      value: schools.value.filter(s => s.priority_tier === 'A').length,
      icon: TrophyIcon,
      color: 'purple' as const,
      testId: 'stat-tier-a'
    },
    {
      label: 'Visited',
      value: schools.value.filter(s => s.visit_date != null).length,
      icon: MapPinIcon,
      color: 'green' as const,
      testId: 'stat-visited'
    }
  ]);

  return { stats };
}
