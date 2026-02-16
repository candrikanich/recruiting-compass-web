# Summary Tiles Design - Replicating Interactions Page Layout Pattern

**Date:** 2026-02-15
**Author:** Design Session (Brainstorming)
**Status:** Approved

## Overview

Replicate the interactions page layout pattern (summary tiles → filters → cards) to the schools, coaches, and events pages. This will provide users with quick, at-a-glance statistics before they interact with filters or detailed data.

## Current State

### Interactions Page (Reference Pattern)
- ✅ AnalyticsCards component showing 4 metrics (Total, Outbound, Inbound, This Week)
- ✅ Filter bar below summary tiles
- ✅ Interaction cards below filters

### Pages to Update
- ❌ **Schools**: No summary tiles (only filters → results count → cards)
- ❌ **Coaches**: No summary tiles (only filters → results count → cards)
- ❌ **Events**: No summary tiles (only filters → calendar/cards)

## Design Goals

1. Create a reusable, generic component for summary statistics
2. Maintain visual consistency across all pages
3. Provide meaningful, actionable metrics for each domain
4. Ensure accessibility and responsive design
5. Keep implementation DRY and maintainable

---

## Architecture & Component Structure

### Approach: Generic StatsTiles Component

**Selected Approach:** Create a single reusable `StatsTiles.vue` component that accepts an array of stat objects.

**Location:** `/components/shared/StatsTiles.vue`

**Component Props:**
```typescript
interface StatTile {
  label: string;           // e.g., "Total Schools"
  value: number | string;  // e.g., 35 or "35"
  icon?: Component;        // Optional Heroicon component
  color?: 'blue' | 'amber' | 'green' | 'purple' | 'slate'; // Tile accent color
  testId?: string;         // For testing
}

props: {
  stats: StatTile[];       // Array of 2-4 tiles
  ariaLabel?: string;      // Default: "Statistics"
}
```

**Visual Design:**
- Grid layout: 2 columns on mobile, 4 columns on desktop
- White cards with subtle shadows (matching existing design system)
- Each tile shows: icon (top-left), value (large, bold), label (small, muted)
- Hover effect: subtle shadow increase
- Screen reader friendly with proper ARIA labels

**Integration Pattern:**
Each page will:
1. Create a composable (e.g., `useSchoolStats`, `useCoachStats`, `useEventStats`)
2. Compute the stat values reactively based on filtered/all data
3. Pass stats array to `<StatsTiles :stats="..." />`

**Why This Approach?**
- ✅ Single source of truth for tile styling
- ✅ Maximum reusability across all pages
- ✅ Easy to maintain and update
- ✅ Minimal code duplication
- ✅ Flexible enough for future pages

**Alternatives Considered:**
- ❌ Extend existing AnalyticsCards - too interaction-specific, high refactor risk
- ❌ Domain-specific components - violates DRY, harder to maintain

---

## Component Implementation

### StatsTiles.vue Structure

```vue
<template>
  <div
    role="region"
    :aria-label="ariaLabel || 'Statistics'"
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

### New Composables to Create

1. **`/composables/useSchoolStats.ts`** - Returns: Total, Favorites, Tier A, Visited
2. **`/composables/useCoachStats.ts`** - Returns: Total, Head Coaches, Recent Contacts, Need Follow-up
3. **`/composables/useEventStats.ts`** - Returns: Total, Upcoming, Registered, Attended

Each composable returns:
```typescript
{
  stats: ComputedRef<StatTile[]>
}
```

### Page Layout Pattern

Each page will follow this structure (using schools as example):

```vue
<PageHeader ... />
<main>
  <!-- NEW: Summary Tiles -->
  <StatsTiles :stats="schoolStats" />

  <!-- EXISTING: Filter Panel -->
  <SchoolsFilterPanel ... />

  <!-- EXISTING: Results/Cards -->
  <SchoolListCard ... />
</main>
```

---

## Data Flow & Calculation Logic

### Metrics Per Page

#### Schools Page
- **Total Schools**: Count of all schools
- **Favorites**: Count of `is_favorite === true`
- **Tier A**: Count of `priority_tier === 'A'`
- **Visited**: Count of schools with `visit_date !== null`

#### Coaches Page
- **Total Coaches**: Count of all coaches
- **Head Coaches**: Count of `role === 'head_coach'`
- **Recent Contacts**: Count of coaches with `last_contact_date` in last 7 days
- **Need Follow-up**: Count of coaches with `last_contact_date` > 30 days ago OR null

#### Events Page
- **Total Events**: Count of all events
- **Upcoming**: Count of events with `start_date >= today`
- **Registered**: Count of `registered === true && attended === false`
- **Attended**: Count of `attended === true`

### useSchoolStats Implementation

```typescript
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

### useCoachStats Implementation

```typescript
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

### useEventStats Implementation

```typescript
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

**Key Points:**
- All stats are computed reactively - they update automatically when data changes
- Date calculations use proper timezone handling
- Stats show counts from ALL items (not just filtered), matching the interactions page pattern
- Composables are simple, focused, and testable

---

## Error Handling & Edge Cases

### StatsTiles Component
- **Empty stats array**: Renders nothing gracefully
- **Missing icons**: Shows tile without icon
- **Invalid color**: Fallback to 'blue'
- **Missing testId**: No test ID attribute added

### Composables

**useSchoolStats:**
- Empty schools array → all stats show 0
- Missing `priority_tier` → not counted in Tier A
- Missing `is_favorite` → treated as false
- Missing `visit_date` → not counted in Visited

**useCoachStats:**
- Empty coaches array → all stats show 0
- Missing `role` → not counted in Head Coaches
- Null `last_contact_date` → counted in "Need Follow-up"
- Invalid date formats → filtered out safely

**useEventStats:**
- Empty events array → all stats show 0
- Missing `registered`/`attended` → treated as false
- Invalid `start_date` → filtered out safely
- Upcoming calculation handles timezone correctly

### Defensive Patterns
```typescript
// Safe date comparison
c.last_contact_date && new Date(c.last_contact_date) >= sevenDaysAgo

// Safe null handling
s.visit_date !== null

// Safe boolean checks
e.registered && !e.attended
```

---

## Testing Strategy

### Unit Tests

#### `StatsTiles.test.ts`
```typescript
describe('StatsTiles', () => {
  it('renders correct number of tiles', () => {
    // Test with 2, 3, 4 tiles
  });

  it('displays labels and values correctly', () => {
    // Verify text content
  });

  it('shows icons when provided', () => {
    // Check icon components render
  });

  it('applies correct color classes', () => {
    // Test each color variant
  });

  it('has proper ARIA attributes', () => {
    // Verify accessibility
  });

  it('handles empty stats array', () => {
    // Should render nothing gracefully
  });
});
```

#### `useSchoolStats.test.ts`
```typescript
describe('useSchoolStats', () => {
  it('calculates total schools correctly', () => {
    // Test with 0, 1, many schools
  });

  it('counts favorites accurately', () => {
    // Test is_favorite filter
  });

  it('filters Tier A schools', () => {
    // Test priority_tier === 'A'
  });

  it('counts visited schools', () => {
    // Test visit_date !== null
  });

  it('handles missing fields gracefully', () => {
    // Schools without priority_tier, is_favorite, visit_date
  });
});
```

#### `useCoachStats.test.ts`
```typescript
describe('useCoachStats', () => {
  it('calculates total coaches correctly', () => {
    // Test with 0, 1, many coaches
  });

  it('filters head coaches by role', () => {
    // Test role === 'head_coach'
  });

  it('identifies recent contacts (last 7 days)', () => {
    // Test date range calculation
  });

  it('identifies coaches needing follow-up (30+ days)', () => {
    // Test date comparison and null handling
  });

  it('handles null last_contact_date', () => {
    // Should count as needs follow-up
  });
});
```

#### `useEventStats.test.ts`
```typescript
describe('useEventStats', () => {
  it('calculates total events correctly', () => {
    // Test with 0, 1, many events
  });

  it('counts upcoming events (future dates)', () => {
    // Test date comparison
  });

  it('counts registered but not attended', () => {
    // Test boolean logic
  });

  it('counts attended events', () => {
    // Test attended flag
  });

  it('handles timezone correctly for upcoming calculation', () => {
    // Ensure today comparison is accurate
  });
});
```

### E2E Tests (Optional Enhancement)

```typescript
test('schools page displays summary tiles', async ({ page }) => {
  await page.goto('/schools');
  await expect(page.getByTestId('stat-total-schools')).toBeVisible();
  await expect(page.getByTestId('stat-favorites')).toBeVisible();
  await expect(page.getByTestId('stat-tier-a')).toBeVisible();
  await expect(page.getByTestId('stat-visited')).toBeVisible();
});

test('coaches page displays summary tiles', async ({ page }) => {
  await page.goto('/coaches');
  await expect(page.getByTestId('stat-total-coaches')).toBeVisible();
  await expect(page.getByTestId('stat-head-coaches')).toBeVisible();
  await expect(page.getByTestId('stat-recent-contacts')).toBeVisible();
  await expect(page.getByTestId('stat-need-followup')).toBeVisible();
});

test('events page displays summary tiles', async ({ page }) => {
  await page.goto('/events');
  await expect(page.getByTestId('stat-total-events')).toBeVisible();
  await expect(page.getByTestId('stat-upcoming')).toBeVisible();
  await expect(page.getByTestId('stat-registered')).toBeVisible();
  await expect(page.getByTestId('stat-attended')).toBeVisible();
});
```

### Coverage Goals
- Component: 100% (simple presentation component)
- Composables: 95%+ (cover all calculation branches)
- E2E: Critical user flows verified

---

## Implementation Files

### Files to Create
1. `/components/shared/StatsTiles.vue` - Generic tile component
2. `/composables/useSchoolStats.ts` - Schools statistics composable
3. `/composables/useCoachStats.ts` - Coaches statistics composable
4. `/composables/useEventStats.ts` - Events statistics composable
5. `/tests/components/shared/StatsTiles.test.ts` - Component tests
6. `/tests/composables/useSchoolStats.test.ts` - Unit tests
7. `/tests/composables/useCoachStats.test.ts` - Unit tests
8. `/tests/composables/useEventStats.test.ts` - Unit tests

### Files to Modify
1. `/pages/schools/index.vue` - Add StatsTiles + useSchoolStats
2. `/pages/coaches/index.vue` - Add StatsTiles + useCoachStats
3. `/pages/events/index.vue` - Add StatsTiles + useEventStats

---

## Success Criteria

✅ **Functional:**
- Summary tiles display correct counts on all three pages
- Tiles update reactively when data changes
- All calculations handle edge cases (null, undefined, empty arrays)

✅ **Visual:**
- Tiles match the interactions page design language
- Layout is responsive (2 cols mobile, 4 cols desktop)
- Hover states work consistently
- Icons render with correct colors

✅ **Accessibility:**
- Proper ARIA labels on tile containers
- Screen readers announce stats correctly
- Color is not the only indicator of meaning

✅ **Code Quality:**
- No code duplication
- Components are reusable
- TypeScript strict mode passes
- All tests pass with 80%+ coverage

---

## Future Enhancements (Out of Scope)

- Click-to-filter: Click a tile to auto-filter (e.g., click "Favorites" → filter to favorites)
- Trend indicators: Show +/- changes from last week/month
- Export stats: Include summary stats in CSV/PDF exports
- Customization: Allow users to configure which stats appear
- Animation: Add count-up animation on initial render

---

## Approval

**Design Status:** ✅ Approved
**Ready for Implementation:** Yes
**Next Step:** Create detailed implementation plan using writing-plans skill
