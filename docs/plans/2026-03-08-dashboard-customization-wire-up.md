# Dashboard Customization Wire-Up Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Settings → Dashboard Customization page actually control widget visibility on the dashboard.

**Architecture:** Load dashboard layout preferences in `pages/dashboard.vue` via `usePreferenceManager`, derive a reactive `computed` from it, and use it to conditionally render each widget. The `DashboardStatsCards` component already has `show*` props — just pass values. Other widgets get `v-if` guards. The settings page gets "Coming Soon" badges on options that have no matching dashboard component yet.

**Tech Stack:** Vue 3 Composition API, `usePreferenceManager` composable, `computed`, `onMounted`

---

## Mapping Reference

### Stats cards (`DashboardStatsCards` props)
| `statsCards` key | prop | live? |
|---|---|---|
| `coaches` | `:show-coaches` | ✅ |
| `schools` | `:show-schools` | ✅ |
| `interactions` | `:show-interactions` | ✅ |
| `offers` | `:show-offers` | ✅ |
| `events` | `:show-events` | ✅ |
| `performance` | — | 🔜 |
| `notifications` | — | 🔜 |
| `socialMedia` | — | 🔜 |

### Widgets (`v-if` on section)
| `widgets` key | component | live? |
|---|---|---|
| `atAGlanceSummary` | `DashboardAtAGlanceSummary` | ✅ |
| `interactionTrendChart` | `DashboardInteractionTrendChart` | ✅ |
| `schoolInterestChart` | `DashboardSchoolInterestChart` | ✅ |
| `schoolMapWidget` | `DashboardSchoolMapWidget` | ✅ |
| `coachFollowupWidget` | `DashboardCoachFollowupWidget` | ✅ |
| `performanceSummary` | `DashboardPerformanceMetricsWidget` | ✅ |
| `quickTasks` | `DashboardQuickTasksWidget` | ✅ |
| `eventsSummary` | `DashboardUpcomingEventsWidget` | ✅ |
| `recentNotifications` | `DashboardRecentActivityFeed` | ✅ |
| `schoolStatusOverview` | `DashboardSchoolsBySizeWidget` | ✅ |
| `linkedAccounts` | `DashboardSocialMediaWidget` | ✅ |
| `offerStatusOverview` | — | 🔜 |
| `recentDocuments` | — | 🔜 |
| `interactionStats` | — | 🔜 |
| `coachResponsiveness` | — | 🔜 |
| `upcomingDeadlines` | — | 🔜 |
| `recruitingCalendar` | — | 🔜 |

---

### Task 1: Wire preferences into `pages/dashboard.vue`

**Files:**
- Modify: `pages/dashboard.vue`

**Step 1: Add `usePreferenceManager` import and load layout**

In the `<script setup>` block, add after the existing imports:
```typescript
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { onMounted } from "vue"; // already imported as ref, watch, computed, inject, defineAsyncComponent — add onMounted
```

Add after `const logger = createClientLogger("dashboard")`:
```typescript
const { getDashboardLayout, dashboardPrefs } = usePreferenceManager();
const dashboardLayout = computed(() => getDashboardLayout());
```

Add at top of `onMounted` (or add one if it doesn't exist):
```typescript
onMounted(async () => {
  await dashboardPrefs.loadPreferences();
});
```

Note: `pages/dashboard.vue` doesn't currently have an `onMounted`. Add it.

**Step 2: Pass layout props to `DashboardStatsCards`**

Change:
```html
<DashboardStatsCards
  :coach-count="coachCount"
  :school-count="schoolCount"
  :interaction-count="interactionCount"
  :event-count="eventCount"
  :total-offers="totalOffers"
  :accepted-offers="acceptedOffers"
  :contacts-this-month="contactsThisMonth"
/>
```
To:
```html
<DashboardStatsCards
  :coach-count="coachCount"
  :school-count="schoolCount"
  :interaction-count="interactionCount"
  :event-count="eventCount"
  :total-offers="totalOffers"
  :accepted-offers="acceptedOffers"
  :contacts-this-month="contactsThisMonth"
  :show-coaches="dashboardLayout.statsCards.coaches"
  :show-schools="dashboardLayout.statsCards.schools"
  :show-interactions="dashboardLayout.statsCards.interactions"
  :show-offers="dashboardLayout.statsCards.offers"
  :show-events="dashboardLayout.statsCards.events"
/>
```

**Step 3: Add `v-if` guards to each widget section**

For each component, wrap its `<section>` (or the component itself if no section wrapper) with `v-if`:

- `DashboardInteractionTrendChart` and `DashboardSchoolInterestChart` share a `<div class="grid ...">` — wrap the whole `<section>` containing both charts with `v-if="dashboardLayout.widgets.interactionTrendChart || dashboardLayout.widgets.schoolInterestChart"`, and add individual `v-if` on each chart inside.
- `DashboardSchoolMapWidget` section → `v-if="dashboardLayout.widgets.schoolMapWidget"`
- `DashboardPerformanceMetricsWidget` section → `v-if="dashboardLayout.widgets.performanceSummary"`
- `DashboardQuickTasksWidget` → `v-if="dashboardLayout.widgets.quickTasks"` (on the label element)
- `DashboardCoachFollowupWidget` → `v-if="dashboardLayout.widgets.coachFollowupWidget"`
- `DashboardAtAGlanceSummary` → `v-if="dashboardLayout.widgets.atAGlanceSummary"`
- `DashboardSchoolsBySizeWidget` (sidebar) → `v-if="dashboardLayout.widgets.schoolStatusOverview"`
- `DashboardUpcomingEventsWidget` (sidebar) → `v-if="dashboardLayout.widgets.eventsSummary"`
- `DashboardRecentActivityFeed` (sidebar) → `v-if="dashboardLayout.widgets.recentNotifications"`
- `DashboardSocialMediaWidget` (sidebar) → `v-if="dashboardLayout.widgets.linkedAccounts"`

For the charts section, the `DashboardContactFrequencyWidget` shares the same grid as `DashboardQuickTasksWidget`. When `quickTasks` is off, only the contact frequency widget should show. Gate individually:
- `DashboardQuickTasksWidget` → `v-if="dashboardLayout.widgets.quickTasks"` on the component
- `DashboardContactFrequencyWidget` → always visible (not in settings)

If hiding both charts would leave an empty `<section>`, use `v-if` on the section itself.

**Step 4: Run type-check**
```bash
npm run type-check
```
Expected: no errors

**Step 5: Run tests**
```bash
npm run test -- dashboard
```
Expected: existing tests pass

**Step 6: Commit**
```bash
git add pages/dashboard.vue
git commit -m "feat: wire dashboard layout preferences to widget visibility"
```

---

### Task 2: Add "Coming Soon" badges to `pages/settings/dashboard.vue`

**Files:**
- Modify: `pages/settings/dashboard.vue`

**Coming Soon items in stats cards:** `performance`, `notifications`, `socialMedia`
**Coming Soon items in widgets:** `offerStatusOverview`, `recentDocuments`, `interactionStats`, `coachResponsiveness`, `upcomingDeadlines`, `recruitingCalendar`

For each coming-soon `<label>`, add `opacity-50 cursor-not-allowed` to the label, `disabled` to the `<input>`, and a badge after the title span:

```html
<label class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed">
  <input
    type="checkbox"
    class="w-4 h-4 text-blue-600 rounded-sm"
    disabled
  />
  <span class="flex-1">
    <span class="font-medium text-gray-900 flex items-center gap-2">
      📊 Performance
      <span class="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Coming soon</span>
    </span>
    <p class="text-xs text-gray-600">Recorded metrics and stats</p>
  </span>
</label>
```

Do NOT bind `v-model` on disabled items (remove it).

**Step 1: Update the 3 coming-soon stat card labels**

Replace the `performance`, `notifications`, and `socialMedia` labels with the disabled/badged version above.

**Step 2: Update the 6 coming-soon widget labels**

Replace `offerStatusOverview`, `recentDocuments`, `interactionStats`, `coachResponsiveness`, `upcomingDeadlines`, `recruitingCalendar` labels similarly.

**Step 3: Run lint**
```bash
npm run lint
```
Expected: no errors

**Step 4: Commit**
```bash
git add pages/settings/dashboard.vue
git commit -m "feat: mark unimplemented dashboard widgets as coming soon in settings"
```

---

### Task 3: Add unit tests for dashboard layout visibility

**Files:**
- Modify: `tests/unit/pages/dashboard.spec.ts`

Add a new `describe` block for dashboard layout. Since the page is too complex to mount in isolation, test the layout logic directly — the `computed(() => getDashboardLayout())` pattern given a mocked preferences state.

```typescript
describe("Dashboard layout preferences", () => {
  it("getDashboardLayout returns defaults when no preferences saved", () => {
    const { getDashboardLayout } = usePreferenceManager();
    const layout = getDashboardLayout();
    expect(layout.statsCards.coaches).toBe(true);
    expect(layout.widgets.atAGlanceSummary).toBe(true);
  });

  it("getDashboardLayout reflects saved preferences", () => {
    const { getDashboardLayout, dashboardPrefs } = usePreferenceManager();
    dashboardPrefs.updatePreferences({
      statsCards: { coaches: false, schools: true, interactions: true, offers: true, events: true, performance: true, notifications: true, socialMedia: true },
      widgets: { atAGlanceSummary: false, interactionTrendChart: true, schoolInterestChart: true, schoolMapWidget: true, coachFollowupWidget: true, performanceSummary: true, quickTasks: true, eventsSummary: true, recentNotifications: true, schoolStatusOverview: true, linkedAccounts: true, offerStatusOverview: true, recentDocuments: true, interactionStats: true, coachResponsiveness: true, upcomingDeadlines: true, recruitingCalendar: true }
    });
    const layout = getDashboardLayout();
    expect(layout.statsCards.coaches).toBe(false);
    expect(layout.widgets.atAGlanceSummary).toBe(false);
  });
});
```

Mock `usePreferenceManager` dependencies at the top of the file:
```typescript
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: vi.fn() }),
}));
```

**Step 1: Run the new tests to verify they pass**
```bash
npm run test -- dashboard
```

**Step 2: Commit**
```bash
git add tests/unit/pages/dashboard.spec.ts
git commit -m "test: add unit tests for dashboard layout preference wire-up"
```
