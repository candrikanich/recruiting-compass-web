// tests/unit/composables/useSchoolStats.spec.ts
import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useSchoolStats } from '~/composables/useSchoolStats';
import type { School } from '~/types/models';

describe('useSchoolStats', () => {
  it('calculates total schools correctly', () => {
    const schools = ref<School[]>([
      { id: '1', name: 'School 1', family_unit_id: 'f1' } as School,
      { id: '2', name: 'School 2', family_unit_id: 'f1' } as School
    ]);

    const { stats } = useSchoolStats(schools);

    expect(stats.value[0].label).toBe('Total Schools');
    expect(stats.value[0].value).toBe(2);
  });

  it('counts favorites accurately', () => {
    const schools = ref<School[]>([
      { id: '1', name: 'School 1', is_favorite: true, family_unit_id: 'f1' } as School,
      { id: '2', name: 'School 2', is_favorite: false, family_unit_id: 'f1' } as School,
      { id: '3', name: 'School 3', is_favorite: true, family_unit_id: 'f1' } as School
    ]);

    const { stats } = useSchoolStats(schools);

    expect(stats.value[1].label).toBe('Favorites');
    expect(stats.value[1].value).toBe(2);
  });

  it('filters Tier A schools', () => {
    const schools = ref<School[]>([
      { id: '1', name: 'School 1', priority_tier: 'A', family_unit_id: 'f1' } as School,
      { id: '2', name: 'School 2', priority_tier: 'B', family_unit_id: 'f1' } as School,
      { id: '3', name: 'School 3', priority_tier: 'A', family_unit_id: 'f1' } as School
    ]);

    const { stats } = useSchoolStats(schools);

    expect(stats.value[2].label).toBe('Tier A');
    expect(stats.value[2].value).toBe(2);
  });

  it('counts visited schools', () => {
    const schools = ref<School[]>([
      { id: '1', name: 'School 1', visit_date: '2026-01-15', family_unit_id: 'f1' } as School,
      { id: '2', name: 'School 2', visit_date: null, family_unit_id: 'f1' } as School,
      { id: '3', name: 'School 3', visit_date: '2026-02-01', family_unit_id: 'f1' } as School
    ]);

    const { stats } = useSchoolStats(schools);

    expect(stats.value[3].label).toBe('Visited');
    expect(stats.value[3].value).toBe(2);
  });

  it('handles empty schools array', () => {
    const schools = ref<School[]>([]);

    const { stats } = useSchoolStats(schools);

    expect(stats.value[0].value).toBe(0);
    expect(stats.value[1].value).toBe(0);
    expect(stats.value[2].value).toBe(0);
    expect(stats.value[3].value).toBe(0);
  });

  it('handles missing fields gracefully', () => {
    const schools = ref<School[]>([
      { id: '1', name: 'School 1', family_unit_id: 'f1' } as School,
      { id: '2', name: 'School 2', family_unit_id: 'f1' } as School
    ]);

    const { stats } = useSchoolStats(schools);

    expect(stats.value[1].value).toBe(0); // No favorites
    expect(stats.value[2].value).toBe(0); // No Tier A
    expect(stats.value[3].value).toBe(0); // No visited
  });
});
