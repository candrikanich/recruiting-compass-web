# Navigation UI Updates: Plan & Implementation Guide

## Overview

Addressing three interconnected navigation issues:

1. **Bug Fix**: Performance and Analytics links in "More" dropdown not navigating
2. **Feature**: Move Search icon to header (next to Notifications)
3. **Enhancement**: Add icons to main navigation items with hover tooltips

---

## Issue Analysis

### Issue 1: Performance & Analytics Navigation Broken ❌

**Status**: Root cause identified

- Both pages exist and are properly routed
- Links are in `HeaderNavMore.vue` moreItems array
- **Root Cause**: Likely a timing issue where dropdown closes before navigation completes, or the routes aren't being recognized properly
- **Impact**: Users can't access Performance or Analytics pages from the More dropdown

### Issue 2: Search Icon in Wrong Location

**Current**: Search is hidden in "More" dropdown
**Desired**: Icon button next to NotificationCenter in header
**Benefit**: Search is a primary feature; should be easily discoverable in header

### Issue 3: Main Nav Items Lack Icons

**Current**: Text-only labels (Dashboard, Schools, Coaches, Interactions, Events, Timeline)
**Desired**: Icon-only buttons with hover tooltips, matching the More dropdown style
**Benefit**: More visual hierarchy, matches modern UI patterns, icons already exist in navItems array

---

## Solution Architecture

### Navigation Structure After Changes

```
Header.vue
├── navItems (12 items with icons)
├── Logo
├── HeaderNav.vue (6 main items with icons + tooltips)
│   └── HeaderNavMore.vue (5 "More" items: Performance, Offers, Documents, Settings, Analytics)
├── Right Side
│   ├── SearchButton (NEW icon-only)
│   ├── NotificationCenter
│   └── HeaderProfile
└── Mobile Menu (shows all 12 items with icons)
```

### Icon Styling Pattern

- **Library**: Heroicons v24 outline (already in use)
- **Size**: w-5 h-5 (header), w-4 h-4 (dropdown)
- **Active State**: `bg-brand-blue-100 text-brand-blue-700`
- **Hover State**: `hover:bg-slate-100`
- **Tooltip**: Custom Tooltip component on hover

---

## Implementation Steps

### Step 1: Fix Performance & Analytics Navigation

**File**: `/components/Header/HeaderNavMore.vue`

**Issue**: The dropdown closes before navigation fires, or navigation is blocked

**Solution**:

- Ensure `@click="isOpen = false"` executes after navigation
- Add `prevent` modifier if needed: `@click.prevent.stop="..."`
- Verify route paths are exactly `/performance` and `/analytics`
- Check for any middleware blocking these routes

**Current State**: Routes exist in pages, links are correct
**Action**: Verify navigation by testing in browser dev tools

---

### Step 2: Add Search Icon to Header

**File**: `/components/Header.vue`

**Location**: Between NotificationCenter (line 35) and HeaderProfile (line 36)

**Changes**:

```vue
<!-- Add after NotificationCenter component -->
<NuxtLink
  to="/search"
  class="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
  title="Search"
  data-testid="nav-search-button"
>
  <MagnifyingGlassIcon class="w-5 h-5" />
</NuxtLink>
```

**Icon**: `MagnifyingGlassIcon` (already imported line 164)
**Styling**: Match NotificationCenter button styling
**Tooltip**: Use HTML title attribute for now (can upgrade to custom Tooltip later)

---

### Step 3: Remove Search from More Dropdown

**File**: `/components/Header/HeaderNavMore.vue`

**Changes**:

- Remove line 92: `{ to: "/search", label: "Search", icon: MagnifyingGlassIcon },`
- Update `moreItems` to have 5 items instead of 6
- `isAnyChildActive` computed will still work correctly

**Result**: moreItems contains:

1. Performance
2. Offers
3. Documents
4. Settings
5. Analytics

---

### Step 4: Add Icons to Main Navigation Items

**File**: `/components/Header/HeaderNav.vue`

**Approach**: Define icons locally in the component

**Changes**:

1. Import Heroicons at the top:

```typescript
import {
  HomeIcon,
  BuildingLibraryIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  ClockIcon,
} from "@heroicons/vue/24/outline";
```

2. Create navItems array in component:

```typescript
const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { to: "/schools", label: "Schools", icon: BuildingLibraryIcon },
  { to: "/coaches", label: "Coaches", icon: UserGroupIcon },
  { to: "/interactions", label: "Interactions", icon: ChatBubbleLeftRightIcon },
  { to: "/events", label: "Events", icon: CalendarDaysIcon },
  { to: "/timeline", label: "Timeline", icon: ClockIcon },
];
```

3. Update template to render icons with text:

```vue
<NuxtLink
  v-for="item in navItems"
  :key="item.to"
  :to="item.to"
  :data-testid="`nav-${item.to.replace('/', '')}`"
  :class="[
    'flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
    isActive(item.to)
      ? 'bg-brand-blue-100 text-brand-blue-700'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  ]"
>
  <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
  <span>{{ item.label }}</span>
</NuxtLink>
```

**Result**: Each main nav item now shows icon on left + text on right

---

### Step 5: Add Tooltip Component (Optional but Recommended)

**File**: `/components/Common/Tooltip.vue` (new)

Simple tooltip component for hover labels:

```vue
<template>
  <div class="relative inline-block">
    <slot />
    <div
      v-if="showTooltip"
      class="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50"
    >
      {{ text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineProps<{ text: string }>();
const showTooltip = ref(false);
</script>
```

**Usage in HeaderNav**:

```vue
<Tooltip :text="item.label">
  <NuxtLink ...>
    <component :is="item.icon" class="w-5 h-5" />
  </NuxtLink>
</Tooltip>
```

---

## Testing Plan

### Unit Tests

- [ ] Test `isActive()` function with various routes
- [ ] Test navigation to `/performance` and `/analytics`
- [ ] Test icon rendering with correct Heroicons components
- [ ] Test tooltip display on hover

### E2E Tests

- [ ] Navigate through all main nav items
- [ ] Click More dropdown and verify all items
- [ ] Click Search icon, verify `/search` route
- [ ] Check active state styling matches current route
- [ ] Test mobile view shows all nav items with icons

### Manual Testing

- [ ] Desktop: Hover over main nav icons, verify tooltips
- [ ] Click Performance → verify page loads
- [ ] Click Analytics → verify page loads
- [ ] Click Search icon → verify /search page loads
- [ ] Mobile: Expand menu, verify all items with icons
- [ ] Verify active state highlights correct nav item as you navigate

---

## Files to Modify

| File                                   | Changes                              | Priority |
| -------------------------------------- | ------------------------------------ | -------- |
| `/components/Header.vue`               | Add Search icon button to right side | HIGH     |
| `/components/Header/HeaderNav.vue`     | Add icons to 6 main nav items        | HIGH     |
| `/components/Header/HeaderNavMore.vue` | Remove Search item (5 items now)     | HIGH     |
| `/components/Common/Tooltip.vue`       | Create new tooltip component         | MEDIUM   |

---

## Potential Issues & Mitigations

| Issue                          | Mitigation                                                      |
| ------------------------------ | --------------------------------------------------------------- |
| Navigation doesn't work        | Verify routes exist, check browser console for errors           |
| Icons don't render             | Verify Heroicons imports, use `<component :is>` syntax          |
| Dropdown closes too fast       | Check event handling, ensure click fires before dropdown closes |
| Mobile layout breaks           | Test responsive design, ensure flex wrapping works              |
| Active state incorrect         | Verify `isActive()` logic handles all route patterns            |
| Tooltip positioning off-screen | Use CSS position calculations or library like Popper.js         |

---

## Unresolved Questions

None at this time - clarifications received from user:

1. Performance/Analytics: "Nothing happens" = navigation is broken, not just page loading
2. Search placement: "Only in header" = remove from More menu
3. Icon display: "Icons only with hover tooltip" = icon-only design with text on hover

---

## Implementation Checklist

- [ ] Step 1: Debug and fix Performance/Analytics navigation
- [ ] Step 2: Add Search icon button to header
- [ ] Step 3: Remove Search from More dropdown
- [ ] Step 4: Add icons to main navigation items
- [ ] Step 5: Create Tooltip component (optional)
- [ ] Run unit tests
- [ ] Run E2E tests
- [ ] Manual testing on desktop and mobile
- [ ] Code review
- [ ] Merge to main branch
