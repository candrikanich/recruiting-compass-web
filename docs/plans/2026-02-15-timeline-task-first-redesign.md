# Timeline Page Redesign: Task-First Layout

**Date:** 2026-02-15
**Status:** Approved
**Branch:** TBD

## Problem

The `/timeline` page has ~10 data widgets competing for attention. Tasks — the primary driver of the recruiting process — are buried below 4 guidance cards and squeezed into 2/3 of a grid alongside a dense sidebar. The page feels overwhelming and the most actionable content is hard to find.

## Design Goals

1. Tasks front and center as the hero content
2. Guidance demoted but accessible in a collapsible sidebar
3. Less visual noise overall
4. Keep the 4-year phase card mental model

## Layout

### Grid Structure

`lg:grid-cols-3` — same grid as current, but contents reorganized:

- **Left 2/3 (lg:col-span-2):** Stat pills + Phase cards with tasks
- **Right 1/3:** Guidance sidebar (collapsible accordions)

### Visual Hierarchy (top to bottom)

```
┌──────────────────────────────────────────────────┐
│ Header: "Recruiting Timeline"      [Phase][Score] │
├────────────────────────────┬─────────────────────┤
│ ┌────────┐┌────────┐┌────┐│                     │
│ │Score:72││Tasks8/24││3/5 ││ ▼ What Matters Now  │ ← expanded
│ └────────┘└────────┘└────┘│   • Priority 1       │
│                            │   • Priority 2       │
│ ▼ Sophomore Year (OPEN)    │   • Priority 3       │
│   ☑ Task 1                 │                     │
│   ☐ Task 2                 │ ▶ Upcoming Miles.   │ ← collapsed
│   ☐ Task 3                 │                     │
│   ...                      │ ▶ Common Worries    │ ← collapsed
│                            │                     │
│ ▶ Freshman Year    [5/8]   │ ▶ What NOT to       │ ← collapsed
│ ▶ Junior Year      [0/10]  │    Stress About     │
│ ▶ Senior Year      [0/6]   │                     │
└────────────────────────────┴─────────────────────┘
```

### Section Details

#### 1. Header (no change)

Keep existing: page title, subtitle, Current Phase badge, Status score badge.

#### 2. Stat Pills Row (new — replaces sidebar widgets)

A compact horizontal row of 3 metric pills above the phase cards:

| Pill | Content | Source |
|------|---------|--------|
| Overall Score | `72/100` + status dot (green/amber/red) | `useStatusScore` |
| Task Progress | `8/24 tasks` + mini progress bar | `useTasks` |
| Milestone Progress | `3/5 milestones` | `usePhaseCalculation` |

Replaces: OverallStatusCard, Status Breakdown, Milestone Progress sidebar widgets.

Clicking a pill could expand to show detail (future enhancement — not in scope).

#### 3. Phase Cards — Left Column (modified)

- **Current phase:** Always expanded on load, shows full task list
- **Other phases:** Collapsed by default, show title + theme + progress bar + completion count
- Same `PhaseCardInline` component, same expand/collapse behavior
- Remove the separate expanded state refs — derive from `currentPhase` for initial state

#### 4. Guidance Sidebar — Right Column (new location)

Four collapsible accordion cards stacked vertically:

| Card | Default State | Styling |
|------|--------------|---------|
| What Matters Now | **Expanded** | Blue gradient (existing) |
| Upcoming Milestones | Collapsed | White (existing) |
| Common Worries | Collapsed | Amber gradient (existing) |
| What NOT to Stress About | Collapsed | Emerald gradient (existing) |

Each card keeps its existing color-coded styling. Add a chevron toggle to collapse/expand. Cards scroll with the page (no sticky behavior).

### What Gets Removed

| Widget | Action |
|--------|--------|
| PortfolioHealth (sidebar) | Remove from timeline entirely |
| OverallStatusCard (sidebar) | Replace with stat pills row |
| Status Breakdown (sidebar) | Replace with stat pills row |
| Milestone Progress (sidebar) | Replace with stat pills row |
| Row 1 guidance grid (top) | Move to sidebar |
| Row 2 guidance grid (top) | Move to sidebar |

### Responsive Behavior

- **Desktop (lg+):** 2/3 + 1/3 grid as described
- **Mobile:** Single column — stat pills stack, phase cards, then guidance cards below

## Components

### New

- `TimelineStatPills.vue` — compact 3-metric row

### Modified

- `pages/timeline/index.vue` — new layout structure, remove old grid sections
- `WhatMattersNow.vue` — add collapsible toggle (or wrap in accordion)
- `UpcomingMilestones.vue` — add collapsible toggle
- `CommonWorries.vue` — add collapsible toggle
- `WhatNotToStress.vue` — add collapsible toggle

### Removed from Timeline

- `PortfolioHealth.vue` — no longer rendered on this page
- `OverallStatusCard.vue` — replaced by stat pills

## Out of Scope (Future)

- Contextual guidance woven into task items
- Clickable stat pills expanding to detail views
- Sticky sidebar on scroll
- Portfolio Health relocation to dashboard

## Testing

- Existing timeline tests updated for new DOM structure
- Verify stat pills render correct data from composables
- Verify guidance accordion expand/collapse behavior
- Verify current phase auto-expands on load
- Responsive layout at mobile/tablet/desktop breakpoints
