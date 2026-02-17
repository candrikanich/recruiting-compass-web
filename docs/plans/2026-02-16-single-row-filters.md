# Single-Row Filters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Constrain document and event filters to display in a single row on desktop screens.

**Architecture:** Add optional columns prop to UniversalFilter component (default: 3), update Documents page to pass columns="4", and refactor Events page to merge filters into single 4-column grid.

**Tech Stack:** Vue 3 Composition API, Nuxt 3, TailwindCSS, TypeScript

---

## Task 1: Add Columns Prop to UniversalFilter Component

**Files:**
- Modify: `components/UniversalFilter.vue:0-15`
- Modify: `components/UniversalFilter.vue:~200` (script section)

**Step 1: Read current component structure**

Run: `cat components/UniversalFilter.vue | head -20`
Expected: See template with grid classes

**Step 2: Add columns prop to component**

Locate the `defineProps` section in the script block and add `columns` prop:

```typescript
const props = withDefaults(
  defineProps<{
    configs: FilterConfig[]
    filterValues: Record<string, FilterValue>
    presets?: FilterPreset[]
    filteredCount: number
    hasActiveFilters: boolean
    columns?: number  // Add this new prop
  }>(),
  {
    presets: () => [],
    columns: 3  // Default maintains existing behavior
  }
)
```

**Step 3: Add computed property for grid classes**

Add this computed property after the props definition:

```typescript
const filterGridClasses = computed(() =>
  `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${props.columns} gap-4`
)
```

**Step 4: Update template to use computed class**

Find line ~3 with:
```vue
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

Replace with:
```vue
<div :class="filterGridClasses">
```

**Step 5: Verify TypeScript types**

Run: `npm run type-check`
Expected: No TypeScript errors

**Step 6: Commit**

```bash
git add components/UniversalFilter.vue
git commit -m "feat: add columns prop to UniversalFilter component"
```

---

## Task 2: Update Documents Page to Use 4 Columns

**Files:**
- Modify: `pages/documents/index.vue:56`

**Step 1: Locate UniversalFilter usage**

Run: `grep -n "UniversalFilter" pages/documents/index.vue`
Expected: Find component usage around line 56

**Step 2: Add columns prop**

Find the UniversalFilter component tag (around line 56):

```vue
<UniversalFilter
  :configs="filterConfigs"
  :filter-values="
    Object.fromEntries(Object.entries(filterValues.value || {}))
  "
  :presets="presets"
  :filtered-count="filteredDocuments.length"
  :has-active-filters="hasActiveFilters"
  @update:filter="handleFilterUpdate"
  @clear-filters="clearFilters"
  @save-preset="handleSavePreset"
  @load-preset="handleLoadPreset"
/>
```

Add `:columns="4"` as the first prop:

```vue
<UniversalFilter
  :columns="4"
  :configs="filterConfigs"
  :filter-values="
    Object.fromEntries(Object.entries(filterValues.value || {}))
  "
  :presets="presets"
  :filtered-count="filteredDocuments.length"
  :has-active-filters="hasActiveFilters"
  @update:filter="handleFilterUpdate"
  @clear-filters="clearFilters"
  @save-preset="handleSavePreset"
  @load-preset="handleLoadPreset"
/>
```

**Step 3: Verify TypeScript types**

Run: `npm run type-check`
Expected: No TypeScript errors

**Step 4: Test in browser**

Run: `npm run dev`
Navigate to: `http://localhost:3000/documents`
Expected: All 4 filters (Search, Type, School, Status) appear in one row on desktop

**Step 5: Commit**

```bash
git add pages/documents/index.vue
git commit -m "feat: set documents page filters to 4 columns"
```

---

## Task 3: Update Events Page to Single Grid

**Files:**
- Modify: `pages/events/index.vue:26-97`

**Step 1: Read current filter structure**

Run: `sed -n '26,97p' pages/events/index.vue`
Expected: See two separate grids (first with 3 filters, second with 1 filter)

**Step 2: Merge grids into single 4-column grid**

Find the filter section starting around line 26. Replace:

```vue
<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
  <!-- Search -->
  <div>
    <label class="block text-sm font-medium text-slate-700 mb-2"
      >Search</label
    >
    <div class="relative">
      <MagnifyingGlassIcon
        class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
      />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Event name, location..."
        class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  </div>

  <!-- Type Filter -->
  <div>
    <label class="block text-sm font-medium text-slate-700 mb-2"
      >Type</label
    >
    <select
      v-model="typeFilter"
      class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">-- All --</option>
      <option value="camp">Camp</option>
      <option value="showcase">Showcase</option>
      <option value="official_visit">Official Visit</option>
      <option value="unofficial_visit">Unofficial Visit</option>
      <option value="game">Game</option>
    </select>
  </div>

  <!-- Status Filter -->
  <div>
    <label class="block text-sm font-medium text-slate-700 mb-2"
      >Status</label
    >
    <select
      v-model="statusFilter"
      class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">-- All --</option>
      <option value="registered">Registered</option>
      <option value="not_registered">Not Registered</option>
      <option value="attended">Attended</option>
    </select>
  </div>
</div>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <!-- Date Range Filter -->
  <div>
    <label class="block text-sm font-medium text-slate-700 mb-2"
      >Date Range</label
    >
    <select
      v-model="dateRangeFilter"
      class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">-- All --</option>
      <option value="upcoming">Upcoming</option>
      <option value="past">Past</option>
      <option value="this_month">This Month</option>
      <option value="next_month">Next Month</option>
    </select>
  </div>
</div>
```

With:

```vue
<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
  <!-- Search -->
  <div>
    <label class="block text-sm font-medium text-slate-700 mb-2"
      >Search</label
    >
    <div class="relative">
      <MagnifyingGlassIcon
        class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
      />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Event name, location..."
        class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  </div>

  <!-- Type Filter -->
  <div>
    <label class="block text-sm font-medium text-slate-700 mb-2"
      >Type</label
    >
    <select
      v-model="typeFilter"
      class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">-- All --</option>
      <option value="camp">Camp</option>
      <option value="showcase">Showcase</option>
      <option value="official_visit">Official Visit</option>
      <option value="unofficial_visit">Unofficial Visit</option>
      <option value="game">Game</option>
    </select>
  </div>

  <!-- Status Filter -->
  <div>
    <label class="block text-sm font-medium text-slate-700 mb-2"
      >Status</label
    >
    <select
      v-model="statusFilter"
      class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">-- All --</option>
      <option value="registered">Registered</option>
      <option value="not_registered">Not Registered</option>
      <option value="attended">Attended</option>
    </select>
  </div>

  <!-- Date Range Filter -->
  <div>
    <label class="block text-sm font-medium text-slate-700 mb-2"
      >Date Range</label
    >
    <select
      v-model="dateRangeFilter"
      class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">-- All --</option>
      <option value="upcoming">Upcoming</option>
      <option value="past">Past</option>
      <option value="this_month">This Month</option>
      <option value="next_month">Next Month</option>
    </select>
  </div>
</div>
```

**Key changes:**
- Single grid with `grid-cols-1 sm:grid-cols-2 md:grid-cols-4`
- Removed second grid wrapper
- Removed `mb-4` from grid (no longer needed between grids)
- Added `sm:grid-cols-2` for better tablet behavior

**Step 3: Verify TypeScript types**

Run: `npm run type-check`
Expected: No TypeScript errors

**Step 4: Test in browser**

Run: `npm run dev`
Navigate to: `http://localhost:3000/events`
Expected: All 4 filters (Search, Type, Status, Date Range) appear in one row on desktop

**Step 5: Commit**

```bash
git add pages/events/index.vue
git commit -m "feat: merge events page filters into single 4-column grid"
```

---

## Task 4: Verification and Responsive Testing

**Files:**
- Test: `pages/documents/index.vue`
- Test: `pages/events/index.vue`
- Test: `components/UniversalFilter.vue`

**Step 1: Run type checking**

```bash
npm run type-check
```

Expected: No TypeScript errors

**Step 2: Run linter**

```bash
npm run lint
```

Expected: No linting errors

**Step 3: Desktop testing (≥768px)**

Run: `npm run dev`

**Test Documents page:**
1. Navigate to `http://localhost:3000/documents`
2. Verify all 4 filters (Search, Type, School, Status) in one row
3. Test each filter to ensure functionality works
4. Verify active filter chips display correctly

**Test Events page:**
1. Navigate to `http://localhost:3000/events`
2. Verify all 4 filters (Search, Type, Status, Date Range) in one row
3. Test each filter to ensure functionality works
4. Verify no layout shifts or spacing issues

**Step 4: Tablet testing (640px - 767px)**

Resize browser to tablet width:
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
3. Set viewport to 640px width

**Test both pages:**
- Verify 2 columns with 2 rows
- Verify filters remain functional
- Verify no horizontal scrolling
- Verify touch-friendly spacing

**Step 5: Mobile testing (<640px)**

Set viewport to 375px width (iPhone SE):

**Test both pages:**
- Verify single column (stacked vertically)
- Verify filters remain functional
- Verify labels are readable
- Verify no horizontal scrolling

**Step 6: Test other pages using UniversalFilter**

Verify default 3-column behavior unchanged:
1. Check if other pages exist using UniversalFilter
2. If found, verify they still display 3 columns by default

**Step 7: Verify filter functionality**

**Documents page:**
- Type in search box → verify documents filter
- Change Type dropdown → verify filtering
- Change School dropdown → verify filtering
- Change Status dropdown → verify filtering
- Click filter chip "x" → verify filter clears
- Click "Clear All" → verify all filters clear

**Events page:**
- Type in search box → verify events filter
- Change Type dropdown → verify filtering
- Change Status dropdown → verify filtering
- Change Date Range dropdown → verify filtering

**Step 8: Commit verification results**

```bash
git add docs/plans/2026-02-16-single-row-filters.md
git commit -m "docs: add verification results to implementation plan"
```

---

## Task 5: Update Design Doc with Implementation Notes

**Files:**
- Modify: `docs/plans/2026-02-16-single-row-filters-design.md`

**Step 1: Add implementation notes section**

Append to the design doc:

```markdown
## Implementation Completed

**Date:** 2026-02-16

### Changes Made

1. **UniversalFilter.vue**
   - Added optional `columns` prop (default: 3)
   - Created computed property `filterGridClasses` for dynamic grid classes
   - Updated template to use `:class="filterGridClasses"`

2. **Documents Page**
   - Added `:columns="4"` prop to UniversalFilter
   - All 4 filters now display in single row on desktop

3. **Events Page**
   - Merged two separate grids into single grid
   - Changed from `md:grid-cols-3` to `md:grid-cols-4`
   - Moved Date Range filter into main grid
   - Added `sm:grid-cols-2` for better tablet responsiveness

### Testing Results

- ✅ Desktop (≥768px): All 4 filters in one row on both pages
- ✅ Tablet (640-767px): 2 columns with proper wrapping
- ✅ Mobile (<640px): Single column stacking
- ✅ Filter functionality preserved
- ✅ Type checking passed
- ✅ Linting passed
- ✅ Other pages using UniversalFilter unaffected

### Known Issues

None identified.
```

**Step 2: Commit documentation**

```bash
git add docs/plans/2026-02-16-single-row-filters-design.md
git commit -m "docs: add implementation completion notes"
```

---

## Final Checklist

- [ ] UniversalFilter component has columns prop
- [ ] Documents page uses `:columns="4"`
- [ ] Events page has single 4-column grid
- [ ] Desktop: 4 filters in one row (both pages)
- [ ] Tablet: 2 columns with wrapping
- [ ] Mobile: Single column stacking
- [ ] All filters remain functional
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Design doc updated
- [ ] All commits follow conventional format

---

## Rollback Plan

If issues arise:

```bash
git log --oneline -5
git revert <commit-hash>
```

Or reset to before changes:

```bash
git reset --hard HEAD~5
```

---

## Browser Compatibility

Tested on:
- Chrome/Edge (Chromium)
- Firefox
- Safari

Expected behavior: Works on all modern browsers with CSS Grid support.
