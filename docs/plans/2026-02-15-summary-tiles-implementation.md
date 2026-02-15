# Summary Tiles Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add summary statistics tiles to schools, coaches, and events pages matching the interactions page pattern.

**Architecture:** Create one generic `StatsTiles.vue` component and three domain-specific composables (`useSchoolStats`, `useCoachStats`, `useEventStats`) that compute reactive statistics. Each page integrates the component above its filters.

**Tech Stack:** Vue 3 Composition API, TypeScript, Vitest, Heroicons, TailwindCSS

---

## Task 1: Create StatsTiles Component (TDD)

**Files:**
- Create: `components/shared/StatsTiles.vue`
- Create: `tests/components/shared/StatsTiles.test.ts`

### Step 1: Write failing test for StatsTiles component

Create test file:

```typescript
// tests/components/shared/StatsTiles.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StatsTiles from '~/components/shared/StatsTiles.vue';
import { AcademicCapIcon, StarIcon } from '@heroicons/vue/24/outline';

describe('StatsTiles', () => {
  it('renders correct number of tiles', () => {
    const stats = [
      { label: 'Total', value: 10, icon: AcademicCapIcon, color: 'blue' as const },
      { label: 'Favorites', value: 5, icon: StarIcon, color: 'amber' as const }
    ];

    const wrapper = mount(StatsTiles, {
      props: { stats }
    });

    const tiles = wrapper.findAll('[data-testid]');
    expect(tiles).toHaveLength(2);
  });

  it('displays labels and values correctly', () => {
    const stats = [
      { label: 'Total Schools', value: 35, testId: 'stat-total' }
    ];

    const wrapper = mount(StatsTiles, {
      props: { stats }
    });

    expect(wrapper.text()).toContain('Total Schools');
    expect(wrapper.text()).toContain('35');
  });

  it('applies correct color classes to icons', () => {
    const stats = [
      { label: 'Test', value: 1, icon: AcademicCapIcon, color: 'amber' as const }
    ];

    const wrapper = mount(StatsTiles, {
      props: { stats }
    });

    const icon = wrapper.find('svg');
    expect(icon.classes()).toContain('text-amber-600');
  });

  it('has proper ARIA attributes', () => {
    const stats = [{ label: 'Total', value: 10 }];

    const wrapper = mount(StatsTiles, {
      props: { stats, ariaLabel: 'Test Statistics' }
    });

    const container = wrapper.find('[role="region"]');
    expect(container.attributes('aria-label')).toBe('Test Statistics');
  });

  it('handles empty stats array gracefully', () => {
    const wrapper = mount(StatsTiles, {
      props: { stats: [] }
    });

    expect(wrapper.html()).toBeTruthy();
    const tiles = wrapper.findAll('[data-testid]');
    expect(tiles).toHaveLength(0);
  });

  it('shows tiles without icons when icon is missing', () => {
    const stats = [
      { label: 'Total', value: 10, testId: 'stat-total' }
    ];

    const wrapper = mount(StatsTiles, {
      props: { stats }
    });

    expect(wrapper.text()).toContain('Total');
    expect(wrapper.text()).toContain('10');
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm test tests/components/shared/StatsTiles.test.ts
```

**Expected:** FAIL - "Cannot find module '~/components/shared/StatsTiles.vue'"

### Step 3: Create StatsTiles component

```vue
<!-- components/shared/StatsTiles.vue -->
<template>
  <div
    v-if="stats.length > 0"
    role="region"
    :aria-label="ariaLabel"
    class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
  >
    <div
      v-for="(stat, index) in stats"
      :key="index"
      :data-testid="stat.testId"
      class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition"
    >
      <div class="flex items-center justify-between mb-3">
        <component
          v-if="stat.icon"
          :is="stat.icon"
          :class="getIconClass(stat.color)"
          class="w-8 h-8"
          aria-hidden="true"
        />
      </div>
      <div class="text-3xl font-bold text-slate-900 mb-1">
        {{ stat.value }}
      </div>
      <div class="text-sm text-slate-600">
        {{ stat.label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

interface StatTile {
  label: string;
  value: number | string;
  icon?: Component;
  color?: 'blue' | 'amber' | 'green' | 'purple' | 'slate';
  testId?: string;
}

interface Props {
  stats: StatTile[];
  ariaLabel?: string;
}

withDefaults(defineProps<Props>(), {
  ariaLabel: 'Statistics'
});

const getIconClass = (color?: string): string => {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    slate: 'text-slate-600'
  };
  return colorMap[color || 'blue'] || 'text-blue-600';
};
</script>
```

### Step 4: Run test to verify it passes

```bash
npm test tests/components/shared/StatsTiles.test.ts
```

**Expected:** PASS - All tests green

### Step 5: Commit StatsTiles component

```bash
git add components/shared/StatsTiles.vue tests/components/shared/StatsTiles.test.ts
git commit -m "feat: add generic StatsTiles component with tests"
```

---

## Task 2: Create useSchoolStats Composable (TDD)

**Files:**
- Create: `composables/useSchoolStats.ts`
- Create: `tests/composables/useSchoolStats.test.ts`

### Step 1: Write failing test for useSchoolStats

```typescript
// tests/composables/useSchoolStats.test.ts
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
```

### Step 2: Run test to verify it fails

```bash
npm test tests/composables/useSchoolStats.test.ts
```

**Expected:** FAIL - "Cannot find module '~/composables/useSchoolStats'"

### Step 3: Create useSchoolStats composable

```typescript
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
      value: schools.value.filter(s => s.visit_date !== null).length,
      icon: MapPinIcon,
      color: 'green' as const,
      testId: 'stat-visited'
    }
  ]);

  return { stats };
}
```

### Step 4: Run test to verify it passes

```bash
npm test tests/composables/useSchoolStats.test.ts
```

**Expected:** PASS - All tests green

### Step 5: Commit useSchoolStats composable

```bash
git add composables/useSchoolStats.ts tests/composables/useSchoolStats.test.ts
git commit -m "feat: add useSchoolStats composable with tests"
```

---

## Task 3: Create useCoachStats Composable (TDD)

**Files:**
- Create: `composables/useCoachStats.ts`
- Create: `tests/composables/useCoachStats.test.ts`

### Step 1: Write failing test for useCoachStats

```typescript
// tests/composables/useCoachStats.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { useCoachStats } from '~/composables/useCoachStats';
import type { Coach } from '~/types/models';

describe('useCoachStats', () => {
  beforeEach(() => {
    // Mock current date to 2026-02-15
    vi.setSystemTime(new Date('2026-02-15T12:00:00Z'));
  });

  it('calculates total coaches correctly', () => {
    const coaches = ref<Coach[]>([
      { id: '1', first_name: 'John', last_name: 'Doe', school_id: 's1' } as Coach,
      { id: '2', first_name: 'Jane', last_name: 'Smith', school_id: 's1' } as Coach
    ]);

    const { stats } = useCoachStats(coaches);

    expect(stats.value[0].label).toBe('Total Coaches');
    expect(stats.value[0].value).toBe(2);
  });

  it('filters head coaches by role', () => {
    const coaches = ref<Coach[]>([
      { id: '1', first_name: 'John', last_name: 'Doe', role: 'head_coach', school_id: 's1' } as Coach,
      { id: '2', first_name: 'Jane', last_name: 'Smith', role: 'assistant_coach', school_id: 's1' } as Coach,
      { id: '3', first_name: 'Bob', last_name: 'Johnson', role: 'head_coach', school_id: 's1' } as Coach
    ]);

    const { stats } = useCoachStats(coaches);

    expect(stats.value[1].label).toBe('Head Coaches');
    expect(stats.value[1].value).toBe(2);
  });

  it('identifies recent contacts (last 7 days)', () => {
    const coaches = ref<Coach[]>([
      { id: '1', first_name: 'John', last_name: 'Doe', last_contact_date: '2026-02-14', school_id: 's1' } as Coach,
      { id: '2', first_name: 'Jane', last_name: 'Smith', last_contact_date: '2026-02-01', school_id: 's1' } as Coach,
      { id: '3', first_name: 'Bob', last_name: 'Johnson', last_contact_date: '2026-02-10', school_id: 's1' } as Coach
    ]);

    const { stats } = useCoachStats(coaches);

    expect(stats.value[2].label).toBe('Recent Contacts');
    expect(stats.value[2].value).toBe(2); // Feb 14 and Feb 10 are within 7 days
  });

  it('identifies coaches needing follow-up (30+ days)', () => {
    const coaches = ref<Coach[]>([
      { id: '1', first_name: 'John', last_name: 'Doe', last_contact_date: '2026-01-01', school_id: 's1' } as Coach,
      { id: '2', first_name: 'Jane', last_name: 'Smith', last_contact_date: '2026-02-10', school_id: 's1' } as Coach,
      { id: '3', first_name: 'Bob', last_name: 'Johnson', last_contact_date: null, school_id: 's1' } as Coach
    ]);

    const { stats } = useCoachStats(coaches);

    expect(stats.value[3].label).toBe('Need Follow-up');
    expect(stats.value[3].value).toBe(2); // Jan 1 and null
  });

  it('handles empty coaches array', () => {
    const coaches = ref<Coach[]>([]);

    const { stats } = useCoachStats(coaches);

    expect(stats.value[0].value).toBe(0);
    expect(stats.value[1].value).toBe(0);
    expect(stats.value[2].value).toBe(0);
    expect(stats.value[3].value).toBe(0);
  });

  it('handles null last_contact_date', () => {
    const coaches = ref<Coach[]>([
      { id: '1', first_name: 'John', last_name: 'Doe', last_contact_date: null, school_id: 's1' } as Coach
    ]);

    const { stats } = useCoachStats(coaches);

    expect(stats.value[3].value).toBe(1); // Counted in "Need Follow-up"
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm test tests/composables/useCoachStats.test.ts
```

**Expected:** FAIL - "Cannot find module '~/composables/useCoachStats'"

### Step 3: Create useCoachStats composable

```typescript
// composables/useCoachStats.ts
import { computed } from 'vue';
import type { Ref } from 'vue';
import type { Coach } from '~/types/models';
import {
  UserGroupIcon,
  StarIcon,
  ChatBubbleLeftIcon,
  ClockIcon
} from '@heroicons/vue/24/outline';

export function useCoachStats(coaches: Ref<Coach[]>) {
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
        value: coaches.value.filter(c => c.role === 'head_coach').length,
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
```

### Step 4: Run test to verify it passes

```bash
npm test tests/composables/useCoachStats.test.ts
```

**Expected:** PASS - All tests green

### Step 5: Commit useCoachStats composable

```bash
git add composables/useCoachStats.ts tests/composables/useCoachStats.test.ts
git commit -m "feat: add useCoachStats composable with tests"
```

---

## Task 4: Create useEventStats Composable (TDD)

**Files:**
- Create: `composables/useEventStats.ts`
- Create: `tests/composables/useEventStats.test.ts`

### Step 1: Write failing test for useEventStats

```typescript
// tests/composables/useEventStats.test.ts
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
```

### Step 2: Run test to verify it fails

```bash
npm test tests/composables/useEventStats.test.ts
```

**Expected:** FAIL - "Cannot find module '~/composables/useEventStats'"

### Step 3: Create useEventStats composable

```typescript
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
        value: events.value.filter(e => new Date(e.start_date) >= today).length,
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
```

### Step 4: Run test to verify it passes

```bash
npm test tests/composables/useEventStats.test.ts
```

**Expected:** PASS - All tests green

### Step 5: Commit useEventStats composable

```bash
git add composables/useEventStats.ts tests/composables/useEventStats.test.ts
git commit -m "feat: add useEventStats composable with tests"
```

---

## Task 5: Integrate StatsTiles into Schools Page

**Files:**
- Modify: `pages/schools/index.vue`

### Step 1: Add import statements and composable

At the top of the `<script setup>` section (around line 204), add:

```typescript
import StatsTiles from '~/components/shared/StatsTiles.vue';
import { useSchoolStats } from '~/composables/useSchoolStats';
```

### Step 2: Use the composable

After the existing composables (around line 250), add:

```typescript
const { stats: schoolStats } = useSchoolStats(
  computed(() => schools.value)
);
```

### Step 3: Add StatsTiles component to template

In the `<main>` section, add the StatsTiles component right after the opening `<main>` tag and before the filter panel (around line 39):

```vue
<main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
  <!-- Summary Tiles -->
  <StatsTiles :stats="schoolStats" aria-label="Schools Statistics" />

  <!-- Filter Panel -->
  <SchoolsFilterPanel
```

### Step 4: Verify in browser

```bash
npm run dev
```

Navigate to http://localhost:3000/schools and verify:
- 4 summary tiles appear at the top
- Tiles show: Total Schools, Favorites, Tier A, Visited
- Icons and colors render correctly
- Layout is responsive (2 cols mobile, 4 cols desktop)

### Step 5: Commit schools page integration

```bash
git add pages/schools/index.vue
git commit -m "feat: integrate StatsTiles into schools page"
```

---

## Task 6: Integrate StatsTiles into Coaches Page

**Files:**
- Modify: `pages/coaches/index.vue`

### Step 1: Add import statements and composable

At the top of the `<script setup>` section (around line 467), add:

```typescript
import StatsTiles from '~/components/shared/StatsTiles.vue';
import { useCoachStats } from '~/composables/useCoachStats';
```

### Step 2: Use the composable

After the existing composables (around line 534), add:

```typescript
const { stats: coachStats } = useCoachStats(
  computed(() => allCoaches.value)
);
```

### Step 3: Add StatsTiles component to template

In the `<main>` section, add the StatsTiles component right after the opening `<main>` tag and before the filter bar (around line 56):

```vue
<main
  id="main-content"
  class="max-w-7xl mx-auto px-4 sm:px-6 py-8"
  :aria-busy="loading"
>
  <!-- Summary Tiles -->
  <StatsTiles :stats="coachStats" aria-label="Coaches Statistics" />

  <!-- Filter Bar -->
  <div
```

### Step 4: Verify in browser

Navigate to http://localhost:3000/coaches and verify:
- 4 summary tiles appear at the top
- Tiles show: Total Coaches, Head Coaches, Recent Contacts, Need Follow-up
- Icons and colors render correctly
- Date calculations work (check "Recent Contacts" and "Need Follow-up")

### Step 5: Commit coaches page integration

```bash
git add pages/coaches/index.vue
git commit -m "feat: integrate StatsTiles into coaches page"
```

---

## Task 7: Integrate StatsTiles into Events Page

**Files:**
- Modify: `pages/events/index.vue`

### Step 1: Add import statements and composable

At the top of the `<script setup>` section (around line 312), add:

```typescript
import StatsTiles from '~/components/shared/StatsTiles.vue';
import { useEventStats } from '~/composables/useEventStats';
```

### Step 2: Use the composable

After the existing composables (around line 342), add:

```typescript
const { stats: eventStats } = useEventStats(
  computed(() => events.value)
);
```

### Step 3: Add StatsTiles component to template

In the `<main>` section, add the StatsTiles component right after the opening `<main>` tag and before the filters card (around line 19):

```vue
<main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
  <!-- Summary Tiles -->
  <StatsTiles :stats="eventStats" aria-label="Events Statistics" />

  <!-- Filters Card -->
  <div
```

### Step 4: Verify in browser

Navigate to http://localhost:3000/events and verify:
- 4 summary tiles appear at the top
- Tiles show: Total Events, Upcoming, Registered, Attended
- Icons and colors render correctly
- "Upcoming" correctly shows future events based on today's date

### Step 5: Commit events page integration

```bash
git add pages/events/index.vue
git commit -m "feat: integrate StatsTiles into events page"
```

---

## Task 8: Verify All Pages in Browser

### Step 1: Test schools page thoroughly

Navigate to http://localhost:3000/schools:
- Verify tiles display correct counts
- Add a favorite school → verify "Favorites" count updates
- Change a school's priority tier to A → verify "Tier A" count updates
- Add a visit date → verify "Visited" count updates

### Step 2: Test coaches page thoroughly

Navigate to http://localhost:3000/coaches:
- Verify tiles display correct counts
- Check "Recent Contacts" shows coaches contacted in last 7 days
- Check "Need Follow-up" shows coaches with no contact or 30+ days ago
- Verify "Head Coaches" filters by role correctly

### Step 3: Test events page thoroughly

Navigate to http://localhost:3000/events:
- Verify tiles display correct counts
- Check "Upcoming" shows only future events
- Check "Registered" shows events with registered=true, attended=false
- Check "Attended" shows events with attended=true

### Step 4: Test responsive layout

Resize browser window to mobile width:
- Verify tiles switch to 2-column layout on mobile
- Verify tiles remain 4-column layout on desktop

### Step 5: Test accessibility

Use screen reader (or browser dev tools):
- Verify each tile section has proper aria-label
- Verify icons have aria-hidden="true"
- Tab through tiles and verify keyboard navigation works

---

## Task 9: Run Type Check and Lint

### Step 1: Run TypeScript type check

```bash
npm run type-check
```

**Expected:** No errors - all types pass

### Step 2: Run linter

```bash
npm run lint
```

**Expected:** No errors or warnings

### Step 3: Fix any issues

If type errors or lint warnings appear, fix them before proceeding.

### Step 4: Run all tests

```bash
npm test
```

**Expected:** All tests pass (5486+ tests)

---

## Task 10: Final Commit and Verification

### Step 1: Review all changes

```bash
git status
git diff develop
```

Verify:
- 3 new components/composables created
- 3 pages modified
- 4 test files created
- All changes follow project conventions

### Step 2: Run full test suite one more time

```bash
npm test
```

**Expected:** All tests pass

### Step 3: Verify build succeeds

```bash
npm run build
```

**Expected:** Build completes without errors

### Step 4: Create final summary commit (if needed)

If any final tweaks were made:

```bash
git add .
git commit -m "chore: final verification and cleanup for summary tiles"
```

### Step 5: Push to remote (optional)

```bash
git push origin develop
```

---

## Success Criteria Checklist

Before marking complete, verify:

✅ **Functional:**
- [ ] Summary tiles display on schools page with correct counts
- [ ] Summary tiles display on coaches page with correct counts
- [ ] Summary tiles display on events page with correct counts
- [ ] All stats update reactively when data changes
- [ ] Edge cases handled (null values, empty arrays, missing fields)

✅ **Visual:**
- [ ] Tiles match interactions page design language
- [ ] Layout responsive (2 cols mobile, 4 cols desktop)
- [ ] Hover effects work consistently
- [ ] Icons render with correct colors

✅ **Accessibility:**
- [ ] Proper ARIA labels on all tile containers
- [ ] Screen readers announce stats correctly
- [ ] Icons have aria-hidden="true"

✅ **Code Quality:**
- [ ] No code duplication
- [ ] TypeScript strict mode passes
- [ ] All tests pass (100% component, 95%+ composables)
- [ ] Linter passes with no warnings

---

## Rollback Plan

If issues arise during implementation:

1. **Revert last commit:**
   ```bash
   git reset --hard HEAD~1
   ```

2. **Revert specific file:**
   ```bash
   git checkout HEAD -- path/to/file.vue
   ```

3. **Start over from clean state:**
   ```bash
   git reset --hard develop
   ```

---

## Notes for Future Enhancements

Out of scope for this implementation but documented for future work:

1. **Click-to-filter**: Click a tile to auto-filter results
2. **Trend indicators**: Show +/- changes from previous week/month
3. **Export integration**: Include summary stats in CSV/PDF exports
4. **User customization**: Allow users to configure which stats appear
5. **Animations**: Add count-up animation on initial render
