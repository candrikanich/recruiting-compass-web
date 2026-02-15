// tests/unit/composables/useCoachListStats.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { useCoachListStats } from '~/composables/useCoachListStats';
import type { Coach } from '~/types/models';

describe('useCoachListStats', () => {
  beforeEach(() => {
    // Mock current date to 2026-02-15
    vi.setSystemTime(new Date('2026-02-15T12:00:00Z'));
  });

  it('calculates total coaches correctly', () => {
    const coaches = ref<Coach[]>([
      { id: '1', first_name: 'John', last_name: 'Doe', school_id: 's1' } as Coach,
      { id: '2', first_name: 'Jane', last_name: 'Smith', school_id: 's1' } as Coach
    ]);

    const { stats } = useCoachListStats(coaches);

    expect(stats.value[0].label).toBe('Total Coaches');
    expect(stats.value[0].value).toBe(2);
  });

  it('filters head coaches by role', () => {
    const coaches = ref<Coach[]>([
      { id: '1', first_name: 'John', last_name: 'Doe', role: 'head_coach', school_id: 's1' } as Coach,
      { id: '2', first_name: 'Jane', last_name: 'Smith', role: 'assistant_coach', school_id: 's1' } as Coach,
      { id: '3', first_name: 'Bob', last_name: 'Johnson', role: 'head_coach', school_id: 's1' } as Coach
    ]);

    const { stats } = useCoachListStats(coaches);

    expect(stats.value[1].label).toBe('Head Coaches');
    expect(stats.value[1].value).toBe(2);
  });

  it('identifies recent contacts (last 7 days)', () => {
    const coaches = ref<Coach[]>([
      { id: '1', first_name: 'John', last_name: 'Doe', last_contact_date: '2026-02-14', school_id: 's1' } as Coach,
      { id: '2', first_name: 'Jane', last_name: 'Smith', last_contact_date: '2026-02-01', school_id: 's1' } as Coach,
      { id: '3', first_name: 'Bob', last_name: 'Johnson', last_contact_date: '2026-02-10', school_id: 's1' } as Coach
    ]);

    const { stats } = useCoachListStats(coaches);

    expect(stats.value[2].label).toBe('Recent Contacts');
    expect(stats.value[2].value).toBe(2); // Feb 14 and Feb 10 are within 7 days
  });

  it('identifies coaches needing follow-up (30+ days)', () => {
    const coaches = ref<Coach[]>([
      { id: '1', first_name: 'John', last_name: 'Doe', last_contact_date: '2026-01-01', school_id: 's1' } as Coach,
      { id: '2', first_name: 'Jane', last_name: 'Smith', last_contact_date: '2026-02-10', school_id: 's1' } as Coach,
      { id: '3', first_name: 'Bob', last_name: 'Johnson', last_contact_date: null, school_id: 's1' } as Coach
    ]);

    const { stats } = useCoachListStats(coaches);

    expect(stats.value[3].label).toBe('Need Follow-up');
    expect(stats.value[3].value).toBe(2); // Jan 1 and null
  });

  it('handles empty coaches array', () => {
    const coaches = ref<Coach[]>([]);

    const { stats } = useCoachListStats(coaches);

    expect(stats.value[0].value).toBe(0);
    expect(stats.value[1].value).toBe(0);
    expect(stats.value[2].value).toBe(0);
    expect(stats.value[3].value).toBe(0);
  });

  it('handles null last_contact_date', () => {
    const coaches = ref<Coach[]>([
      { id: '1', first_name: 'John', last_name: 'Doe', last_contact_date: null, school_id: 's1' } as Coach
    ]);

    const { stats } = useCoachListStats(coaches);

    expect(stats.value[3].value).toBe(1); // Counted in "Need Follow-up"
  });
});
