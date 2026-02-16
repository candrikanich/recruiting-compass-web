// tests/unit/composables/useEventStats.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { useEventStats } from '~/composables/useEventStats';
import type { Event } from '~/types/models';

describe('useEventStats', () => {
  beforeEach(() => {
    // Mock current date to 2026-02-15
    vi.setSystemTime(new Date('2026-02-15T12:00:00Z'));
  });

  it('calculates total events correctly', () => {
    const events = ref<Event[]>([
      { id: '1', name: 'Event 1', start_date: '2026-03-01', family_unit_id: 'f1' } as Event,
      { id: '2', name: 'Event 2', start_date: '2026-04-01', family_unit_id: 'f1' } as Event
    ]);

    const { stats } = useEventStats(events);

    expect(stats.value[0].label).toBe('Total Events');
    expect(stats.value[0].value).toBe(2);
  });

  it('counts upcoming events (future dates)', () => {
    const events = ref<Event[]>([
      { id: '1', name: 'Event 1', start_date: '2026-03-01', family_unit_id: 'f1' } as Event,
      { id: '2', name: 'Event 2', start_date: '2026-01-01', family_unit_id: 'f1' } as Event,
      { id: '3', name: 'Event 3', start_date: '2026-02-20', family_unit_id: 'f1' } as Event
    ]);

    const { stats } = useEventStats(events);

    expect(stats.value[1].label).toBe('Upcoming');
    expect(stats.value[1].value).toBe(2); // March 1 and Feb 20
  });

  it('counts registered but not attended', () => {
    const events = ref<Event[]>([
      { id: '1', name: 'Event 1', start_date: '2026-03-01', registered: true, attended: false, family_unit_id: 'f1' } as Event,
      { id: '2', name: 'Event 2', start_date: '2026-03-02', registered: true, attended: true, family_unit_id: 'f1' } as Event,
      { id: '3', name: 'Event 3', start_date: '2026-03-03', registered: false, attended: false, family_unit_id: 'f1' } as Event
    ]);

    const { stats } = useEventStats(events);

    expect(stats.value[2].label).toBe('Registered');
    expect(stats.value[2].value).toBe(1);
  });

  it('counts attended events', () => {
    const events = ref<Event[]>([
      { id: '1', name: 'Event 1', start_date: '2026-01-01', attended: true, family_unit_id: 'f1' } as Event,
      { id: '2', name: 'Event 2', start_date: '2026-01-02', attended: false, family_unit_id: 'f1' } as Event,
      { id: '3', name: 'Event 3', start_date: '2026-01-03', attended: true, family_unit_id: 'f1' } as Event
    ]);

    const { stats } = useEventStats(events);

    expect(stats.value[3].label).toBe('Attended');
    expect(stats.value[3].value).toBe(2);
  });

  it('handles empty events array', () => {
    const events = ref<Event[]>([]);

    const { stats } = useEventStats(events);

    expect(stats.value[0].value).toBe(0);
    expect(stats.value[1].value).toBe(0);
    expect(stats.value[2].value).toBe(0);
    expect(stats.value[3].value).toBe(0);
  });

  it('handles timezone correctly for upcoming calculation', () => {
    const events = ref<Event[]>([
      { id: '1', name: 'Event 1', start_date: '2026-02-15', family_unit_id: 'f1' } as Event, // Today
      { id: '2', name: 'Event 2', start_date: '2026-02-16', family_unit_id: 'f1' } as Event  // Tomorrow
    ]);

    const { stats } = useEventStats(events);

    expect(stats.value[1].value).toBe(2); // Both today and tomorrow are upcoming
  });
});
