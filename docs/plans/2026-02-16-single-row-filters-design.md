# Single-Row Filters Design

**Date:** 2026-02-16
**Status:** Approved

## Overview

Constrain document and event filters to display in a single row on desktop screens while maintaining responsive behavior on smaller screens.

## Problem

**Documents Page:**
- Uses UniversalFilter component with 4 filters (Search, Type, School, Status)
- Current layout: 3 columns on desktop → 4th filter wraps to second row
- Screenshot shows unwanted wrapping behavior

**Events Page:**
- Uses custom filter markup with 4 filters (Search, Type, Status, Date Range)
- Current layout: Two separate grids (3 filters + 1 filter)
- Inconsistent with desired single-row layout

## Solution

Add flexible column configuration to UniversalFilter component and update both pages to use 4-column layout on desktop.

## Design Details

### 1. UniversalFilter Component Enhancement

**File:** `components/UniversalFilter.vue`

**Changes:**
- Add optional `columns` prop (type: number, default: 3)
- Convert static grid classes to dynamic computed property
- Maintain backward compatibility (default 3 columns)

**Before:**
```vue
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

**After:**
```vue
<div :class="filterGridClasses">
```

**Implementation:**
```typescript
const props = withDefaults(
  defineProps<{
    configs: FilterConfig[]
    filterValues: Record<string, FilterValue>
    presets?: FilterPreset[]
    filteredCount: number
    hasActiveFilters: boolean
    columns?: number  // New prop
  }>(),
  {
    presets: () => [],
    columns: 3  // Default maintains existing behavior
  }
)

const filterGridClasses = computed(() =>
  `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${props.columns} gap-4`
)
```

### 2. Documents Page Update

**File:** `pages/documents/index.vue`

**Changes:**
- Pass `:columns="4"` prop to UniversalFilter
- No other modifications needed

**Update (line ~56):**
```vue
<UniversalFilter
  :columns="4"
  :configs="filterConfigs"
  :filter-values="Object.fromEntries(Object.entries(filterValues.value || {}))"
  :presets="presets"
  :filtered-count="filteredDocuments.length"
  :has-active-filters="hasActiveFilters"
  @update:filter="handleFilterUpdate"
  @clear-filters="clearFilters"
  @save-preset="handleSavePreset"
  @load-preset="handleLoadPreset"
/>
```

### 3. Events Page Update

**File:** `pages/events/index.vue`

**Changes:**
- Merge two separate filter grids into one
- Change from `md:grid-cols-3` to `md:grid-cols-4`
- Move Date Range filter into main grid

**Before (lines 26-97):**
```vue
<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
  <!-- Search -->
  <!-- Type Filter -->
  <!-- Status Filter -->
</div>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <!-- Date Range Filter -->
</div>
```

**After:**
```vue
<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
  <!-- Search -->
  <!-- Type Filter -->
  <!-- Status Filter -->
  <!-- Date Range Filter -->
</div>
```

## Responsive Behavior

### Desktop (md/lg breakpoint: 768px+)
- **Documents:** 4 columns (all filters in one row)
- **Events:** 4 columns (all filters in one row)
- **Other pages:** 3 columns (default, unchanged)

### Tablet (sm breakpoint: 640px - 767px)
- **All pages:** 2 columns (filters wrap to 2 rows)

### Mobile (< 640px)
- **All pages:** 1 column (filters stack vertically)

## Grid Classes Summary

| Breakpoint | Documents | Events | Other Pages |
|------------|-----------|--------|-------------|
| Mobile (<640px) | 1 col | 1 col | 1 col |
| Tablet (640-767px) | 2 cols | 2 cols | 2 cols |
| Desktop (768px+) | 4 cols | 4 cols | 3 cols |

## Implementation Notes

### UniversalFilter Component
- Prop is optional with sensible default (3)
- Backward compatible - no breaking changes
- Template strings in Tailwind work because classes are statically analyzable

### Documents Page
- Single line change (add `:columns="4"`)
- All existing functionality preserved
- Filter logic unchanged

### Events Page
- Remove second grid wrapper
- Move Date Range filter into main grid
- Adjust grid class from `md:grid-cols-3` to `md:grid-cols-4`
- Remove `mb-4` from first grid (no longer needed)

## Testing

### Visual Testing
1. Navigate to `/documents` on desktop (≥768px width)
   - Verify all 4 filters in one row
2. Navigate to `/events` on desktop
   - Verify all 4 filters in one row
3. Resize to tablet width (640-767px)
   - Verify 2 columns with appropriate wrapping
4. Resize to mobile width (<640px)
   - Verify single column stacking
5. Test other pages using UniversalFilter
   - Verify default 3-column layout unchanged

### Functional Testing
- Verify all filter interactions work correctly
- Verify filter state persists correctly
- Verify responsive behavior at all breakpoints
- Verify no layout shift or jank during resize

### Type Checking
- Run `npm run type-check`
- Verify no TypeScript errors

### Linting
- Run `npm run lint`
- Verify no ESLint errors

## Alternatives Considered

### Option 2: Custom wrapper class
- **Rejected:** Less maintainable, CSS specificity issues
- Would require `!important` or deep selectors
- Not reusable for other pages

### Option 3: Scoped style override
- **Rejected:** Hacky, harder to maintain
- Would use `:deep()` selector
- Unclear intent compared to explicit prop

### Global 4-column default
- **Rejected:** Would affect all pages
- User explicitly wanted Documents-only change initially
- Events added after discussion

## Future Considerations

- Consider adding `columns` prop to more filter-heavy pages as needed
- Could add responsive column config (e.g., `{ sm: 2, md: 3, lg: 4 }`)
- Consider extracting filter layout patterns to shared component
