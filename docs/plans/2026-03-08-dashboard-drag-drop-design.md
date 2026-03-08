# Dashboard Drag-and-Drop Layout Editor — Design Doc

**Date:** 2026-03-08
**Status:** Approved

---

## Goal

Replace the static Dashboard Customization settings page with a WYSIWYG drag-and-drop editor that mirrors the real dashboard layout. Users can toggle widget visibility and reorder widgets within or between columns. Changes are reflected live on the dashboard.

---

## Data Model

### New types (`types/models.ts`)

```typescript
export type WidgetId =
  | 'interactionTrendChart'
  | 'schoolInterestChart'
  | 'schoolMapWidget'
  | 'performanceSummary'
  | 'quickTasks'
  | 'coachFollowupWidget'
  | 'atAGlanceSummary'
  | 'schoolStatusOverview'
  | 'eventsSummary'
  | 'recentNotifications'
  | 'linkedAccounts';

export type WidgetSize = '4/6' | '2/6';

export const WIDGET_SIZES: Record<WidgetId, WidgetSize> = {
  interactionTrendChart: '2/6',
  schoolInterestChart: '2/6',
  schoolMapWidget: '4/6',
  performanceSummary: '4/6',
  quickTasks: '2/6',
  coachFollowupWidget: '4/6',
  atAGlanceSummary: '4/6',
  schoolStatusOverview: '2/6',
  eventsSummary: '2/6',
  recentNotifications: '2/6',
  linkedAccounts: '2/6',
};

export const WIDGET_LABELS: Record<WidgetId, string> = {
  interactionTrendChart: 'Interaction Trends',
  schoolInterestChart: 'School Interest Chart',
  schoolMapWidget: 'School Map',
  performanceSummary: 'Performance Summary',
  quickTasks: 'Quick Tasks',
  coachFollowupWidget: 'Coach Followup',
  atAGlanceSummary: 'At a Glance',
  schoolStatusOverview: 'Schools by Size',
  eventsSummary: 'Upcoming Events',
  recentNotifications: 'Recent Activity',
  linkedAccounts: 'Linked Accounts',
};

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

`DashboardWidgetVisibility` is deprecated and replaced by `DashboardLayout`.

### Default layout

```typescript
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  statsCards: { coaches: true, schools: true, interactions: true, offers: true, events: true },
  leftColumn: [
    { id: 'interactionTrendChart', visible: true },
    { id: 'schoolInterestChart', visible: true },
    { id: 'schoolMapWidget', visible: true },
    { id: 'performanceSummary', visible: true },
    { id: 'quickTasks', visible: true },
    { id: 'coachFollowupWidget', visible: true },
    { id: 'atAGlanceSummary', visible: true },
  ],
  rightColumn: [
    { id: 'schoolStatusOverview', visible: true },
    { id: 'eventsSummary', visible: true },
    { id: 'recentNotifications', visible: true },
    { id: 'linkedAccounts', visible: true },
  ],
};
```

### Migration

`validateDashboardLayout` detects old `DashboardWidgetVisibility` format (has `widgets` key) and returns `null`, causing `getDefaultDashboardLayout()` to be used instead. Old saved preferences are silently replaced with defaults on next save.

---

## Settings Page — WYSIWYG Editor

**Route:** `/settings/dashboard` (existing page, full rewrite)

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ Dashboard Customization                                  │
│ Drag widgets to reorder. Click the eye to show/hide.    │
├──────────────────────────────┬──────────────────────────┤
│ STATS BAR (toggle row)       │                          │
│ [✓ Coaches] [✓ Schools] ...  │                          │
├──────────────────────────────┴──────────────────────────┤
│ MAIN COLUMN (4/6)             SIDEBAR (2/6)             │
│ ┌────────────────────────┐   ┌─────────────────────┐   │
│ │ ⠿ School Map    4/6 👁 │   │ ⠿ Events      2/6 👁 │   │
│ └────────────────────────┘   └─────────────────────┘   │
│ ┌──────────┐ ┌─────────┐    ┌─────────────────────┐   │
│ │⠿ Trends  │ │⠿ School │    │ ⠿ Activity    2/6 👁 │   │
│ │   2/6 👁 │ │Interest │    └─────────────────────┘   │
│ └──────────┘ │   2/6 👁│                               │
│              └─────────┘                               │
└────────────────────────────────────────────────────────┘
```

### Widget card (`components/Settings/DashboardWidgetCard.vue`)

Props: `id: WidgetId`, `visible: boolean`, `disabled?: boolean`

Emits: `toggle` (visibility)

Elements:
- Drag handle (dots icon, `cursor-grab`)
- Widget label (from `WIDGET_LABELS`)
- Size badge (`2/6` or `4/6`, slate pill)
- Eye toggle button (solid eye = visible, outline eye-slash = hidden; card dims to 50% opacity when hidden)
- "Coming soon" badge replaces eye toggle when `disabled`

### Drag behavior

Uses `vue-draggable-plus` `<VueDraggable>` component on each column.

```typescript
// Left column — accepts 2/6 and 4/6
leftGroup = { name: 'dashboard', pull: true, put: true }

// Right column — accepts 2/6 only
rightGroup = {
  name: 'dashboard',
  pull: true,
  put: (to, from, dragEl) => dragEl.dataset.size === '2/6'
}
```

Attempting to drag a 4/6 widget into the right column is rejected by SortableJS (no visual feedback needed beyond the default ghost behavior).

### 2/6 pairing in the main column preview

The left column renders as a CSS grid. Adjacent visible 2/6 widgets in the list auto-pair into a `grid-cols-2` row. A lone 2/6 at the end of the list occupies one cell (half width, not stretched). This mirrors the real dashboard exactly.

### Save behavior

Auto-save on every drag-end or toggle, debounced 800ms via `usePreferenceManager().setDashboardLayout()`. A subtle "Saved" toast confirms success. On failure, toast error and revert the optimistic change.

### Coming Soon widgets

`offerStatusOverview`, `recentDocuments`, `interactionStats`, `coachResponsiveness`, `upcomingDeadlines`, `recruitingCalendar` are not in the layout arrays. They appear as a separate "Coming Soon" section below the editor — greyed out, non-draggable, checkbox disabled.

---

## Dashboard Page — Dynamic Rendering

**Route:** `/dashboard` (existing page, partial rewrite)

Replace hardcoded widget list with a render loop.

### Left column rendering

```
filter leftColumn to visible entries
group consecutive 2/6 entries into pairs
for each group:
  if 4/6: render full-width component
  if pair of 2/6: render in grid-cols-2 sub-grid
  if lone 2/6: render in grid-cols-2, first cell only
```

### Right column rendering

```
filter rightColumn to visible entries
render each as full-width card in sidebar
```

### Always-visible (outside layout config)

- `DashboardTimelineCard` — top, always shown
- `DashboardSuggestions` — below timeline, always shown
- `ParentContextBanner`, `ParentOnboardingBanner` — conditional on role
- `DashboardRecruitingPacketWidget` — top of sidebar, always shown
- `DashboardContactFrequencyWidget` — removed from main column, added to sidebar as always-visible (it has no layout key)

### Widget component map

```typescript
const WIDGET_COMPONENTS: Record<WidgetId, Component> = {
  interactionTrendChart: DashboardInteractionTrendChart,
  schoolInterestChart: DashboardSchoolInterestChart,
  schoolMapWidget: DashboardSchoolMapWidget,
  performanceSummary: DashboardPerformanceMetricsWidget,
  quickTasks: DashboardQuickTasksWidget,
  coachFollowupWidget: DashboardCoachFollowupWidget,
  atAGlanceSummary: DashboardAtAGlanceSummary,
  schoolStatusOverview: DashboardSchoolsBySizeWidget,
  eventsSummary: DashboardUpcomingEventsWidget,
  recentNotifications: DashboardRecentActivityFeed,
  linkedAccounts: DashboardSocialMediaWidget,
};
```

Some widgets require props passed from the dashboard data (e.g., `DashboardInteractionTrendChart` needs `:interactions`). These are handled via a `getWidgetProps(id)` helper that returns the right props object for each widget.

---

## Files Changed

| File | Action |
|---|---|
| `types/models.ts` | Add `WidgetId`, `WidgetSize`, `WIDGET_SIZES`, `WIDGET_LABELS`, `WidgetEntry`, `DashboardLayout` |
| `utils/preferenceValidation.ts` | Replace `validateDashboardLayout` + `getDefaultDashboardLayout` |
| `composables/usePreferenceManager.ts` | Update `getDashboardLayout`/`setDashboardLayout` return types |
| `components/Settings/DashboardWidgetCard.vue` | New component |
| `pages/settings/dashboard.vue` | Full rewrite |
| `pages/dashboard.vue` | Replace hardcoded widgets with dynamic render loop |

---

## Tests

- `utils/preferenceValidation` — old format → defaults, valid new format passes through, partial data → defaults
- `DashboardWidgetCard` — renders label, size badge, emits toggle, disabled state shows coming soon
- `pages/dashboard` — renders correct widgets for a given layout config (component mount with mocked preferences)
