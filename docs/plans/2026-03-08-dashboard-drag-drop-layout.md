# Dashboard Drag-and-Drop Layout Editor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the static Dashboard Customization settings page with a WYSIWYG two-column drag-and-drop editor, and make the dashboard render dynamically from the saved layout.

**Architecture:** New `DashboardLayout` type replaces `DashboardWidgetVisibility` with ordered column arrays instead of flat booleans. `vue-draggable-plus` (SortableJS wrapper) drives drag-and-drop in the settings editor. The dashboard renders widgets by iterating the saved column arrays, auto-pairing adjacent 2/6 widgets in the left column.

**Tech Stack:** Vue 3, `vue-draggable-plus`, `usePreferenceManager`, Vitest

---

### Task 1: Add new types to `types/models.ts`

**Files:**
- Modify: `types/models.ts` (around line 431 where `DashboardWidgetVisibility` lives)

**Step 1: Write the failing test**

Create `tests/unit/types/dashboardLayout.spec.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { WIDGET_SIZES, WIDGET_LABELS } from "~/types/models";

describe("DashboardLayout types", () => {
  it("WIDGET_SIZES covers all 11 live widget ids", () => {
    const ids = Object.keys(WIDGET_SIZES);
    expect(ids).toContain("interactionTrendChart");
    expect(ids).toContain("schoolMapWidget");
    expect(ids).toContain("atAGlanceSummary");
    expect(ids).toHaveLength(11);
  });

  it("WIDGET_LABELS has a label for every widget id", () => {
    expect(Object.keys(WIDGET_LABELS)).toEqual(Object.keys(WIDGET_SIZES));
  });

  it("only 4/6 or 2/6 sizes are used", () => {
    const sizes = Object.values(WIDGET_SIZES);
    sizes.forEach((s) => expect(["4/6", "2/6"]).toContain(s));
  });
});
```

**Step 2: Run to confirm it fails**

```bash
npm run test -- dashboardLayout
```
Expected: FAIL — `WIDGET_SIZES` not exported from `~/types/models`

**Step 3: Add new types after the existing `DashboardWidgetVisibility` interface in `types/models.ts`**

```typescript
// ---------------------------------------------------------------------------
// Dashboard Layout v2 — ordered, drag-and-drop layout
// ---------------------------------------------------------------------------

export type WidgetId =
  | "interactionTrendChart"
  | "schoolInterestChart"
  | "schoolMapWidget"
  | "performanceSummary"
  | "quickTasks"
  | "coachFollowupWidget"
  | "atAGlanceSummary"
  | "schoolStatusOverview"
  | "eventsSummary"
  | "recentNotifications"
  | "linkedAccounts";

export type WidgetSize = "4/6" | "2/6";

export const WIDGET_SIZES: Record<WidgetId, WidgetSize> = {
  interactionTrendChart: "2/6",
  schoolInterestChart: "2/6",
  schoolMapWidget: "4/6",
  performanceSummary: "4/6",
  quickTasks: "2/6",
  coachFollowupWidget: "4/6",
  atAGlanceSummary: "4/6",
  schoolStatusOverview: "2/6",
  eventsSummary: "2/6",
  recentNotifications: "2/6",
  linkedAccounts: "2/6",
} as const;

export const WIDGET_LABELS: Record<WidgetId, string> = {
  interactionTrendChart: "Interaction Trends",
  schoolInterestChart: "School Interest Chart",
  schoolMapWidget: "School Map",
  performanceSummary: "Performance Summary",
  quickTasks: "Quick Tasks",
  coachFollowupWidget: "Coach Followup",
  atAGlanceSummary: "At a Glance",
  schoolStatusOverview: "Schools by Size",
  eventsSummary: "Upcoming Events",
  recentNotifications: "Recent Activity",
  linkedAccounts: "Linked Accounts",
} as const;

export interface WidgetEntry {
  id: WidgetId;
  visible: boolean;
}

export interface DashboardLayout {
  statsCards: {
    coaches: boolean;
    schools: boolean;
    interactions: boolean;
    offers: boolean;
    events: boolean;
  };
  leftColumn: WidgetEntry[];   // 4/6 and 2/6 widgets, user-ordered
  rightColumn: WidgetEntry[];  // 2/6 widgets only, user-ordered
}
```

Also update the `UserPreferences` interface — change `dashboard_layout?: DashboardWidgetVisibility` to `dashboard_layout?: DashboardLayout`.

**Step 4: Run tests**

```bash
npm run test -- dashboardLayout
```
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add types/models.ts tests/unit/types/dashboardLayout.spec.ts
git commit -m "feat: add DashboardLayout v2 types with WidgetId, WIDGET_SIZES, WIDGET_LABELS"
```

---

### Task 2: Replace `validateDashboardLayout` and `getDefaultDashboardLayout`

**Files:**
- Modify: `utils/preferenceValidation.ts`
- Modify: `tests/unit/utils/` (create `dashboardLayout.spec.ts` here)

**Step 1: Write the failing tests**

Create `tests/unit/utils/dashboardLayout.spec.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  validateDashboardLayout,
  getDefaultDashboardLayout,
} from "~/utils/preferenceValidation";

describe("validateDashboardLayout", () => {
  it("returns null for empty object (triggers default)", () => {
    expect(validateDashboardLayout({})).toBeNull();
  });

  it("returns null for old boolean format (has 'widgets' key)", () => {
    const old = {
      statsCards: { coaches: true },
      widgets: { atAGlanceSummary: false },
    };
    expect(validateDashboardLayout(old)).toBeNull();
  });

  it("returns null for null/undefined input", () => {
    expect(validateDashboardLayout(null)).toBeNull();
    expect(validateDashboardLayout(undefined)).toBeNull();
  });

  it("returns a valid DashboardLayout for correct new format", () => {
    const input = {
      statsCards: { coaches: false, schools: true, interactions: true, offers: true, events: false },
      leftColumn: [{ id: "schoolMapWidget", visible: true }],
      rightColumn: [{ id: "eventsSummary", visible: false }],
    };
    const result = validateDashboardLayout(input);
    expect(result).not.toBeNull();
    expect(result!.statsCards.coaches).toBe(false);
    expect(result!.leftColumn[0].id).toBe("schoolMapWidget");
    expect(result!.rightColumn[0].visible).toBe(false);
  });

  it("filters out unknown widget ids from columns", () => {
    const input = {
      statsCards: { coaches: true, schools: true, interactions: true, offers: true, events: true },
      leftColumn: [
        { id: "schoolMapWidget", visible: true },
        { id: "unknownWidget", visible: true },
      ],
      rightColumn: [],
    };
    const result = validateDashboardLayout(input);
    expect(result!.leftColumn).toHaveLength(1);
    expect(result!.leftColumn[0].id).toBe("schoolMapWidget");
  });
});

describe("getDefaultDashboardLayout", () => {
  it("returns all statsCards as true", () => {
    const layout = getDefaultDashboardLayout();
    expect(layout.statsCards.coaches).toBe(true);
    expect(layout.statsCards.events).toBe(true);
  });

  it("left column contains 4/6 and 2/6 widgets in default order", () => {
    const layout = getDefaultDashboardLayout();
    const ids = layout.leftColumn.map((w) => w.id);
    expect(ids).toContain("schoolMapWidget");
    expect(ids).toContain("interactionTrendChart");
    expect(layout.leftColumn.every((w) => w.visible)).toBe(true);
  });

  it("right column contains only 2/6 widgets", () => {
    const { WIDGET_SIZES } = await import("~/types/models");
    const layout = getDefaultDashboardLayout();
    layout.rightColumn.forEach((w) => {
      expect(WIDGET_SIZES[w.id]).toBe("2/6");
    });
  });
});
```

**Step 2: Run to confirm tests fail**

```bash
npm run test -- "utils/dashboardLayout"
```
Expected: FAIL

**Step 3: Replace `validateDashboardLayout` and `getDefaultDashboardLayout` in `utils/preferenceValidation.ts`**

Update the import at the top — replace `DashboardWidgetVisibility` with `DashboardLayout` and `WidgetId`:

```typescript
import type {
  NotificationSettings,
  HomeLocation,
  PlayerDetails,
  SchoolPreferences,
  DashboardLayout,
  WidgetEntry,
  WidgetId,
} from "~/types/models";
import { WIDGET_SIZES } from "~/types/models";
```

Replace the `validateDashboardLayout` function:

```typescript
const VALID_WIDGET_IDS = new Set<string>(Object.keys(WIDGET_SIZES));

export function validateDashboardLayout(data: unknown): DashboardLayout | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  // Empty object → use defaults
  if (Object.keys(obj).length === 0) return null;

  // Old boolean format (has 'widgets' key) → use defaults
  if ("widgets" in obj) return null;

  // Needs both column arrays to be valid new format
  if (!Array.isArray(obj.leftColumn) || !Array.isArray(obj.rightColumn)) return null;

  const statsCards = (obj.statsCards || {}) as Record<string, unknown>;

  const parseColumn = (arr: unknown[]): WidgetEntry[] =>
    arr
      .filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === "object",
      )
      .filter((item) => VALID_WIDGET_IDS.has(String(item.id)))
      .map((item) => ({
        id: String(item.id) as WidgetId,
        visible: toBoolean(item.visible, true),
      }));

  return {
    statsCards: {
      coaches: toBoolean(statsCards.coaches, true),
      schools: toBoolean(statsCards.schools, true),
      interactions: toBoolean(statsCards.interactions, true),
      offers: toBoolean(statsCards.offers, true),
      events: toBoolean(statsCards.events, true),
    },
    leftColumn: parseColumn(obj.leftColumn as unknown[]),
    rightColumn: parseColumn(obj.rightColumn as unknown[]),
  };
}
```

Replace the `getDefaultDashboardLayout` function:

```typescript
export function getDefaultDashboardLayout(): DashboardLayout {
  return {
    statsCards: {
      coaches: true,
      schools: true,
      interactions: true,
      offers: true,
      events: true,
    },
    leftColumn: [
      { id: "interactionTrendChart", visible: true },
      { id: "schoolInterestChart", visible: true },
      { id: "schoolMapWidget", visible: true },
      { id: "performanceSummary", visible: true },
      { id: "quickTasks", visible: true },
      { id: "coachFollowupWidget", visible: true },
      { id: "atAGlanceSummary", visible: true },
    ],
    rightColumn: [
      { id: "schoolStatusOverview", visible: true },
      { id: "eventsSummary", visible: true },
      { id: "recentNotifications", visible: true },
      { id: "linkedAccounts", visible: true },
    ],
  };
}
```

**Step 4: Run tests**

```bash
npm run test -- "utils/dashboardLayout"
```
Expected: PASS

**Step 5: Run full test suite to catch regressions**

```bash
npm run test
```
Expected: all pass

**Step 6: Commit**

```bash
git add utils/preferenceValidation.ts tests/unit/utils/dashboardLayout.spec.ts
git commit -m "feat: replace validateDashboardLayout with ordered DashboardLayout v2"
```

---

### Task 3: Update `usePreferenceManager` types

**Files:**
- Modify: `composables/usePreferenceManager.ts`

**Step 1: Update the import** — replace `DashboardWidgetVisibility` with `DashboardLayout`:

```typescript
import type {
  NotificationSettings,
  HomeLocation,
  PlayerDetails,
  SchoolPreferences,
  DashboardLayout,
} from "~/types/models";
import {
  validateNotificationSettings,
  validateHomeLocation,
  validatePlayerDetails,
  validateSchoolPreferences,
  validateDashboardLayout,
  getDefaultNotificationSettings,
  getDefaultDashboardLayout,
} from "~/utils/preferenceValidation";
```

**Step 2: Update `getDashboardLayout` return type**

```typescript
const getDashboardLayout = (): DashboardLayout => {
  const validated = validateDashboardLayout(dashboardPrefs.preferences.value);
  return validated || getDefaultDashboardLayout();
};
```

**Step 3: Update `setDashboardLayout` parameter type**

```typescript
const setDashboardLayout = async (layout: DashboardLayout) => {
  const oldValue = validateDashboardLayout(dashboardPrefs.preferences.value);
  dashboardPrefs.updatePreferences(layout as unknown as Record<string, unknown>);
  await dashboardPrefs.savePreferences();
  if (oldValue) {
    await trackPreferenceChange("dashboard", oldValue, layout);
  }
};
```

**Step 4: Run type-check**

```bash
npm run type-check
```
Expected: no errors

**Step 5: Commit**

```bash
git add composables/usePreferenceManager.ts
git commit -m "refactor: update usePreferenceManager to use DashboardLayout v2 type"
```

---

### Task 4: Install `vue-draggable-plus`

**Step 1: Install**

```bash
npm install vue-draggable-plus
```

**Step 2: Verify it's in package.json**

```bash
grep "vue-draggable-plus" package.json
```
Expected: `"vue-draggable-plus": "^x.x.x"`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install vue-draggable-plus for drag-and-drop layout editor"
```

---

### Task 5: Create `DashboardWidgetCard` component

**Files:**
- Create: `components/Settings/DashboardWidgetCard.vue`
- Create: `tests/unit/components/Settings/DashboardWidgetCard.spec.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import DashboardWidgetCard from "~/components/Settings/DashboardWidgetCard.vue";

describe("DashboardWidgetCard", () => {
  const defaultProps = {
    id: "schoolMapWidget" as const,
    visible: true,
  };

  it("renders the widget label", () => {
    const wrapper = mount(DashboardWidgetCard, { props: defaultProps });
    expect(wrapper.text()).toContain("School Map");
  });

  it("renders the size badge", () => {
    const wrapper = mount(DashboardWidgetCard, { props: defaultProps });
    expect(wrapper.text()).toContain("4/6");
  });

  it("renders 2/6 badge for narrow widgets", () => {
    const wrapper = mount(DashboardWidgetCard, {
      props: { id: "eventsSummary", visible: true },
    });
    expect(wrapper.text()).toContain("2/6");
  });

  it("emits toggle when eye button clicked", async () => {
    const wrapper = mount(DashboardWidgetCard, { props: defaultProps });
    await wrapper.find("[data-testid='toggle-visibility']").trigger("click");
    expect(wrapper.emitted("toggle")).toBeTruthy();
  });

  it("dims card when not visible", () => {
    const wrapper = mount(DashboardWidgetCard, {
      props: { id: "schoolMapWidget", visible: false },
    });
    expect(wrapper.classes()).toContain("opacity-50");
  });

  it("shows Coming Soon badge and disables toggle when disabled prop is true", () => {
    const wrapper = mount(DashboardWidgetCard, {
      props: { id: "schoolMapWidget", visible: true, disabled: true },
    });
    expect(wrapper.text()).toContain("Coming soon");
    expect(wrapper.find("[data-testid='toggle-visibility']").exists()).toBe(false);
  });
});
```

**Step 2: Run to confirm tests fail**

```bash
npm run test -- DashboardWidgetCard
```
Expected: FAIL

**Step 3: Create the component**

```vue
<template>
  <div
    :class="[
      'flex items-center gap-3 p-3 rounded-lg border bg-white select-none',
      visible ? 'border-slate-200' : 'border-slate-200 opacity-50',
      disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
    ]"
  >
    <!-- Drag handle -->
    <Bars3Icon
      v-if="!disabled"
      class="w-4 h-4 text-slate-400 shrink-0 drag-handle"
      aria-hidden="true"
    />
    <div v-else class="w-4 h-4 shrink-0" />

    <!-- Label -->
    <span class="flex-1 text-sm font-medium text-slate-800 truncate">
      {{ WIDGET_LABELS[id] }}
    </span>

    <!-- Size badge -->
    <span class="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">
      {{ WIDGET_SIZES[id] }}
    </span>

    <!-- Coming soon badge -->
    <span
      v-if="disabled"
      class="text-xs font-medium bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full shrink-0"
    >
      Coming soon
    </span>

    <!-- Visibility toggle -->
    <button
      v-else
      data-testid="toggle-visibility"
      type="button"
      :aria-label="visible ? 'Hide widget' : 'Show widget'"
      class="shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
      @click.stop="$emit('toggle')"
    >
      <EyeIcon v-if="visible" class="w-4 h-4" />
      <EyeSlashIcon v-else class="w-4 h-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { EyeIcon, EyeSlashIcon } from "@heroicons/vue/24/outline";
import { Bars3Icon } from "@heroicons/vue/24/solid";
import { WIDGET_SIZES, WIDGET_LABELS } from "~/types/models";
import type { WidgetId } from "~/types/models";

defineProps<{
  id: WidgetId;
  visible: boolean;
  disabled?: boolean;
}>();

defineEmits<{
  toggle: [];
}>();
</script>
```

**Step 4: Run tests**

```bash
npm run test -- DashboardWidgetCard
```
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add components/Settings/DashboardWidgetCard.vue tests/unit/components/Settings/DashboardWidgetCard.spec.ts
git commit -m "feat: add DashboardWidgetCard component for drag-and-drop settings editor"
```

---

### Task 6: Rewrite `pages/settings/dashboard.vue`

**Files:**
- Modify: `pages/settings/dashboard.vue` (full rewrite)

The page has two sections:
1. **Stats bar** — toggle row for 5 stat cards (unchanged behavior)
2. **Column editor** — two `VueDraggable` lists side by side

**Step 1: Write the full new page**

```vue
<template>
  <div class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100">
    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink
          to="/settings"
          class="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition mb-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back to Settings
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-slate-900">Dashboard Customization</h1>
        <p class="text-slate-600">
          Drag widgets to reorder. Click the eye to show or hide.
        </p>
      </div>
    </div>

    <main class="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <!-- Stats Bar toggles -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Summary Statistics
        </h2>
        <div class="flex flex-wrap gap-3">
          <label
            v-for="card in STAT_CARDS"
            :key="card.key"
            class="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition select-none"
            :class="layout.statsCards[card.key] ? 'bg-white' : 'bg-slate-50 opacity-60'"
          >
            <input
              v-model="layout.statsCards[card.key]"
              type="checkbox"
              class="w-4 h-4 text-blue-600 rounded-sm"
              @change="scheduleSave"
            />
            <span class="text-sm font-medium text-slate-800">{{ card.label }}</span>
          </label>
        </div>
      </div>

      <!-- Column editor -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left column (4/6 wide on dashboard) -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Main Column
          </h2>
          <p class="text-xs text-slate-400 mb-4">Accepts wide (4/6) and narrow (2/6) widgets. Narrow widgets pair side-by-side.</p>

          <VueDraggable
            v-model="layout.leftColumn"
            :group="leftGroup"
            handle=".drag-handle"
            item-key="id"
            class="min-h-24 space-y-2"
            ghost-class="opacity-40"
            @end="scheduleSave"
          >
            <template #item="{ element }">
              <DashboardWidgetCard
                :id="element.id"
                :visible="element.visible"
                :data-size="WIDGET_SIZES[element.id]"
                @toggle="toggleWidget(layout.leftColumn, element.id)"
              />
            </template>
          </VueDraggable>

          <p v-if="layout.leftColumn.length === 0" class="text-sm text-slate-400 text-center py-6">
            Drag widgets here
          </p>
        </div>

        <!-- Right column (2/6 wide on dashboard — sidebar) -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Sidebar
          </h2>
          <p class="text-xs text-slate-400 mb-4">Narrow (2/6) widgets only.</p>

          <VueDraggable
            v-model="layout.rightColumn"
            :group="rightGroup"
            handle=".drag-handle"
            item-key="id"
            class="min-h-24 space-y-2"
            ghost-class="opacity-40"
            @end="scheduleSave"
          >
            <template #item="{ element }">
              <DashboardWidgetCard
                :id="element.id"
                :visible="element.visible"
                :data-size="WIDGET_SIZES[element.id]"
                @toggle="toggleWidget(layout.rightColumn, element.id)"
              />
            </template>
          </VueDraggable>

          <p v-if="layout.rightColumn.length === 0" class="text-sm text-slate-400 text-center py-6">
            Drag widgets here
          </p>
        </div>
      </div>

      <!-- Coming Soon section -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Coming Soon
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <DashboardWidgetCard
            v-for="id in COMING_SOON_IDS"
            :key="id"
            :id="id"
            :visible="true"
            :disabled="true"
          />
        </div>
      </div>

      <!-- Reset -->
      <div class="flex justify-between items-center">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          @click="resetToDefaults"
        >
          Reset to Defaults
        </button>
        <p v-if="saveStatus === 'saved'" class="text-sm text-green-600 font-medium">
          ✓ Saved
        </p>
        <p v-if="saveStatus === 'error'" class="text-sm text-red-600 font-medium">
          Failed to save
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import { VueDraggable } from "vue-draggable-plus";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { getDefaultDashboardLayout } from "~/utils/preferenceValidation";
import { WIDGET_SIZES } from "~/types/models";
import type { WidgetEntry, DashboardLayout } from "~/types/models";
import DashboardWidgetCard from "~/components/Settings/DashboardWidgetCard.vue";

definePageMeta({ middleware: "auth" });

// Widget IDs that have no dashboard component yet
const COMING_SOON_IDS = [
  "offerStatusOverview",
  "recentDocuments",
  "interactionStats",
  "coachResponsiveness",
  "upcomingDeadlines",
  "recruitingCalendar",
] as const;

const STAT_CARDS = [
  { key: "coaches" as const, label: "👥 Coaches" },
  { key: "schools" as const, label: "🏫 Schools" },
  { key: "interactions" as const, label: "💬 Interactions" },
  { key: "offers" as const, label: "📝 Offers" },
  { key: "events" as const, label: "📅 Events" },
];

// SortableJS group config — right column rejects 4/6 widgets
const leftGroup = { name: "dashboard", pull: true, put: true };
const rightGroup = {
  name: "dashboard",
  pull: true,
  put: (_to: unknown, _from: unknown, dragEl: HTMLElement) =>
    dragEl.dataset.size === "2/6",
};

const { getDashboardLayout, setDashboardLayout, dashboardPrefs } =
  usePreferenceManager();

const layout = reactive<DashboardLayout>(getDefaultDashboardLayout());
const saveStatus = ref<"idle" | "saved" | "error">("idle");
let saveTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(async () => {
  await dashboardPrefs.loadPreferences();
  const saved = getDashboardLayout();
  layout.statsCards = saved.statsCards;
  layout.leftColumn = saved.leftColumn;
  layout.rightColumn = saved.rightColumn;
});

const toggleWidget = (column: WidgetEntry[], id: string) => {
  const entry = column.find((w) => w.id === id);
  if (entry) entry.visible = !entry.visible;
  scheduleSave();
};

const scheduleSave = () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await setDashboardLayout({ ...layout });
      saveStatus.value = "saved";
      setTimeout(() => (saveStatus.value = "idle"), 2000);
    } catch {
      saveStatus.value = "error";
    }
  }, 800);
};

const resetToDefaults = () => {
  const defaults = getDefaultDashboardLayout();
  layout.statsCards = defaults.statsCards;
  layout.leftColumn = defaults.leftColumn;
  layout.rightColumn = defaults.rightColumn;
  scheduleSave();
};
</script>
```

**Step 2: Run type-check**

```bash
npm run type-check
```
Expected: no errors

**Step 3: Run lint**

```bash
npm run lint
```
Expected: no errors

**Step 4: Commit**

```bash
git add pages/settings/dashboard.vue
git commit -m "feat: rewrite dashboard settings page as WYSIWYG drag-and-drop layout editor"
```

---

### Task 7: Rewrite `pages/dashboard.vue` — dynamic widget rendering

**Files:**
- Modify: `pages/dashboard.vue`

The dashboard's static hardcoded widget list is replaced by a dynamic render loop that reads `leftColumn` and `rightColumn` from the saved layout.

**Step 1: Add a widget component map and props helper after existing imports in the `<script setup>` block**

Add these imports (some are already imported via auto-import, add any missing):

```typescript
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { WIDGET_SIZES } from "~/types/models";
import type { WidgetId, WidgetEntry } from "~/types/models";
import { getDefaultDashboardLayout } from "~/utils/preferenceValidation";
import type { Component } from "vue";
```

Add after the logger line:

```typescript
// --- Dashboard layout preferences ---
const { getDashboardLayout, dashboardPrefs } = usePreferenceManager();
const dashboardLayout = computed(() => getDashboardLayout());

onMounted(async () => {
  await dashboardPrefs.loadPreferences();
});

// Map widget id → component
const WIDGET_COMPONENTS: Record<WidgetId, Component> = {
  interactionTrendChart: defineAsyncComponent(() =>
    import("~/components/Dashboard/DashboardInteractionTrendChart.vue")
  ),
  schoolInterestChart: defineAsyncComponent(() =>
    import("~/components/Dashboard/DashboardSchoolInterestChart.vue")
  ),
  schoolMapWidget: defineAsyncComponent(() =>
    import("~/components/Dashboard/DashboardSchoolMapWidget.vue")
  ),
  performanceSummary: defineAsyncComponent(() =>
    import("~/components/Dashboard/DashboardPerformanceMetricsWidget.vue")
  ),
  quickTasks: defineAsyncComponent(() =>
    import("~/components/Dashboard/DashboardQuickTasksWidget.vue")
  ),
  coachFollowupWidget: defineAsyncComponent(() =>
    import("~/components/Dashboard/DashboardCoachFollowupWidget.vue")
  ),
  atAGlanceSummary: defineAsyncComponent(() =>
    import("~/components/Dashboard/DashboardAtAGlanceSummary.vue")
  ),
  schoolStatusOverview: defineAsyncComponent(() =>
    import("~/components/Dashboard/DashboardSchoolsBySizeWidget.vue")
  ),
  eventsSummary: defineAsyncComponent(() =>
    import("~/components/Dashboard/DashboardUpcomingEventsWidget.vue")
  ),
  recentNotifications: defineAsyncComponent(() =>
    import("~/components/Dashboard/DashboardRecentActivityFeed.vue")
  ),
  linkedAccounts: defineAsyncComponent(() =>
    import("~/components/Dashboard/DashboardSocialMediaWidget.vue")
  ),
};

// Return the right props for each widget
const getWidgetProps = (id: WidgetId): Record<string, unknown> => {
  switch (id) {
    case "interactionTrendChart":
      return { interactions: allInteractions.value };
    case "schoolInterestChart":
      return { schools: allSchools.value };
    case "schoolMapWidget":
      return { schools: allSchools.value };
    case "performanceSummary":
      return { metrics: allMetrics.value, topMetrics: topMetrics.value, showPerformance: true };
    case "quickTasks":
      return {
        tasks: tasks.value ?? [],
        showTasks: true,
        onAddTask: addTask,
        onToggleTask: toggleTask,
        onDeleteTask: deleteTask,
        onClearCompleted: () => userTasksComposable?.clearCompleted(),
      };
    case "coachFollowupWidget":
      return {};
    case "atAGlanceSummary":
      return {
        coaches: allCoaches.value,
        schools: allSchools.value,
        interactions: allInteractions.value,
        offers: allOffers.value,
      };
    case "schoolStatusOverview":
      return { breakdown: schoolSizeBreakdown.value, count: schoolCount.value };
    case "eventsSummary":
      return { events: upcomingEvents.value, showEvents: true };
    case "recentNotifications":
      return {};
    case "linkedAccounts":
      return { showSocial: true };
    default:
      return {};
  }
};

// Group visible left column entries: pair consecutive 2/6 widgets
const leftColumnGroups = computed(() => {
  const visible = dashboardLayout.value.leftColumn.filter((w) => w.visible);
  const groups: Array<{ type: "single"; entry: WidgetEntry } | { type: "pair"; entries: [WidgetEntry, WidgetEntry] }> = [];
  let i = 0;
  while (i < visible.length) {
    const current = visible[i];
    if (WIDGET_SIZES[current.id] === "2/6") {
      const next = visible[i + 1];
      if (next && WIDGET_SIZES[next.id] === "2/6") {
        groups.push({ type: "pair", entries: [current, next] });
        i += 2;
        continue;
      }
    }
    groups.push({ type: "single", entry: current });
    i++;
  }
  return groups;
});

const rightColumnVisible = computed(() =>
  dashboardLayout.value.rightColumn.filter((w) => w.visible)
);
```

**Step 2: Replace the hardcoded template with a dynamic render**

Replace the `<!-- Main content + persistent sidebar -->` `<div class="grid ...">` block (and everything inside it up to the Email modal) with:

```html
<!-- Main content + persistent sidebar -->
<div class="grid grid-cols-1 lg:grid-cols-6 gap-6">
  <!-- Left: main content (4 cols) -->
  <div class="lg:col-span-4 space-y-6">
    <!-- Action Items — always visible -->
    <section aria-labelledby="suggestions-heading">
      <h2 id="suggestions-heading" class="sr-only">Recommended Actions</h2>
      <DashboardSuggestions
        :suggestions="dashboardSuggestions || []"
        :is-viewing-as-parent="isViewingAsParent || false"
        :athlete-name="activeAthleteName"
        @dismiss="handleSuggestionDismiss"
      />
    </section>

    <!-- Dynamic left column widgets -->
    <template v-for="group in leftColumnGroups" :key="group.type === 'pair' ? group.entries[0].id : group.entry.id">
      <!-- Pair of 2/6 widgets -->
      <div v-if="group.type === 'pair'" class="grid grid-cols-2 gap-6">
        <Suspense v-for="entry in group.entries" :key="entry.id">
          <component :is="WIDGET_COMPONENTS[entry.id]" v-bind="getWidgetProps(entry.id)" />
          <template #fallback>
            <div class="animate-pulse bg-gray-200 h-64 rounded-lg" />
          </template>
        </Suspense>
      </div>

      <!-- Single 4/6 (or lone 2/6) widget -->
      <div v-else :class="WIDGET_SIZES[group.entry.id] === '2/6' ? 'grid grid-cols-2 gap-6' : ''">
        <Suspense>
          <component :is="WIDGET_COMPONENTS[group.entry.id]" v-bind="getWidgetProps(group.entry.id)" />
          <template #fallback>
            <div class="animate-pulse bg-gray-200 h-64 rounded-lg" />
          </template>
        </Suspense>
      </div>
    </template>
  </div>

  <!-- Right: persistent sidebar (2 cols) -->
  <aside class="lg:col-span-2 space-y-6" aria-label="Dashboard sidebar">
    <!-- Always-visible sidebar widgets -->
    <DashboardRecruitingPacketWidget
      :recruiting-packet-loading="recruitingPacketLoading"
      :recruiting-packet-error="recruitingPacketError"
      :has-generated-packet="hasGeneratedPacket"
      @generate-packet="handleGeneratePacket"
      @email-packet="handleEmailPacket"
    />
    <DashboardContactFrequencyWidget
      :interactions="allInteractions"
      :schools="allSchools"
    />

    <!-- Dynamic right column widgets -->
    <template v-for="entry in rightColumnVisible" :key="entry.id">
      <Suspense>
        <component :is="WIDGET_COMPONENTS[entry.id]" v-bind="getWidgetProps(entry.id)" />
        <template #fallback>
          <div class="animate-pulse bg-gray-200 h-40 rounded-lg" />
        </template>
      </Suspense>
    </template>

    <!-- Parent-only widget — always last -->
    <DashboardAthleteActivityWidget v-if="userStore.isParent" />
  </aside>
</div>
```

Remove the now-unused static component imports (the ones that are now in `WIDGET_COMPONENTS`). Keep: `ParentContextBanner`, `ParentOnboardingBanner`, `DashboardTimelineCard`, `DashboardStatsCards`, `DashboardSuggestions`, `EmailRecruitingPacketModal`.

Also remove the old `v-if` guards added in the previous session (they're no longer needed — the dynamic loop handles visibility).

**Step 3: Run type-check**

```bash
npm run type-check
```
Expected: no errors

**Step 4: Run lint**

```bash
npm run lint
```
Expected: no errors

**Step 5: Run tests**

```bash
npm run test
```
Expected: all pass

**Step 6: Commit**

```bash
git add pages/dashboard.vue
git commit -m "feat: render dashboard widgets dynamically from saved layout preferences"
```

---

### Task 8: Final verification

**Step 1: Run full test suite**

```bash
npm run test
```
Expected: all pass, no regressions

**Step 2: Run type-check**

```bash
npm run type-check
```
Expected: exit 0

**Step 3: Run lint**

```bash
npm run lint
```
Expected: exit 0

**Step 4: Commit if any lint auto-fixes were applied**

```bash
git add -p
git commit -m "chore: apply lint auto-fixes"
```
