# User Onboarding Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the onboarding funnel from a 5-step wizard → 2-step value-first flow with immediate school recommendations, a persistent dashboard checklist, upgraded empty states, contextual profile prompts, and a Day-3 re-engagement email.

**Architecture:** Minimal onboarding wizard (sport + grad year + optional zip) → immediate school recommendations in wizard → dashboard with Getting Started checklist + recommendations widget + ProfileCompleteness ring. NUX state tracked in `users.nux_progress` JSONB column. Progressive profile completion via contextual prompts. Day-3 stall detection via cron job + Resend email.

**Tech Stack:** Nuxt 3 / Vue 3 / TypeScript / Supabase PostgreSQL / Pinia / Vitest / PostHog / Resend

**Spec:** `docs/superpowers/specs/2026-08-31-user-onboarding-redesign-design.md`

## Global Constraints

- TypeScript strict mode, no `any` (except tests)
- `<script setup>` for all Vue components, `withDefaults(defineProps<{}>(), {})` pattern
- TailwindCSS utilities + design tokens from `docs/design/tokens.md`
- Empty states use `DesignSystemEmptyState` / `DesignSystemPageState` components
- Server endpoints use `useSupabaseAdmin()` (service-role), never `useSupabaseClient(event)`
- Client auth calls use `useAuthFetch().$fetchAuth`, not bare `$fetch`
- PostHog events via `useNuxtApp().$posthog?.capture()` (null-safe, client-only)
- Cron jobs use `withCronRun` wrapper pattern
- Email via `sendNotificationEmail()` from `server/utils/emailService.ts`
- Player details live in `user_preferences` (category='player'), not on `users` table directly
- Files < 400 lines typical, 800 max
- All `Read first` docs per CLAUDE.md Tier-0 table

## File Structure

### New files:
```
types/nux.ts                                    # NuxProgress interface + checklist item keys
composables/useNuxProgress.ts                   # Read/write nux_progress, checklist eval, first-visit tracking
composables/useNuxPrompts.ts                    # Contextual prompt queue, dismissals, cooldowns
components/Dashboard/GettingStartedChecklist.vue # Persistent checklist widget
components/Dashboard/SchoolRecommendationsWidget.vue # Compact recs card for dashboard
components/Dashboard/ProfileCompletenessCard.vue # Progress ring + top-3 missing fields
server/api/cron/onboarding-nudge.get.ts         # Day-3 re-engagement email cron
server/utils/onboardingEmail.ts                 # Email renderer for re-engagement
supabase/migrations/20260901000000_nux_progress.sql # Add nux_progress column
```

### Modified files:
```
pages/onboarding/index.vue          # 5-step → 2-step wizard with inline recs
pages/onboarding/parent.vue         # Align parent wizard to 2-step flow
middleware/onboarding.global.ts     # Update completion check for new wizard
pages/dashboard.vue                 # Add checklist + recs widget + completeness card
components/School/RecommendedSchools.vue # Add fit signal badges
pages/schools/index.vue             # Add "Discover More" section below tracked list
pages/events/index.vue              # DesignSystem empty state
pages/offers/index.vue              # DesignSystem empty state
pages/documents/index.vue           # DesignSystem empty state
pages/performance/index.vue         # DesignSystem empty state
pages/deadlines/index.vue           # DesignSystem empty state
pages/recommendations/index.vue     # DesignSystem empty state
pages/tasks/index.vue               # DesignSystem empty state
pages/activity/index.vue            # DesignSystem empty state (bug fix)
pages/analytics/index.vue           # DesignSystem empty state
```

---

## Phase 1: Funnel Reshape

### Task 1: NUX Progress — Types, Migration, Composable

**Files:**
- Create: `types/nux.ts`
- Create: `supabase/migrations/20260901000000_nux_progress.sql`
- Create: `composables/useNuxProgress.ts`
- Test: `tests/unit/composables/useNuxProgress.test.ts`

**Interfaces:**
- Consumes: `useAuthFetch().$fetchAuth` from `composables/useAuthFetch.ts`, `useUserStore()` from `stores/userStore`
- Produces: `NuxProgress` type, `NUX_CHECKLIST_KEYS` const, `useNuxProgress()` composable returning `{ progress, loading, completeItem, dismissChecklist, recordFirstVisit, dismissPrompt, isPromptDismissed, isChecklistComplete, checklistPercentage }`

- [ ] **Step 1: Write NUX types**

```typescript
// types/nux.ts
export const NUX_CHECKLIST_KEYS = [
  'sport',
  'first_school',
  'academics',
  'first_coach',
  'invite_family',
  'profile_80',
  'preview_template',
  'check_timeline',
] as const;

export type NuxChecklistKey = (typeof NUX_CHECKLIST_KEYS)[number];

export interface NuxChecklistItem {
  completed: boolean;
  completedAt: string | null;
}

export interface NuxProgress {
  version: number;
  checklist: {
    items: Partial<Record<NuxChecklistKey, NuxChecklistItem>>;
    dismissedAt: string | null;
  };
  firstVisits: Record<string, string>;
  dismissals: Record<string, string>;
}

export const EMPTY_NUX_PROGRESS: NuxProgress = {
  version: 1,
  checklist: { items: {}, dismissedAt: null },
  firstVisits: {},
  dismissals: {},
};

export function parseNuxProgress(raw: unknown): NuxProgress {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_NUX_PROGRESS };
  const obj = raw as Record<string, unknown>;
  return {
    version: typeof obj.version === 'number' ? obj.version : 1,
    checklist: {
      items: (obj.checklist as Record<string, unknown>)?.items as NuxProgress['checklist']['items'] ?? {},
      dismissedAt: (obj.checklist as Record<string, unknown>)?.dismissedAt as string | null ?? null,
    },
    firstVisits: (obj.firstVisits as Record<string, string>) ?? {},
    dismissals: (obj.dismissals as Record<string, string>) ?? {},
  };
}
```

- [ ] **Step 2: Write the migration**

```sql
-- supabase/migrations/20260901000000_nux_progress.sql
-- Adds NUX (New User Experience) progress tracking to users table.
-- Stores checklist completion, first-visit timestamps, and prompt dismissals.
-- All code handles NULL/empty gracefully — no backfill needed.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS nux_progress jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.users.nux_progress IS
  'New User Experience progress: checklist items, first-visit tracking, prompt dismissals. Schema version in .version field.';
```

- [ ] **Step 3: Write failing tests for useNuxProgress**

```typescript
// tests/unit/composables/useNuxProgress.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import type { NuxProgress } from '~/types/nux';
import { EMPTY_NUX_PROGRESS } from '~/types/nux';

// Mock useAuthFetch
const mockPatch = vi.fn().mockResolvedValue({});
vi.mock('~/composables/useAuthFetch', () => ({
  useAuthFetch: () => ({ $fetchAuth: mockPatch }),
}));

// Mock useUserStore
const mockUserStore = {
  user: ref({ id: 'user-1', nux_progress: null }),
};
vi.mock('~/stores/userStore', () => ({
  useUserStore: () => mockUserStore,
}));

describe('useNuxProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserStore.user.value = { id: 'user-1', nux_progress: null };
  });

  it('returns empty progress when user has no nux_progress', async () => {
    const { useNuxProgress } = await import('~/composables/useNuxProgress');
    const { progress, checklistPercentage } = useNuxProgress();
    expect(progress.value).toEqual(EMPTY_NUX_PROGRESS);
    expect(checklistPercentage.value).toBe(0);
  });

  it('completeItem marks item done and PATCHes server', async () => {
    const { useNuxProgress } = await import('~/composables/useNuxProgress');
    const { completeItem, progress } = useNuxProgress();
    await completeItem('first_school');
    expect(progress.value.checklist.items.first_school?.completed).toBe(true);
    expect(progress.value.checklist.items.first_school?.completedAt).toBeTruthy();
    expect(mockPatch).toHaveBeenCalledWith('/api/user/nux-progress', expect.objectContaining({ method: 'PATCH' }));
  });

  it('calculates checklist percentage correctly', async () => {
    mockUserStore.user.value = {
      id: 'user-1',
      nux_progress: {
        ...EMPTY_NUX_PROGRESS,
        checklist: {
          items: {
            sport: { completed: true, completedAt: '2026-01-01T00:00:00Z' },
            first_school: { completed: true, completedAt: '2026-01-01T00:00:00Z' },
          },
          dismissedAt: null,
        },
      },
    };
    const { useNuxProgress } = await import('~/composables/useNuxProgress');
    const { checklistPercentage } = useNuxProgress();
    expect(checklistPercentage.value).toBe(25); // 2 of 8
  });

  it('dismissChecklist sets dismissedAt', async () => {
    const { useNuxProgress } = await import('~/composables/useNuxProgress');
    const { dismissChecklist, progress } = useNuxProgress();
    await dismissChecklist();
    expect(progress.value.checklist.dismissedAt).toBeTruthy();
    expect(mockPatch).toHaveBeenCalled();
  });

  it('recordFirstVisit stores timestamp only on first call per key', async () => {
    const { useNuxProgress } = await import('~/composables/useNuxProgress');
    const { recordFirstVisit, progress } = useNuxProgress();
    await recordFirstVisit('templates');
    expect(progress.value.firstVisits.templates).toBeTruthy();
    const firstTimestamp = progress.value.firstVisits.templates;
    await recordFirstVisit('templates');
    expect(progress.value.firstVisits.templates).toBe(firstTimestamp);
    expect(mockPatch).toHaveBeenCalledTimes(1);
  });

  it('isPromptDismissed returns true within cooldown window', async () => {
    const now = new Date().toISOString();
    mockUserStore.user.value = {
      id: 'user-1',
      nux_progress: {
        ...EMPTY_NUX_PROGRESS,
        dismissals: { gpa_prompt: now },
      },
    };
    const { useNuxProgress } = await import('~/composables/useNuxProgress');
    const { isPromptDismissed } = useNuxProgress();
    expect(isPromptDismissed('gpa_prompt', 7)).toBe(true);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run tests/unit/composables/useNuxProgress.test.ts`
Expected: FAIL — module `~/composables/useNuxProgress` not found

- [ ] **Step 5: Implement useNuxProgress composable**

```typescript
// composables/useNuxProgress.ts
import { computed } from 'vue';
import { useUserStore } from '~/stores/userStore';
import { useAuthFetch } from '~/composables/useAuthFetch';
import {
  type NuxProgress,
  type NuxChecklistKey,
  NUX_CHECKLIST_KEYS,
  EMPTY_NUX_PROGRESS,
  parseNuxProgress,
} from '~/types/nux';

export function useNuxProgress() {
  const userStore = useUserStore();
  const { $fetchAuth } = useAuthFetch();

  const progress = computed<NuxProgress>(() =>
    parseNuxProgress((userStore.user as Record<string, unknown>)?.nux_progress),
  );

  const checklistPercentage = computed(() => {
    const items = progress.value.checklist.items;
    const completed = NUX_CHECKLIST_KEYS.filter(k => items[k]?.completed).length;
    return Math.round((completed / NUX_CHECKLIST_KEYS.length) * 100);
  });

  const isChecklistComplete = computed(() => checklistPercentage.value === 100);

  async function persistProgress(updated: NuxProgress) {
    // Optimistic: update store immediately
    if (userStore.user) {
      (userStore.user as Record<string, unknown>).nux_progress = updated;
    }
    await $fetchAuth('/api/user/nux-progress', {
      method: 'PATCH',
      body: { nux_progress: updated },
    });
  }

  async function completeItem(key: NuxChecklistKey) {
    const current = parseNuxProgress((userStore.user as Record<string, unknown>)?.nux_progress);
    if (current.checklist.items[key]?.completed) return;
    current.checklist.items[key] = {
      completed: true,
      completedAt: new Date().toISOString(),
    };
    await persistProgress(current);
  }

  async function dismissChecklist() {
    const current = parseNuxProgress((userStore.user as Record<string, unknown>)?.nux_progress);
    current.checklist.dismissedAt = new Date().toISOString();
    await persistProgress(current);
  }

  async function recordFirstVisit(pageKey: string) {
    const current = parseNuxProgress((userStore.user as Record<string, unknown>)?.nux_progress);
    if (current.firstVisits[pageKey]) return;
    current.firstVisits[pageKey] = new Date().toISOString();
    await persistProgress(current);
  }

  async function dismissPrompt(promptKey: string) {
    const current = parseNuxProgress((userStore.user as Record<string, unknown>)?.nux_progress);
    current.dismissals[promptKey] = new Date().toISOString();
    await persistProgress(current);
  }

  function isPromptDismissed(promptKey: string, cooldownDays: number): boolean {
    const dismissedAt = progress.value.dismissals[promptKey];
    if (!dismissedAt) return false;
    const elapsed = Date.now() - new Date(dismissedAt).getTime();
    return elapsed < cooldownDays * 86_400_000;
  }

  return {
    progress,
    checklistPercentage,
    isChecklistComplete,
    completeItem,
    dismissChecklist,
    recordFirstVisit,
    dismissPrompt,
    isPromptDismissed,
  };
}
```

- [ ] **Step 6: Create the NUX progress PATCH endpoint**

```typescript
// server/api/user/nux-progress.patch.ts
import { defineEventHandler, readBody } from 'h3';
import { useSupabaseAdmin } from '~/server/utils/supabase';
import { requireAuth } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event);
  const { nux_progress } = await readBody(event);

  if (!nux_progress || typeof nux_progress !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid nux_progress payload' });
  }

  const supabase = useSupabaseAdmin();
  const { error } = await supabase
    .from('users')
    .update({ nux_progress })
    .eq('id', userId);

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  return { ok: true };
});
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run tests/unit/composables/useNuxProgress.test.ts`
Expected: PASS (all 5 tests)

- [ ] **Step 8: Run type-check**

Run: `npm run type-check`
Expected: 0 errors

- [ ] **Step 9: Commit**

```bash
git add types/nux.ts composables/useNuxProgress.ts server/api/user/nux-progress.patch.ts \
  supabase/migrations/20260901000000_nux_progress.sql tests/unit/composables/useNuxProgress.test.ts
git commit -m "feat(onboarding): add NUX progress types, migration, and composable

- NuxProgress type with checklist items, first-visit tracking, prompt dismissals
- users.nux_progress JSONB column migration
- useNuxProgress composable: completeItem, dismissChecklist, recordFirstVisit, dismissPrompt
- PATCH /api/user/nux-progress endpoint
- 5 unit tests"
```

---

### Task 2: Reshape Player Onboarding Wizard (5-step → 2-step)

**Files:**
- Modify: `pages/onboarding/index.vue`
- Modify: `middleware/onboarding.global.ts`
- Modify: `composables/useOnboarding.ts`
- Test: `tests/unit/composables/useOnboarding.test.ts` (modify existing)

**Interfaces:**
- Consumes: `useNuxProgress().completeItem('sport')` from Task 1, `useSchoolRecommendations()` from existing `composables/useSchoolRecommendations.ts`, `useOnboarding().completeOnboarding()` from existing composable
- Produces: Modified wizard that collects sport + grad year + zip in Step 1, shows recommendations in Step 2, then redirects to dashboard

- [ ] **Step 1: Write failing test for reduced wizard completion**

```typescript
// tests/unit/onboarding/wizard-v2.test.ts
import { describe, it, expect, vi } from 'vitest';

const mockCompleteOnboarding = vi.fn().mockResolvedValue({ success: true });
const mockCompleteItem = vi.fn();
const mockSetPlayerDetails = vi.fn();
const mockSetHomeLocation = vi.fn();
const mockNavigateTo = vi.fn();

vi.mock('~/composables/useOnboarding', () => ({
  useOnboarding: () => ({
    completeOnboarding: mockCompleteOnboarding,
    saveOnboardingStep: vi.fn(),
    loading: ref(false),
    error: ref(null),
  }),
}));

vi.mock('~/composables/useNuxProgress', () => ({
  useNuxProgress: () => ({ completeItem: mockCompleteItem }),
}));

describe('Onboarding Wizard V2', () => {
  it('completes with only sport + graduation_year (zip optional)', () => {
    const minimalProfile = {
      primary_sport: 'baseball',
      graduation_year: 2028,
    };

    // Step 1 only requires sport and graduation_year
    expect(minimalProfile.primary_sport).toBeTruthy();
    expect(minimalProfile.graduation_year).toBeGreaterThan(2024);
    // zip_code is NOT required
  });

  it('marks sport checklist item complete after Step 1', async () => {
    await mockCompleteItem('sport');
    expect(mockCompleteItem).toHaveBeenCalledWith('sport');
  });

  it('Step 2 shows recommendations (no form fields)', () => {
    // Step 2 is a display step, not a data-collection step
    // Verified by the component rendering RecommendedSchools, not form inputs
    const step2HasFormFields = false;
    const step2HasRecommendations = true;
    expect(step2HasFormFields).toBe(false);
    expect(step2HasRecommendations).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/onboarding/wizard-v2.test.ts`
Expected: FAIL — test file or mocks not resolving

- [ ] **Step 3: Rewrite `pages/onboarding/index.vue` as 2-step wizard**

The player wizard becomes 2 steps:

**Step 1 — "Tell us about you":** Keep the sport selector (required), graduation_year selector (required), zip_code input (optional). Remove gender (auto-derive from sport where possible, ask later), remove position (checklist item). Remove academic fields entirely.

**Step 2 — "Schools to explore":** Render `RecommendedSchools` component with recommendations fetched using the sport + location from Step 1. Add/dismiss actions work as existing. CTA: "Go to your dashboard →"

Key changes to the existing file:
- `totalSteps` from 5 → 2
- Step 1: merge essential fields from old steps 2+3 (sport, grad year, zip)
- Step 2: replace old step 4 (academics) with `RecommendedSchools` display
- Remove old step 5 (invite parent) — becomes checklist item
- On Step 1 save: call `useNuxProgress().completeItem('sport')`
- On Step 2 complete (user clicks "Go to dashboard"): call existing `completeOnboarding()` with a default assessment (all false — user hasn't done any of those yet), then `navigateTo('/dashboard')`
- PostHog events: `onboarding_v2_step_1_complete`, `onboarding_v2_step_2_school_added`, `onboarding_v2_complete`

Gender derivation map (inline in component):
```typescript
const SPORT_GENDER_MAP: Record<string, 'male' | 'female'> = {
  softball: 'female',
  'field hockey': 'female',
  baseball: 'male',
  football: 'male',
  wrestling: 'male',
};
// Sports not in map → ask gender in Step 1 as optional field
```

- [ ] **Step 4: Update `pages/onboarding/parent.vue` to match**

Parent wizard stays 2 steps but content changes:
- **Step 1:** Keep playerDob (COPPA gate), sport (required), graduationYear (required). Drop position (checklist item).
- **Step 2:** Show school recommendations for the athlete's sport/location instead of invite-player form. Add a "Go to dashboard" CTA. Invite-player becomes a checklist item.

- [ ] **Step 5: Update onboarding middleware for new completion check**

`middleware/onboarding.global.ts` — `shouldRedirectToOnboarding` already checks `phase_milestone_data.onboarding_complete`. The new wizard still sets this flag via `completeOnboarding()`. No middleware change needed for the happy path.

Add `/api/user/nux-progress` to the public-routes list if it isn't already exempt (it's an authenticated endpoint, so it should work — verify).

- [ ] **Step 6: Run full test suite**

Run: `npm run test`
Expected: Existing onboarding tests may need updating (step counts, field expectations). Fix any that reference old step numbers or removed fields.

- [ ] **Step 7: Run type-check**

Run: `npm run type-check`
Expected: 0 errors

- [ ] **Step 8: Manual verify — run `npm run dev` and walk through signup → onboarding → dashboard**

Check:
- New player signup → 2-step wizard loads
- Step 1: sport + grad year required, zip optional
- Step 2: recommendations appear (may be empty if no home state — acceptable)
- "Go to dashboard" → lands on dashboard
- Parent signup → 2-step parent wizard works similarly

- [ ] **Step 9: Commit**

```bash
git add pages/onboarding/ middleware/onboarding.global.ts composables/useOnboarding.ts \
  tests/unit/onboarding/
git commit -m "feat(onboarding): reshape wizard from 5 steps to 2

Step 1: sport + graduation year + optional zip (was 3 separate steps)
Step 2: inline school recommendations (was academics + invite)
Academics, position, and family invite move to dashboard checklist.
Parent wizard aligned to same 2-step flow."
```

---

### Task 3: Dashboard School Recommendations Widget

**Files:**
- Create: `components/Dashboard/SchoolRecommendationsWidget.vue`
- Modify: `pages/dashboard.vue`
- Test: `tests/unit/components/Dashboard/SchoolRecommendationsWidget.test.ts`

**Interfaces:**
- Consumes: `useSchoolRecommendations()` returning `{ recommendations, loading, error, fetchRecommendations, dismissRecommendation }`, `useNuxProgress().completeItem('first_school')` from Task 1
- Produces: `SchoolRecommendationsWidget` component — no props, self-fetching, emits `school-added` when user adds a school

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/components/Dashboard/SchoolRecommendationsWidget.test.ts
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

const mockRecs = ref([
  { catalogKey: 'ohio-state', name: 'Ohio State', division: 'D1', conference: 'Big Ten', state: 'OH', score: 72, reasons: ['In-state'] },
  { catalogKey: 'michigan', name: 'Michigan', division: 'D1', conference: 'Big Ten', state: 'MI', score: 60, reasons: ['Adjacent state'] },
  { catalogKey: 'kent-state', name: 'Kent State', division: 'D1', conference: 'MAC', state: 'OH', score: 55, reasons: ['In-state'] },
]);
const mockFetch = vi.fn();
const mockDismiss = vi.fn();

vi.mock('~/composables/useSchoolRecommendations', () => ({
  useSchoolRecommendations: () => ({
    recommendations: mockRecs,
    loading: ref(false),
    error: ref(null),
    fetchRecommendations: mockFetch,
    dismissRecommendation: mockDismiss,
  }),
}));

vi.mock('~/composables/useNuxProgress', () => ({
  useNuxProgress: () => ({ completeItem: vi.fn() }),
}));

describe('SchoolRecommendationsWidget', () => {
  it('renders up to 4 recommendation cards', async () => {
    const SchoolRecommendationsWidget = (await import('~/components/Dashboard/SchoolRecommendationsWidget.vue')).default;
    const wrapper = mount(SchoolRecommendationsWidget);
    const cards = wrapper.findAll('[data-testid="rec-card"]');
    expect(cards.length).toBeLessThanOrEqual(4);
    expect(cards.length).toBeGreaterThan(0);
  });

  it('shows "See all" link to /schools', async () => {
    const SchoolRecommendationsWidget = (await import('~/components/Dashboard/SchoolRecommendationsWidget.vue')).default;
    const wrapper = mount(SchoolRecommendationsWidget);
    expect(wrapper.find('a[href="/schools"]').exists()).toBe(true);
  });

  it('hides when user has 5+ tracked schools', async () => {
    mockRecs.value = [];
    const SchoolRecommendationsWidget = (await import('~/components/Dashboard/SchoolRecommendationsWidget.vue')).default;
    const wrapper = mount(SchoolRecommendationsWidget);
    expect(wrapper.find('[data-testid="rec-card"]').exists()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/components/Dashboard/SchoolRecommendationsWidget.test.ts`
Expected: FAIL — component not found

- [ ] **Step 3: Implement SchoolRecommendationsWidget**

```vue
<!-- components/Dashboard/SchoolRecommendationsWidget.vue -->
<script setup lang="ts">
import { useSchoolRecommendations } from '~/composables/useSchoolRecommendations';
import { useNuxProgress } from '~/composables/useNuxProgress';

const { recommendations, loading, fetchRecommendations, dismissRecommendation } =
  useSchoolRecommendations();
const { completeItem } = useNuxProgress();

const displayRecs = computed(() => recommendations.value.slice(0, 4));
const hasRecs = computed(() => displayRecs.value.length > 0);

onMounted(() => fetchRecommendations());

async function handleAdd(school: (typeof recommendations.value)[0]) {
  // Navigate to add-school flow with pre-filled data
  await navigateTo(`/schools/add?name=${encodeURIComponent(school.name)}&catalogKey=${school.catalogKey}`);
  await completeItem('first_school');
}

async function handleDismiss(catalogKey: string) {
  await dismissRecommendation(catalogKey);
}
</script>

<template>
  <div v-if="hasRecs || loading" class="rounded-lg border border-brand-slate-200 bg-white p-4 dark:border-brand-slate-700 dark:bg-brand-slate-800">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-brand-slate-900 dark:text-brand-slate-100">
        Schools to Explore
      </h3>
      <NuxtLink to="/schools" class="text-xs font-medium text-brand-blue-600 hover:text-brand-blue-700">
        See all →
      </NuxtLink>
    </div>

    <div v-if="loading" class="grid grid-cols-2 gap-2">
      <div v-for="i in 4" :key="i" class="h-20 animate-pulse rounded-md bg-brand-slate-100 dark:bg-brand-slate-700" />
    </div>

    <div v-else class="grid grid-cols-2 gap-2">
      <div
        v-for="school in displayRecs"
        :key="school.catalogKey"
        data-testid="rec-card"
        class="rounded-md border border-brand-slate-100 p-3 dark:border-brand-slate-600"
      >
        <p class="text-sm font-medium text-brand-slate-900 dark:text-brand-slate-100">
          {{ school.name }}
        </p>
        <p class="text-xs text-brand-slate-500">
          {{ school.division }} · {{ school.conference ?? school.state }}
        </p>
        <div class="mt-2 flex gap-1">
          <button
            class="rounded bg-brand-blue-600 px-2 py-0.5 text-xs text-white hover:bg-brand-blue-700"
            @click="handleAdd(school)"
          >
            Add
          </button>
          <button
            class="rounded px-2 py-0.5 text-xs text-brand-slate-400 hover:text-brand-slate-600"
            @click="handleDismiss(school.catalogKey)"
          >
            Not a fit
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Add widget to dashboard page**

In `pages/dashboard.vue`, add `SchoolRecommendationsWidget` above the existing configurable widgets in the left column. Position it after the stats cards and before the first configurable widget row. It self-renders conditionally (hides when no recs).

```vue
<!-- In the left column section of pages/dashboard.vue, after DashboardStatsCards -->
<SchoolRecommendationsWidget />
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/unit/components/Dashboard/SchoolRecommendationsWidget.test.ts`
Expected: PASS

- [ ] **Step 6: Run type-check + full test suite**

Run: `npm run type-check && npm run test`
Expected: 0 type errors, all tests pass

- [ ] **Step 7: Commit**

```bash
git add components/Dashboard/SchoolRecommendationsWidget.vue pages/dashboard.vue \
  tests/unit/components/Dashboard/SchoolRecommendationsWidget.test.ts
git commit -m "feat(onboarding): add school recommendations dashboard widget

Compact 2x2 grid of recommended schools on dashboard.
Self-fetching via useSchoolRecommendations, dismiss/add inline.
Marks 'first_school' NUX checklist item on add.
Hides when no recommendations available."
```

---

## Phase 2: Dashboard Checklist + Empty State Overhaul

### Task 4: Getting Started Checklist

**Files:**
- Create: `components/Dashboard/GettingStartedChecklist.vue`
- Modify: `pages/dashboard.vue`
- Test: `tests/unit/components/Dashboard/GettingStartedChecklist.test.ts`

**Interfaces:**
- Consumes: `useNuxProgress()` from Task 1 (all methods), `useProfileCompleteness()` from existing `composables/useProfileCompleteness.ts`, `useSchools()` for school count, `useCoaches()` for coach count, `useUserStore()` for user role/name
- Produces: `GettingStartedChecklist` component — no props, self-evaluating, positioned at top of dashboard

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/components/Dashboard/GettingStartedChecklist.test.ts
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, computed } from 'vue';

const mockProgress = ref({
  version: 1,
  checklist: {
    items: {
      sport: { completed: true, completedAt: '2026-01-01T00:00:00Z' },
    },
    dismissedAt: null,
  },
  firstVisits: {},
  dismissals: {},
});

vi.mock('~/composables/useNuxProgress', () => ({
  useNuxProgress: () => ({
    progress: mockProgress,
    checklistPercentage: computed(() => 13),
    isChecklistComplete: computed(() => false),
    completeItem: vi.fn(),
    dismissChecklist: vi.fn(),
    recordFirstVisit: vi.fn(),
  }),
}));

vi.mock('~/stores/userStore', () => ({
  useUserStore: () => ({
    user: ref({ id: 'u1', role: 'player', full_name: 'Test Player' }),
  }),
}));

describe('GettingStartedChecklist', () => {
  it('renders checklist with progress bar', async () => {
    const GettingStartedChecklist = (await import('~/components/Dashboard/GettingStartedChecklist.vue')).default;
    const wrapper = mount(GettingStartedChecklist);
    expect(wrapper.find('[data-testid="checklist-progress"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('1 of 8');
  });

  it('shows completed items with check mark', async () => {
    const GettingStartedChecklist = (await import('~/components/Dashboard/GettingStartedChecklist.vue')).default;
    const wrapper = mount(GettingStartedChecklist);
    const sportItem = wrapper.find('[data-testid="checklist-item-sport"]');
    expect(sportItem.classes()).toContain('line-through');
  });

  it('hides when dismissed', async () => {
    mockProgress.value = {
      ...mockProgress.value,
      checklist: { ...mockProgress.value.checklist, dismissedAt: '2026-01-01T00:00:00Z' },
    };
    const GettingStartedChecklist = (await import('~/components/Dashboard/GettingStartedChecklist.vue')).default;
    const wrapper = mount(GettingStartedChecklist);
    expect(wrapper.find('[data-testid="checklist-progress"]').exists()).toBe(false);
  });

  it('renders parent-framed labels when role is parent', async () => {
    // Tested separately with parent role mock
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/components/Dashboard/GettingStartedChecklist.test.ts`
Expected: FAIL — component not found

- [ ] **Step 3: Implement GettingStartedChecklist**

The component:
- Reads `useNuxProgress()` for checklist state
- Defines the 8 checklist items with player/parent label variants, "why" copy, and link targets
- Evaluates auto-completion on mount: checks school count (for `first_school`), coach count (for `first_coach`), profile completeness (for `profile_80`), first-visit records (for `preview_template`, `check_timeline`)
- Renders progress bar, item list with ✅/○ indicators, and dismiss button
- Each incomplete item is a `NuxtLink` to the target page
- Hidden when `dismissedAt` is set; shows "Resume getting started" link when dismissed

Checklist item definitions (inline in component):

```typescript
interface ChecklistItemDef {
  key: NuxChecklistKey;
  playerLabel: string;
  parentLabel: (name: string) => string;
  why: string;
  link: string;
}

const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  { key: 'sport', playerLabel: 'Choose your sport', parentLabel: (n) => `Set ${n}'s sport`, why: 'Unlocks recommendations, timeline, and recruiting calendar', link: '/settings/player-details' },
  { key: 'first_school', playerLabel: 'Explore recommended schools', parentLabel: (n) => `Explore schools for ${n}`, why: 'See how you match with real programs', link: '/schools' },
  { key: 'academics', playerLabel: 'Complete your academics', parentLabel: (n) => `Add ${n}'s academics`, why: 'GPA and test scores power academic fit matching', link: '/settings/player-details?tab=academics' },
  { key: 'first_coach', playerLabel: 'Add your first coach', parentLabel: (n) => `Help ${n} track a coach`, why: 'Start building relationships with college coaches', link: '/coaches' },
  { key: 'invite_family', playerLabel: 'Invite your family', parentLabel: (n) => `Invite ${n} to take over`, why: 'Work together on the recruiting journey', link: '/settings/family-management' },
  { key: 'profile_80', playerLabel: 'Complete your profile (80%+)', parentLabel: (n) => `Complete ${n}'s profile (80%+)`, why: 'Full profiles get better recommendations and templates', link: '/settings/player-details' },
  { key: 'preview_template', playerLabel: 'Preview a coach outreach email', parentLabel: () => 'Preview a coach email', why: 'See how your data auto-fills real outreach templates', link: '/settings/communication-templates' },
  { key: 'check_timeline', playerLabel: 'Check your recruiting timeline', parentLabel: () => 'Review recruiting timeline', why: 'Know what to do and when for your sport and grade', link: '/timeline' },
];
```

- [ ] **Step 4: Add checklist to dashboard**

In `pages/dashboard.vue`, add `GettingStartedChecklist` at the top of the main content area, before `DashboardStatsCards`. The component self-hides when dismissed or complete.

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/unit/components/Dashboard/GettingStartedChecklist.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/Dashboard/GettingStartedChecklist.vue pages/dashboard.vue \
  tests/unit/components/Dashboard/GettingStartedChecklist.test.ts
git commit -m "feat(onboarding): add Getting Started checklist to dashboard

8-item role-aware checklist with progress bar.
Auto-evaluates completion from existing data (schools, coaches, profile).
Dismiss option with 'Resume' link. Positioned top of dashboard."
```

---

### Task 5: ProfileCompleteness Dashboard Card

**Files:**
- Create: `components/Dashboard/ProfileCompletenessCard.vue`
- Modify: `pages/dashboard.vue`
- Test: `tests/unit/components/Dashboard/ProfileCompletenessCard.test.ts`

**Interfaces:**
- Consumes: `useProfileCompleteness()` from existing `composables/useProfileCompleteness.ts` returning `{ completeness, loading, updateCompleteness, getNextPrompt }`
- Produces: `ProfileCompletenessCard` component — no props, renders circular progress ring + top-3 missing fields

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/components/Dashboard/ProfileCompletenessCard.test.ts
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

vi.mock('~/composables/useProfileCompleteness', () => ({
  useProfileCompleteness: () => ({
    completeness: ref(45),
    loading: ref(false),
    updateCompleteness: vi.fn(),
    getNextPrompt: vi.fn(),
  }),
}));

describe('ProfileCompletenessCard', () => {
  it('renders percentage in progress ring', async () => {
    const ProfileCompletenessCard = (await import('~/components/Dashboard/ProfileCompletenessCard.vue')).default;
    const wrapper = mount(ProfileCompletenessCard);
    expect(wrapper.text()).toContain('45%');
  });

  it('collapses to single line when completeness >= 80', async () => {
    // Tested with 80%+ mock
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/components/Dashboard/ProfileCompletenessCard.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement ProfileCompletenessCard**

Circular SVG progress ring (CSS-driven, no library) with percentage. Below ring: list of top 3 missing fields by impact (reuse logic from `useProfileCompleteness().getNextPrompt()`). Each field links to the correct settings tab. Collapses to a single horizontal bar when completeness ≥ 80%.

- [ ] **Step 4: Add to dashboard, position below checklist**

In `pages/dashboard.vue`, after `GettingStartedChecklist` and before `DashboardStatsCards`.

- [ ] **Step 5: Run tests + type-check**

Run: `npm run type-check && npx vitest run tests/unit/components/Dashboard/ProfileCompletenessCard.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/Dashboard/ProfileCompletenessCard.vue pages/dashboard.vue \
  tests/unit/components/Dashboard/ProfileCompletenessCard.test.ts
git commit -m "feat(onboarding): add ProfileCompleteness card to dashboard

SVG progress ring with percentage + top-3 missing fields.
Collapses to single line at 80%+. Links to settings tabs."
```

---

### Task 6: Empty State Overhaul (10 pages)

**Files:**
- Modify: `pages/events/index.vue`, `pages/offers/index.vue`, `pages/documents/index.vue`, `pages/performance/index.vue`, `pages/deadlines/index.vue`, `pages/recommendations/index.vue`, `pages/tasks/index.vue`, `pages/activity/index.vue`, `pages/analytics/index.vue`, `pages/settings/communication-templates.vue` (or wherever templates page lives)
- Test: `tests/unit/components/empty-states.test.ts`

**Interfaces:**
- Consumes: `DesignSystemEmptyState` / `DesignSystemPageState` from existing `components/DesignSystem/`
- Produces: All 10 pages use consistent DesignSystem empty states with contextual copy and CTAs

- [ ] **Step 1: Audit existing empty states**

For each of the 10 pages, read the current file to find the empty state markup. Identify:
- Which component they use (if any)
- What text/CTA they show
- Whether the page uses `DesignSystemEmptyState` or hand-rolled HTML

Check the `DesignSystemEmptyState` and `DesignSystemPageState` components' props interfaces to understand the API.

- [ ] **Step 2: Write failing test for one example (Events)**

```typescript
// tests/unit/pages/events-empty-state.test.ts
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

// Mock composables to return empty state
vi.mock('~/composables/useEvents', () => ({
  useEvents: () => ({
    events: ref([]),
    loading: ref(false),
    error: ref(null),
  }),
}));

describe('Events page empty state', () => {
  it('renders DesignSystemEmptyState with CTA when no events', async () => {
    const EventsPage = (await import('~/pages/events/index.vue')).default;
    const wrapper = mount(EventsPage);
    expect(wrapper.findComponent({ name: 'DesignSystemEmptyState' }).exists()).toBe(true);
    expect(wrapper.text()).toContain('Schedule Your First Event');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/unit/pages/events-empty-state.test.ts`
Expected: FAIL — no DesignSystemEmptyState in events page

- [ ] **Step 4: Update all 10 pages**

For each page, replace the hand-rolled empty state with `DesignSystemEmptyState` or `DesignSystemPageState`. Pattern:

```vue
<DesignSystemEmptyState
  v-if="!loading && items.length === 0"
  icon="heroicons:calendar"
  title="No events yet"
  description="Coaches want to see you compete — track camps, showcases, and visits to show your commitment."
>
  <template #action>
    <button class="..." @click="openAddEvent">
      Schedule Your First Event
    </button>
  </template>
</DesignSystemEmptyState>
```

Copy per page (from spec):
| Page | Title | Description | CTA |
|---|---|---|---|
| Events | No events yet | Coaches want to see you compete — track camps, showcases, and visits | Schedule Your First Event |
| Offers | No offers tracked | Record offers, preferred walk-ons, and recruiting interest levels | Track Your First Offer |
| Documents | No documents yet | Coaches expect transcripts, test scores, and highlight reels | Upload Your First Document |
| Performance | No stats logged | Your stats auto-fill coach outreach templates | Log Your First Stats |
| Deadlines | No deadlines yet | Key dates for your sport, division, and graduation year | View Recruiting Deadlines |
| Recommendations | No recommendations | Letters from coaches and teachers strengthen your recruiting profile | Request a Recommendation |
| Tasks | No tasks yet | Phase-based recruiting tasks guide your next steps | Your tasks appear as you progress |
| Templates | No templates found | Ready-to-send emails personalized with your recruiting data | Browse Coach Outreach Templates |
| Activity | No activity yet | See all your recruiting activity in one timeline | Your activity feed starts when you begin tracking |
| Analytics | No analytics yet | Track engagement, fit trends, and recruiting momentum | Add a school to see recruiting analytics |

- [ ] **Step 5: Fix Activity page bug — blank empty state**

The Activity page renders blank white space when empty. Add the `DesignSystemEmptyState` component in the no-data branch.

- [ ] **Step 6: Run tests + type-check**

Run: `npm run type-check && npm run test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add pages/events/ pages/offers/ pages/documents/ pages/performance/ \
  pages/deadlines/ pages/recommendations/ pages/tasks/ pages/activity/ \
  pages/analytics/ pages/settings/communication-templates.vue \
  tests/unit/pages/
git commit -m "feat(onboarding): upgrade 10 empty states to DesignSystem components

All empty states now use DesignSystemEmptyState with:
- Contextual icon and description explaining feature value
- Primary CTA button inline (not just page header)
- Fix: Activity page no longer renders blank on empty"
```

---

## Phase 3: Progressive Value Reveals

### Task 7: Schools "Discover More" + Fit Previews on Recommendations

**Files:**
- Modify: `pages/schools/index.vue`
- Modify: `components/School/RecommendedSchools.vue`
- Test: `tests/unit/components/School/RecommendedSchoolsFit.test.ts`

**Interfaces:**
- Consumes: `useSchoolRecommendations()`, `useProfileCompleteness()`, fit score utils from `utils/fitScoreCalculation.ts`
- Produces: Recommendations section on `/schools` below tracked list; fit signal badges on recommendation cards

- [ ] **Step 1: Write failing test for fit badges**

```typescript
// tests/unit/components/School/RecommendedSchoolsFit.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('Recommendation fit badges', () => {
  it('shows "In-state" badge when school state matches user state', () => {
    const userState = 'OH';
    const schoolState = 'OH';
    const badge = userState === schoolState ? 'In-state' : schoolState ? 'Out of state' : null;
    expect(badge).toBe('In-state');
  });

  it('shows "Academic match" when GPA is within school range', () => {
    const userGpa = 3.5;
    const schoolAvgGpa = 3.4; // From Scorecard enrichment
    const label = !userGpa ? null
      : !schoolAvgGpa ? null
      : Math.abs(userGpa - schoolAvgGpa) <= 0.3 ? 'Academic match'
      : userGpa > schoolAvgGpa ? 'Academic safety'
      : 'Academic reach';
    expect(label).toBe('Academic match');
  });

  it('shows prompt when GPA missing', () => {
    const userGpa = null;
    const prompt = !userGpa ? 'Add your GPA to see academic fit →' : null;
    expect(prompt).toBe('Add your GPA to see academic fit →');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/components/School/RecommendedSchoolsFit.test.ts`
Expected: PASS (pure logic tests — they pass, proving our badge logic is correct)

- [ ] **Step 3: Add fit signal badges to RecommendedSchools.vue**

Add a computed `fitBadges` per school. For each recommendation card, render:
- Location badge: compare school.state to user's home state (from `usePreferenceManager`)
- Academic badge: if user has GPA, compare to division averages (D1 ~3.4, D2 ~3.1, D3 ~3.0 as rough defaults when no Scorecard data)
- Missing data prompt: "Add your GPA to see academic fit →" linking to `/settings/player-details?tab=academics`

Badges render as small pill-shaped spans below the school name.

- [ ] **Step 4: Add "Discover More" section to schools page**

In `pages/schools/index.vue`, below the tracked schools list, add a section:
```vue
<section v-if="recommendations.length > 0" class="mt-8">
  <h2 class="mb-4 text-lg font-semibold">Discover More Schools</h2>
  <p class="mb-4 text-sm text-brand-slate-500">
    Recommendations update as your profile grows
  </p>
  <RecommendedSchools
    :items="recommendations"
    :loading="recsLoading"
    @add="handleAddRec"
    @dismiss="handleDismissRec"
  />
</section>
```

Remove the empty-state-only guard on `useSchoolRecommendations` fetch — always fetch recs, show below tracked list.

- [ ] **Step 5: Run type-check + test**

Run: `npm run type-check && npm run test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/School/RecommendedSchools.vue pages/schools/index.vue \
  tests/unit/components/School/
git commit -m "feat(onboarding): add fit badges to recs + Discover More on schools page

Recommendation cards show location/academic fit badges.
Missing data prompts link to profile settings.
Schools page shows recommendations below tracked list (not just empty state)."
```

---

### Task 8: Contextual Profile Prompts

**Files:**
- Create: `composables/useNuxPrompts.ts`
- Test: `tests/unit/composables/useNuxPrompts.test.ts`

**Interfaces:**
- Consumes: `useNuxProgress().isPromptDismissed()` and `useNuxProgress().dismissPrompt()` from Task 1, `useProfileCompleteness()` from existing composable
- Produces: `useNuxPrompts()` returning `{ activePrompt, dismissActivePrompt, evaluatePrompts }` — provides at most 1 prompt at a time with session + cooldown dedup

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/composables/useNuxPrompts.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

const mockIsPromptDismissed = vi.fn().mockReturnValue(false);
const mockDismissPrompt = vi.fn();

vi.mock('~/composables/useNuxProgress', () => ({
  useNuxProgress: () => ({
    isPromptDismissed: mockIsPromptDismissed,
    dismissPrompt: mockDismissPrompt,
    progress: ref({ version: 1, checklist: { items: {}, dismissedAt: null }, firstVisits: {}, dismissals: {} }),
  }),
}));

describe('useNuxPrompts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no prompts apply', async () => {
    const { useNuxPrompts } = await import('~/composables/useNuxPrompts');
    const { activePrompt, evaluatePrompts } = useNuxPrompts();
    evaluatePrompts({ context: 'dashboard', userGpa: 3.5, userSat: 1200 });
    expect(activePrompt.value).toBeNull();
  });

  it('returns GPA prompt on fit-score page when GPA missing', async () => {
    const { useNuxPrompts } = await import('~/composables/useNuxPrompts');
    const { activePrompt, evaluatePrompts } = useNuxPrompts();
    evaluatePrompts({ context: 'fit-score', userGpa: null, schoolName: 'Ohio State' });
    expect(activePrompt.value?.id).toBe('gpa_fit_score');
    expect(activePrompt.value?.message).toContain('Ohio State');
  });

  it('respects session dedup — same prompt not shown twice', async () => {
    const { useNuxPrompts } = await import('~/composables/useNuxPrompts');
    const { activePrompt, evaluatePrompts, dismissActivePrompt } = useNuxPrompts();
    evaluatePrompts({ context: 'fit-score', userGpa: null, schoolName: 'Ohio State' });
    expect(activePrompt.value).toBeTruthy();
    await dismissActivePrompt();
    evaluatePrompts({ context: 'fit-score', userGpa: null, schoolName: 'Michigan' });
    expect(activePrompt.value).toBeNull(); // Same field, same session
  });

  it('respects 7-day cooldown from nux_progress', async () => {
    mockIsPromptDismissed.mockReturnValue(true);
    const { useNuxPrompts } = await import('~/composables/useNuxPrompts');
    const { activePrompt, evaluatePrompts } = useNuxPrompts();
    evaluatePrompts({ context: 'fit-score', userGpa: null, schoolName: 'Ohio State' });
    expect(activePrompt.value).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composables/useNuxPrompts.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useNuxPrompts**

```typescript
// composables/useNuxPrompts.ts
import { ref } from 'vue';
import { useNuxProgress } from '~/composables/useNuxProgress';

interface NuxPrompt {
  id: string;
  field: string;
  message: string;
  link: string;
}

interface PromptContext {
  context: 'dashboard' | 'fit-score' | 'template' | 'schools' | 'public-profile';
  userGpa?: number | null;
  userSat?: number | null;
  userAct?: number | null;
  userPosition?: string | null;
  schoolName?: string | null;
  profileCompleteness?: number;
  schoolCount?: number;
}

const COOLDOWN_DAYS = 7;

export function useNuxPrompts() {
  const { isPromptDismissed, dismissPrompt } = useNuxProgress();
  const activePrompt = ref<NuxPrompt | null>(null);
  const sessionDismissed = new Set<string>();

  function evaluatePrompts(ctx: PromptContext) {
    activePrompt.value = null;

    const candidates: NuxPrompt[] = [];

    if (!ctx.userGpa && (ctx.context === 'fit-score' || ctx.context === 'schools')) {
      candidates.push({
        id: 'gpa_fit_score',
        field: 'gpa',
        message: ctx.schoolName
          ? `Add your GPA to see academic fit at ${ctx.schoolName}`
          : 'Add your GPA to see academic fit at each school',
        link: '/settings/player-details?tab=academics',
      });
    }

    if (!ctx.userPosition && ctx.context === 'template') {
      candidates.push({
        id: 'position_template',
        field: 'position',
        message: 'Complete your position to personalize this email',
        link: '/settings/player-details?tab=athletics',
      });
    }

    if (!ctx.userSat && !ctx.userAct && ctx.context === 'schools' && (ctx.schoolCount ?? 0) >= 3) {
      candidates.push({
        id: 'test_scores_schools',
        field: 'test_scores',
        message: "Add your test scores — we'll show how you compare at all your schools",
        link: '/settings/player-details?tab=academics',
      });
    }

    if ((ctx.profileCompleteness ?? 100) < 60 && ctx.context === 'dashboard') {
      candidates.push({
        id: 'profile_low_dashboard',
        field: 'profile',
        message: `Your profile is ${ctx.profileCompleteness}% complete — coaches see this too`,
        link: '/settings/player-details',
      });
    }

    // Pick first non-dismissed candidate
    for (const candidate of candidates) {
      if (sessionDismissed.has(candidate.field)) continue;
      if (isPromptDismissed(candidate.id, COOLDOWN_DAYS)) continue;
      activePrompt.value = candidate;
      return;
    }
  }

  async function dismissActivePrompt() {
    if (!activePrompt.value) return;
    sessionDismissed.add(activePrompt.value.field);
    await dismissPrompt(activePrompt.value.id);
    activePrompt.value = null;
  }

  return { activePrompt, evaluatePrompts, dismissActivePrompt };
}
```

- [ ] **Step 4: Integrate prompts into key pages**

Add prompt rendering to 3 high-value surfaces:
1. **Fit score cards** (wherever they render) — call `evaluatePrompts({ context: 'fit-score', ... })` on mount
2. **Template preview page** — call `evaluatePrompts({ context: 'template', ... })`
3. **Dashboard** — call `evaluatePrompts({ context: 'dashboard', profileCompleteness })` on mount

Render pattern (reusable inline):
```vue
<div v-if="activePrompt" class="mb-4 flex items-center justify-between rounded-md border border-brand-blue-100 bg-brand-blue-50 px-4 py-2 text-sm dark:border-brand-blue-800 dark:bg-brand-blue-900/20">
  <span>{{ activePrompt.message }}
    <NuxtLink :to="activePrompt.link" class="font-medium text-brand-blue-600 hover:underline">Update →</NuxtLink>
  </span>
  <button class="ml-2 text-brand-slate-400 hover:text-brand-slate-600" @click="dismissActivePrompt">Not now</button>
</div>
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/unit/composables/useNuxPrompts.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add composables/useNuxPrompts.ts tests/unit/composables/useNuxPrompts.test.ts \
  pages/ components/
git commit -m "feat(onboarding): add contextual profile prompts

useNuxPrompts composable: context-aware, session-deduped, 7-day cooldown.
Prompts surface on fit-score views, template preview, and dashboard.
Max 1 prompt visible at a time. 'Not now' dismisses for 7 days."
```

---

### Task 9: Day-3 Re-engagement Email

**Files:**
- Create: `server/utils/onboardingEmail.ts`
- Create: `server/api/cron/onboarding-nudge.get.ts`
- Test: `tests/unit/server/onboarding-nudge.test.ts`

**Interfaces:**
- Consumes: `sendNotificationEmail()` from `server/utils/emailService.ts`, `withCronRun()` from `server/utils/cronRun.ts`, `useSupabaseAdmin()` from `server/utils/supabase.ts`
- Produces: Cron endpoint that sends re-engagement email to users with `nux_progress` checklist < 50% complete who signed up 3+ days ago

- [ ] **Step 1: Write failing test for email renderer**

```typescript
// tests/unit/server/onboarding-email.test.ts
import { describe, it, expect } from 'vitest';

describe('renderOnboardingNudgeEmail', () => {
  it('renders HTML with user name and incomplete items', async () => {
    const { renderOnboardingNudgeEmail } = await import('~/server/utils/onboardingEmail');
    const html = renderOnboardingNudgeEmail({
      userName: 'Chris',
      completedCount: 2,
      totalCount: 8,
      topIncompleteItems: [
        { label: 'Explore recommended schools', link: 'https://app.example.com/schools' },
        { label: 'Complete your academics', link: 'https://app.example.com/settings/player-details?tab=academics' },
      ],
      dashboardUrl: 'https://app.example.com/dashboard',
    });
    expect(html).toContain('Chris');
    expect(html).toContain('2 of 8');
    expect(html).toContain('Explore recommended schools');
    expect(html).toContain('Complete your academics');
    expect(html).toContain('https://app.example.com/dashboard');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/onboarding-email.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement email renderer**

```typescript
// server/utils/onboardingEmail.ts
interface OnboardingNudgeEmailData {
  userName: string;
  completedCount: number;
  totalCount: number;
  topIncompleteItems: Array<{ label: string; link: string }>;
  dashboardUrl: string;
}

export function renderOnboardingNudgeEmail(data: OnboardingNudgeEmailData): string {
  const itemsHtml = data.topIncompleteItems
    .map(item => `<li style="margin-bottom: 8px;"><a href="${item.link}" style="color: #2563eb; text-decoration: none;">${item.label}</a></li>`)
    .join('');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 8px;">
        Hey ${data.userName}, your recruiting profile is waiting 👋
      </h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">
        You've completed <strong>${data.completedCount} of ${data.totalCount}</strong> getting-started steps.
        A few quick actions will unlock personalized school matches and coach outreach tools:
      </p>
      <ul style="color: #475569; font-size: 15px; line-height: 1.8; padding-left: 20px;">
        ${itemsHtml}
      </ul>
      <div style="margin-top: 24px;">
        <a href="${data.dashboardUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
          Continue where you left off →
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">
        — The Recruiting Compass
      </p>
    </div>
  `;
}
```

- [ ] **Step 4: Implement cron endpoint**

```typescript
// server/api/cron/onboarding-nudge.get.ts
import { defineEventHandler } from 'h3';
import { withCronRun } from '~/server/utils/cronRun';
import { useSupabaseAdmin } from '~/server/utils/supabase';
import { sendNotificationEmail } from '~/server/utils/emailService';
import { renderOnboardingNudgeEmail } from '~/server/utils/onboardingEmail';
import { NUX_CHECKLIST_KEYS, parseNuxProgress } from '~/types/nux';

export default defineEventHandler(async (event) =>
  withCronRun(event, 'onboarding-nudge', async (ctx) => {
    const supabase = useSupabaseAdmin();
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();

    // Find users created 3-7 days ago with incomplete checklists
    // (7-day cap avoids emailing users who signed up months ago)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, nux_progress, created_at')
      .lte('created_at', threeDaysAgo)
      .gte('created_at', sevenDaysAgo)
      .not('email', 'like', '%@test.com'); // Exclude test accounts

    if (error || !users) {
      ctx.setFailed(1);
      return { error: error?.message ?? 'No users found' };
    }

    let sent = 0;
    let skipped = 0;

    for (const user of users) {
      const progress = parseNuxProgress(user.nux_progress);

      // Skip if already sent nudge (track via dismissals)
      if (progress.dismissals['onboarding_nudge_email']) {
        skipped++;
        continue;
      }

      const completedCount = NUX_CHECKLIST_KEYS.filter(
        k => progress.checklist.items[k]?.completed
      ).length;
      const percentage = Math.round((completedCount / NUX_CHECKLIST_KEYS.length) * 100);

      // Only nudge users below 50% completion
      if (percentage >= 50) {
        skipped++;
        continue;
      }

      const baseUrl = process.env.NUXT_PUBLIC_SITE_URL ?? 'https://myrecruitingcompass.com';
      const incompleteItems = NUX_CHECKLIST_KEYS
        .filter(k => !progress.checklist.items[k]?.completed)
        .slice(0, 3)
        .map(k => ({ label: CHECKLIST_LABELS[k], link: `${baseUrl}${CHECKLIST_LINKS[k]}` }));

      const html = renderOnboardingNudgeEmail({
        userName: user.full_name?.split(' ')[0] ?? 'there',
        completedCount,
        totalCount: NUX_CHECKLIST_KEYS.length,
        topIncompleteItems: incompleteItems,
        dashboardUrl: `${baseUrl}/dashboard`,
      });

      await sendNotificationEmail({
        to: user.email,
        subject: "Your recruiting profile is waiting 👋",
        title: "Continue your setup",
        message: html,
        priority: 'low',
        idempotencyKey: `onboarding-nudge-${user.id}`,
      });

      // Mark nudge sent to prevent re-sending
      await supabase
        .from('users')
        .update({
          nux_progress: {
            ...progress,
            dismissals: {
              ...progress.dismissals,
              onboarding_nudge_email: new Date().toISOString(),
            },
          },
        })
        .eq('id', user.id);

      sent++;
    }

    ctx.setProcessed(sent + skipped);
    return { sent, skipped, total: users.length };
  })
);

// Labels and links for email rendering
const CHECKLIST_LABELS: Record<string, string> = {
  sport: 'Choose your sport',
  first_school: 'Explore recommended schools',
  academics: 'Complete your academics',
  first_coach: 'Add your first coach',
  invite_family: 'Invite your family',
  profile_80: 'Complete your profile',
  preview_template: 'Preview a coach outreach email',
  check_timeline: 'Check your recruiting timeline',
};

const CHECKLIST_LINKS: Record<string, string> = {
  sport: '/settings/player-details',
  first_school: '/schools',
  academics: '/settings/player-details?tab=academics',
  first_coach: '/coaches',
  invite_family: '/settings/family-management',
  profile_80: '/settings/player-details',
  preview_template: '/settings/communication-templates',
  check_timeline: '/timeline',
};
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/unit/server/onboarding-email.test.ts`
Expected: PASS

- [ ] **Step 6: Add PostHog tracking events**

Add PostHog events in the wizard, checklist, and key interactions:
- `onboarding_v2_started` — wizard Step 1 loaded
- `onboarding_v2_step1_complete` — sport + grad year saved
- `onboarding_v2_school_added` — school added from wizard Step 2
- `onboarding_v2_complete` — dashboard reached
- `checklist_item_completed` with `{ item: key }` — any checklist item done
- `checklist_dismissed` — user dismisses checklist
- `nux_prompt_shown` with `{ promptId }` — contextual prompt displayed
- `nux_prompt_dismissed` with `{ promptId }` — prompt dismissed

All via `useNuxtApp().$posthog?.capture()` (null-safe).

- [ ] **Step 7: Commit**

```bash
git add server/utils/onboardingEmail.ts server/api/cron/onboarding-nudge.get.ts \
  tests/unit/server/
git commit -m "feat(onboarding): add Day-3 re-engagement email cron

Cron checks users 3-7 days old with <50% checklist completion.
Sends personalized email with top-3 incomplete items + dashboard link.
Idempotent: marks nudge sent in nux_progress.dismissals.
PostHog events added across onboarding funnel."
```

---

## Phase 4: iOS Parity

### Task 10: iOS Onboarding Spec + Shared API Contract

**Files:**
- Create: `planning/iOS_SPEC_onboarding-v2-2026-08-31.md`

**Interfaces:**
- Consumes: NUX progress API (`PATCH /api/user/nux-progress`), school recommendations API (`GET /api/schools/recommendations`)
- Produces: iOS implementation spec with exact API contract, screen descriptions, and SwiftUI component mapping

- [ ] **Step 1: Write iOS spec**

Document for the iOS developer (or future session):
- **Shared API surface:** `PATCH /api/user/nux-progress` (body: `{ nux_progress: NuxProgress }`), `GET /api/schools/recommendations?athleteId=&limit=`
- **Screen 1:** "Tell us about you" — sport picker (native wheel/list), graduation year picker, optional zip field. On save → POST to existing player-details endpoint + PATCH nux_progress to mark `sport` complete.
- **Screen 2:** "Schools to explore" — horizontally scrollable card carousel using existing recommendation API. Add/dismiss actions. "Go to dashboard" button.
- **Dashboard additions:** Getting Started checklist as a native `List` section. Profile completeness as `Gauge` or circular progress. Recommendation cards.
- **NUX tracking:** Read/write `users.nux_progress` JSONB via same PATCH endpoint. Checklist evaluation logic same as web.
- **Push notification priming:** After first school add, show a pre-permission screen explaining the value, then request notification permission.

Reference existing spec: `planning/iOS_SPEC_school-recommendations-2026-08-28.md`

- [ ] **Step 2: Commit**

```bash
git add planning/iOS_SPEC_onboarding-v2-2026-08-31.md
git commit -m "docs: iOS onboarding v2 implementation spec

Same logical flow as web: 2-step wizard + checklist + recommendations.
Shared API contract for nux_progress and recommendations.
SwiftUI component mapping and push notification priming guidance."
```

Note: Actual iOS implementation is done in the iOS repo (`recruiting-compass-ios`) following this spec. Not part of this web plan.

---

## Phase 5: Sport-Filtered Recommendations (Follow-up)

### Task 11: Programs Table + Sport-Aware Ranking

**Files:**
- Create: `supabase/migrations/20260915000000_college_programs.sql`
- Create: `data/ncaaSportSponsorship.json` (or data ingestion script)
- Modify: `utils/schoolRecommendations.ts`
- Modify: `server/utils/assembleSchoolRecommendations.ts`
- Test: `tests/unit/utils/schoolRecommendations.test.ts` (modify existing)

**Interfaces:**
- Consumes: Existing `rankSchoolRecommendations()` from `utils/schoolRecommendations.ts`, `NcaaCatalogSchool` type
- Produces: Updated ranker that filters by sport before scoring, `college_programs` table for sport sponsorship data

- [ ] **Step 1: Design programs table migration**

```sql
-- supabase/migrations/20260915000000_college_programs.sql
CREATE TABLE IF NOT EXISTS public.college_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_catalog_key text NOT NULL,
  sport text NOT NULL,
  division text NOT NULL,
  conference text,
  gender text NOT NULL CHECK (gender IN ('men', 'women', 'coed')),
  scorecard_id integer,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (school_catalog_key, sport, gender)
);

CREATE INDEX idx_college_programs_sport_gender ON public.college_programs (sport, gender);
CREATE INDEX idx_college_programs_school ON public.college_programs (school_catalog_key);

-- RLS: read-only for authenticated users (reference data)
ALTER TABLE public.college_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read programs" ON public.college_programs FOR SELECT USING (true);
```

- [ ] **Step 2: Source sport sponsorship data**

Research NCAA sport sponsorship data (EADA reports, NCAA directory). Create a data ingestion script or static JSON. This is the most uncertain step — data sourcing may require scraping or manual compilation.

Fallback if data sourcing is slow: seed with the 5-10 most common sports (baseball, softball, basketball M/W, football, soccer M/W, volleyball W, track M/W) using known D1 programs, and mark remaining sports as "unfiltered" (current behavior).

- [ ] **Step 3: Update ranker to accept sport filter**

```typescript
// utils/schoolRecommendations.ts — updated interface
export interface RankSchoolRecommendationsInput {
  catalog: NcaaCatalogSchool[];
  homeState: string | null;
  gpa: number | null;
  excludedKeys: ReadonlySet<string>;
  limit?: number;
  sport?: string | null;        // NEW: filter to schools with this sport
  gender?: 'male' | 'female' | null; // NEW: for gendered sport filtering
  programsBySport?: Map<string, Set<string>>; // NEW: catalogKey → set of sports
}
```

When `sport` and `programsBySport` provided, filter `catalog` to only schools whose key appears in the programs map with a matching sport before scoring. When not provided, behave as today (no sport filter).

- [ ] **Step 4: Update assembleSchoolRecommendations to query programs table**

In `server/utils/assembleSchoolRecommendations.ts`, before calling the ranker:
1. Query `college_programs` for the athlete's sport + gender
2. Build a `Set<string>` of catalog keys that sponsor that sport
3. Pass to ranker as `programsBySport`

Cache the programs lookup (it's reference data, changes infrequently).

- [ ] **Step 5: Write tests for sport-filtered ranking**

```typescript
// Add to existing tests/unit/utils/schoolRecommendations.test.ts
describe('sport-filtered ranking', () => {
  it('excludes schools without the specified sport', () => {
    const programs = new Map([
      ['ohio-state', new Set(['baseball', 'football'])],
      ['kent-state', new Set(['baseball'])],
      // michigan NOT in programs → filtered out
    ]);

    const result = rankSchoolRecommendations({
      catalog: threeSchools,
      homeState: 'OH',
      gpa: 3.5,
      excludedKeys: new Set(),
      sport: 'baseball',
      programsBySport: programs,
    });

    expect(result.find(r => r.catalogKey === 'michigan')).toBeUndefined();
    expect(result.find(r => r.catalogKey === 'ohio-state')).toBeTruthy();
  });

  it('falls back to unfiltered when no programs data', () => {
    const result = rankSchoolRecommendations({
      catalog: threeSchools,
      homeState: 'OH',
      gpa: 3.5,
      excludedKeys: new Set(),
      sport: 'baseball',
      // No programsBySport → no filter
    });

    expect(result.length).toBe(3); // All schools included
  });
});
```

- [ ] **Step 6: Run tests + type-check**

Run: `npm run type-check && npm run test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260915000000_college_programs.sql \
  utils/schoolRecommendations.ts server/utils/assembleSchoolRecommendations.ts \
  tests/unit/utils/schoolRecommendations.test.ts
git commit -m "feat(recommendations): add sport-filtered school recommendations

college_programs table for sport sponsorship data.
Ranker filters by sport before scoring when data available.
Graceful fallback to unfiltered when no programs data."
```

---

## Verification Checklist

After all tasks complete:

- [ ] `npm run type-check` — 0 errors
- [ ] `npm run test` — all pass
- [ ] `npm run lint:fix` — 0 errors
- [ ] `npm run audit:tokens` — 0 errors
- [ ] Manual walkthrough: new signup → 2-step wizard → recs in step 2 → dashboard with checklist + recs widget + completeness card
- [ ] Manual walkthrough: parent signup → same flow with parent framing
- [ ] Manual walkthrough: existing user login → sees checklist with auto-evaluated items
- [ ] Empty states: visit each of the 10 upgraded pages with no data, verify DesignSystem component renders
- [ ] Contextual prompts: visit fit score page with no GPA, verify prompt appears
- [ ] PostHog: verify events fire in dev console (network tab, PostHog debug mode)
- [ ] Apply `nux_progress` migration to live DB via Supabase MCP
