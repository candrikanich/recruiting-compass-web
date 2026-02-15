# Timeline Task-First Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize the `/timeline` page so tasks are the hero content (left 2/3), guidance moves to a collapsible sidebar (right 1/3), and sidebar widgets are replaced by compact stat pills.

**Architecture:** Reuse existing components with minimal changes. Create one new component (`TimelineStatPills`). Add collapse/expand toggle to 4 guidance cards. Rewire the page layout in `pages/timeline/index.vue`.

**Tech Stack:** Vue 3 (Composition API), TailwindCSS, Vitest + @vue/test-utils

---

### Task 1: Create TimelineStatPills Component

**Files:**
- Create: `components/Timeline/TimelineStatPills.vue`
- Test: `tests/unit/components/Timeline/TimelineStatPills.spec.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/components/Timeline/TimelineStatPills.spec.ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import TimelineStatPills from "~/components/Timeline/TimelineStatPills.vue";

describe("TimelineStatPills", () => {
  const defaultProps = {
    statusScore: 72,
    statusLabel: "on_track" as const,
    taskCompleted: 8,
    taskTotal: 24,
    milestonesCompleted: 3,
    milestonesTotal: 5,
  };

  it("renders all three stat pills", () => {
    const wrapper = mount(TimelineStatPills, { props: defaultProps });
    expect(wrapper.text()).toContain("72");
    expect(wrapper.text()).toContain("8/24");
    expect(wrapper.text()).toContain("3/5");
  });

  it("shows green dot for on_track status", () => {
    const wrapper = mount(TimelineStatPills, { props: defaultProps });
    expect(wrapper.find("[data-testid='status-dot']").classes()).toContain("bg-emerald-500");
  });

  it("shows amber dot for slightly_behind status", () => {
    const wrapper = mount(TimelineStatPills, {
      props: { ...defaultProps, statusLabel: "slightly_behind" },
    });
    expect(wrapper.find("[data-testid='status-dot']").classes()).toContain("bg-amber-500");
  });

  it("shows red dot for at_risk status", () => {
    const wrapper = mount(TimelineStatPills, {
      props: { ...defaultProps, statusLabel: "at_risk" },
    });
    expect(wrapper.find("[data-testid='status-dot']").classes()).toContain("bg-red-500");
  });

  it("computes task progress percentage correctly", () => {
    const wrapper = mount(TimelineStatPills, { props: defaultProps });
    // 8/24 = 33%
    expect(wrapper.text()).toContain("33%");
  });

  it("handles zero tasks gracefully", () => {
    const wrapper = mount(TimelineStatPills, {
      props: { ...defaultProps, taskCompleted: 0, taskTotal: 0 },
    });
    expect(wrapper.text()).toContain("0/0");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/components/Timeline/TimelineStatPills.spec.ts`
Expected: FAIL — component doesn't exist yet

**Step 3: Write the component**

```vue
<!-- components/Timeline/TimelineStatPills.vue -->
<template>
  <div class="grid grid-cols-3 gap-3 mb-6">
    <!-- Overall Score -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
      <div class="text-xs text-slate-500 mb-1">Status</div>
      <div class="flex items-center gap-2">
        <div
          data-testid="status-dot"
          class="w-2.5 h-2.5 rounded-full flex-shrink-0"
          :class="statusDotClass"
        />
        <span class="text-lg font-bold text-slate-900">{{ statusScore }}</span>
        <span class="text-sm text-slate-500">/100</span>
      </div>
    </div>

    <!-- Task Progress -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
      <div class="text-xs text-slate-500 mb-1">Tasks</div>
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold text-slate-900"
          >{{ taskCompleted }}/{{ taskTotal }}</span
        >
        <span class="text-sm text-slate-500">{{ taskPercent }}%</span>
      </div>
      <div class="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          class="h-full bg-blue-500 transition-all duration-300"
          :style="{ width: `${taskPercent}%` }"
        />
      </div>
    </div>

    <!-- Milestone Progress -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
      <div class="text-xs text-slate-500 mb-1">Milestones</div>
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold text-slate-900"
          >{{ milestonesCompleted }}/{{ milestonesTotal }}</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { StatusLabel } from "~/types/timeline";

interface Props {
  statusScore: number;
  statusLabel: StatusLabel;
  taskCompleted: number;
  taskTotal: number;
  milestonesCompleted: number;
  milestonesTotal: number;
}

const props = defineProps<Props>();

const statusDotClass = computed(() => {
  const colors: Record<StatusLabel, string> = {
    on_track: "bg-emerald-500",
    slightly_behind: "bg-amber-500",
    at_risk: "bg-red-500",
  };
  return colors[props.statusLabel];
});

const taskPercent = computed(() => {
  if (props.taskTotal === 0) return 0;
  return Math.round((props.taskCompleted / props.taskTotal) * 100);
});
</script>
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/components/Timeline/TimelineStatPills.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add components/Timeline/TimelineStatPills.vue tests/unit/components/Timeline/TimelineStatPills.spec.ts
git commit -m "feat: add TimelineStatPills component for compact metrics display"
```

---

### Task 2: Add Collapse/Expand Toggle to Guidance Cards

**Files:**
- Modify: `components/Timeline/WhatMattersNow.vue`
- Modify: `components/Timeline/UpcomingMilestones.vue`
- Modify: `components/Timeline/CommonWorries.vue`
- Modify: `components/Timeline/WhatNotToStress.vue`
- Modify: `tests/unit/components/Timeline/WhatMattersNow.spec.ts`
- Modify: `tests/unit/components/Timeline/UpcomingMilestones.spec.ts`
- Modify: `tests/unit/components/Timeline/CommonWorries.spec.ts`
- Modify: `tests/unit/components/Timeline/WhatNotToStress.spec.ts`

**Step 1: Write failing tests for collapse behavior**

Add to each existing spec file a test for collapse/expand. Example for WhatMattersNow:

```typescript
// Add to tests/unit/components/Timeline/WhatMattersNow.spec.ts
it("renders collapsed when collapsed prop is true", () => {
  const wrapper = mount(WhatMattersNow, {
    props: {
      priorities: [
        { taskId: "t1", title: "Do thing", whyItMatters: "reason", category: "academic-standing", priority: 10, isRequired: true },
      ],
      phaseLabel: "Freshman",
      collapsed: true,
    },
  });
  // Header visible, content hidden
  expect(wrapper.text()).toContain("What Matters Right Now");
  expect(wrapper.text()).not.toContain("Do thing");
});

it("emits toggle when header is clicked", async () => {
  const wrapper = mount(WhatMattersNow, {
    props: {
      priorities: [],
      phaseLabel: "Freshman",
      collapsed: false,
    },
  });
  await wrapper.find("[data-testid='guidance-header']").trigger("click");
  expect(wrapper.emitted("toggle")).toBeTruthy();
});
```

Repeat similar pattern for all 4 guidance cards.

**Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/components/Timeline/WhatMattersNow.spec.ts tests/unit/components/Timeline/UpcomingMilestones.spec.ts tests/unit/components/Timeline/CommonWorries.spec.ts tests/unit/components/Timeline/WhatNotToStress.spec.ts`
Expected: FAIL — `collapsed` prop not recognized, `data-testid='guidance-header'` not found

**Step 3: Add collapsed prop and toggle to each component**

For each guidance card, apply this pattern:

1. Add `collapsed` prop (default `false`) and `toggle` emit
2. Wrap the header in a clickable `<button data-testid="guidance-header">` with a chevron
3. Wrap the content body in `<div v-if="!collapsed">`

Example modification for `WhatMattersNow.vue`:

```vue
<!-- Replace the header div with a clickable button -->
<button
  data-testid="guidance-header"
  @click="$emit('toggle')"
  class="flex items-center justify-between w-full mb-4"
>
  <div class="flex items-center gap-2">
    <span class="text-2xl">⚡</span>
    <h3 class="text-lg font-bold text-slate-900">What Matters Right Now</h3>
  </div>
  <svg
    :class="{ 'rotate-180': !collapsed }"
    class="w-5 h-5 text-slate-400 transition-transform"
    fill="none" stroke="currentColor" viewBox="0 0 24 24"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
  </svg>
</button>

<!-- Wrap content in v-if -->
<Transition name="slide-fade">
  <div v-if="!collapsed">
    <p class="text-sm text-slate-600 mb-4">{{ phaseLabel }} year priorities to focus on</p>
    <!-- ...existing priority list... -->
  </div>
</Transition>
```

Add to script setup:
```typescript
interface Props {
  priorities: WhatMattersItem[];
  phaseLabel: string;
  collapsed?: boolean;
}

withDefaults(defineProps<Props>(), {
  collapsed: false,
});

defineEmits<{
  "priority-click": [taskId: string];
  toggle: [];
}>();
```

Apply same pattern to `UpcomingMilestones.vue`, `CommonWorries.vue`, and `WhatNotToStress.vue`. Each gets:
- `collapsed?: boolean` prop (default `false`)
- `toggle` emit
- Clickable header with `data-testid="guidance-header"`
- Content wrapped in `<div v-if="!collapsed">`

**Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/unit/components/Timeline/WhatMattersNow.spec.ts tests/unit/components/Timeline/UpcomingMilestones.spec.ts tests/unit/components/Timeline/CommonWorries.spec.ts tests/unit/components/Timeline/WhatNotToStress.spec.ts`
Expected: PASS (existing tests still pass, new collapse tests pass)

**Step 5: Commit**

```bash
git add components/Timeline/WhatMattersNow.vue components/Timeline/UpcomingMilestones.vue components/Timeline/CommonWorries.vue components/Timeline/WhatNotToStress.vue tests/unit/components/Timeline/
git commit -m "feat: add collapse/expand toggle to all guidance cards"
```

---

### Task 3: Rewire Timeline Page Layout

**Files:**
- Modify: `pages/timeline/index.vue`

**Step 1: Write failing test for new layout**

This is a page-level integration change. Write a snapshot/structure test:

```typescript
// tests/unit/pages/timeline-layout.spec.ts
import { describe, it, expect, vi } from "vitest";

// Mock the composables
vi.mock("~/composables/useTasks", () => ({
  useTasks: () => ({
    tasksWithStatus: ref([]),
    updateTaskStatus: vi.fn(),
    loading: ref(false),
    error: ref(null),
    fetchTasksWithStatus: vi.fn(),
  }),
}));
vi.mock("~/composables/usePhaseCalculation", () => ({
  usePhaseCalculation: () => ({
    currentPhase: ref("sophomore"),
    milestoneProgress: ref({ completed: [1, 2, 3], required: [1, 2, 3, 4, 5], remaining: [4, 5], percentComplete: 60 }),
    canAdvance: ref(false),
    loading: ref(false),
    error: ref(null),
    fetchPhase: vi.fn(),
    advancePhase: vi.fn(),
  }),
}));
vi.mock("~/composables/useStatusScore", () => ({
  useStatusScore: () => ({
    statusScore: ref(72),
    statusLabel: ref("on_track"),
    scoreBreakdown: ref(null),
    loading: ref(false),
    error: ref(null),
    fetchStatusScore: vi.fn(),
    advice: ref(""),
    weakestAreas: ref([]),
    strongestAreas: ref([]),
    getNextActions: vi.fn(() => []),
  }),
}));

import { ref } from "vue";
import { mount } from "@vue/test-utils";
import TimelinePage from "~/pages/timeline/index.vue";

describe("Timeline Page Layout", () => {
  it("renders stat pills before phase cards", () => {
    const wrapper = mount(TimelinePage, {
      global: { stubs: { PhaseCardInline: true, WhatMattersNow: true, CommonWorries: true, WhatNotToStress: true, UpcomingMilestones: true, TimelineStatPills: true } },
    });
    expect(wrapper.findComponent({ name: "TimelineStatPills" }).exists()).toBe(true);
  });

  it("does not render PortfolioHealth or OverallStatusCard", () => {
    const wrapper = mount(TimelinePage, {
      global: { stubs: { PhaseCardInline: true, WhatMattersNow: true, CommonWorries: true, WhatNotToStress: true, UpcomingMilestones: true, TimelineStatPills: true } },
    });
    expect(wrapper.findComponent({ name: "PortfolioHealth" }).exists()).toBe(false);
    expect(wrapper.findComponent({ name: "OverallStatusCard" }).exists()).toBe(false);
  });

  it("renders guidance cards in right sidebar column", () => {
    const wrapper = mount(TimelinePage, {
      global: { stubs: { PhaseCardInline: true, WhatMattersNow: true, CommonWorries: true, WhatNotToStress: true, UpcomingMilestones: true, TimelineStatPills: true } },
    });
    const sidebar = wrapper.find("[data-testid='guidance-sidebar']");
    expect(sidebar.exists()).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/pages/timeline-layout.spec.ts`
Expected: FAIL

**Step 3: Rewrite the page layout**

In `pages/timeline/index.vue`, replace the `<!-- Content Section -->` block (lines 78-312) with the new layout:

**Key changes:**
1. Remove the top guidance grid (rows 1 and 2, lines 80-96)
2. Replace the main grid structure:
   - Left column (`lg:col-span-2`): `TimelineStatPills` + 4 phase cards
   - Right column: 4 guidance cards with collapse toggles
3. Remove sidebar widgets: `PortfolioHealth`, `OverallStatusCard`, Status Breakdown inline, Milestone Progress inline
4. Remove imports for `PortfolioHealth` and `OverallStatusCard`
5. Add `TimelineStatPills` import
6. Add collapse state refs for guidance cards:
   ```typescript
   const whatMattersCollapsed = ref(false); // starts expanded
   const milestonesCollapsed = ref(true);
   const worriesCollapsed = ref(true);
   const stressCollapsed = ref(true);
   ```
7. Add computed values for stat pills:
   ```typescript
   const taskCompletedCount = computed(() =>
     tasksWithStatus.value.filter(t => t.athlete_task?.status === "completed").length
   );
   const taskTotalCount = computed(() => tasksWithStatus.value.length);
   const milestonesCompletedCount = computed(() => milestoneProgress.value?.completed?.length ?? 0);
   const milestonesTotalCount = computed(() => milestoneProgress.value?.required?.length ?? 0);
   ```

New template structure (Content Section):

```html
<div v-else>
  <!-- Main Grid: Tasks (2/3) + Guidance Sidebar (1/3) -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Left Column: Stat Pills + Phase Cards -->
    <div class="lg:col-span-2 space-y-6">
      <!-- Stat Pills -->
      <TimelineStatPills
        :status-score="statusScore"
        :status-label="statusLabel"
        :task-completed="taskCompletedCount"
        :task-total="taskTotalCount"
        :milestones-completed="milestonesCompletedCount"
        :milestones-total="milestonesTotalCount"
      />

      <!-- Phase Cards (same as before, current phase expanded) -->
      <PhaseCardInline ... />  <!-- Freshman -->
      <PhaseCardInline ... />  <!-- Sophomore -->
      <PhaseCardInline ... />  <!-- Junior -->
      <PhaseCardInline ... />  <!-- Senior -->
    </div>

    <!-- Right Column: Guidance Sidebar -->
    <div data-testid="guidance-sidebar" class="space-y-4">
      <WhatMattersNow
        :priorities="whatMattersNow"
        :phase-label="getPhaseDisplayName(currentPhase)"
        :collapsed="whatMattersCollapsed"
        @toggle="whatMattersCollapsed = !whatMattersCollapsed"
        @priority-click="handlePriorityClick"
      />
      <UpcomingMilestones
        :milestones="upcomingMilestones"
        :collapsed="milestonesCollapsed"
        @toggle="milestonesCollapsed = !milestonesCollapsed"
      />
      <CommonWorries
        :worries="commonWorries"
        :collapsed="worriesCollapsed"
        @toggle="worriesCollapsed = !worriesCollapsed"
      />
      <WhatNotToStress
        :messages="reassuranceMessages"
        :collapsed="stressCollapsed"
        @toggle="stressCollapsed = !stressCollapsed"
      />
    </div>
  </div>
</div>
```

**Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/unit/pages/timeline-layout.spec.ts`
Expected: PASS

**Step 5: Run all existing timeline tests**

Run: `npm run test -- tests/unit/components/Timeline/`
Expected: PASS (existing component tests unaffected since components still receive same props)

**Step 6: Commit**

```bash
git add pages/timeline/index.vue tests/unit/pages/timeline-layout.spec.ts
git commit -m "feat: reorganize timeline page with task-first layout"
```

---

### Task 4: Run Full Test Suite and Type Check

**Step 1: Run type-check**

Run: `npm run type-check`
Expected: PASS — no new type errors

**Step 2: Run full test suite**

Run: `npm run test`
Expected: PASS — all ~5486 tests pass

**Step 3: Fix any broken tests**

If tests reference old DOM structure (e.g., E2E test `user-story-5-2-timeline.spec.ts`), update selectors to match new layout. The guidance cards are now in a sidebar, not a top grid.

**Step 4: Run lint**

Run: `npm run lint:fix`
Expected: Clean

**Step 5: Commit any test fixes**

```bash
git add -A
git commit -m "fix: update tests for new timeline layout structure"
```

---

### Task 5: Visual Verification and Cleanup

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Verify in browser**

Navigate to `http://localhost:3000/timeline` and verify:
- [ ] Stat pills row shows score, tasks, milestones
- [ ] Current phase card is expanded with task list visible
- [ ] Other phase cards are collapsed
- [ ] Guidance sidebar shows 4 cards (What Matters expanded, others collapsed)
- [ ] Clicking guidance card headers toggles collapse/expand
- [ ] Clicking "What Matters" priority items still scrolls to tasks
- [ ] PortfolioHealth and OverallStatusCard are NOT rendered
- [ ] Mobile view: single column, guidance below tasks

**Step 3: Remove unused imports from page**

Ensure `PortfolioHealth` and `OverallStatusCard` imports are removed from `pages/timeline/index.vue`. Do NOT delete the component files themselves — they may be used elsewhere or reused later.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: cleanup unused imports from timeline page"
```

---

### Task 6: Push and Verify

**Step 1: Run pre-push checks**

Run: `npm run type-check && npm run lint && npm run test`
Expected: All pass

**Step 2: Push**

Run: `git push`
Expected: Pre-push hooks pass, push succeeds
