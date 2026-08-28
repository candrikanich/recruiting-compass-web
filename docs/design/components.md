# Components Guide

Component source files live in `components/DesignSystem/`. All are auto-imported by Nuxt — no import needed.

In templates use path-derived tags (`<DesignSystemButton>`), never `<DSButton>`. The `DS*` aliases in `components/DesignSystem/index.ts` are only for explicit imports.

## Architecture

Five layers. Compose down; don't reimplement a higher layer with primitives.

| Layer | Components | Use for |
|-------|------------|---------|
| Primitives | Button, Badge, Input, Card, Alert | One control, one job |
| Overlays | Modal, ConfirmDialog, Toast | Focus-trapping surfaces |
| Async states | PageState → LoadingState / EmptyState / ErrorState + skeletons | Any fetch-backed view |
| Navigation | Pagination, FilterChips | List chrome |
| Forms | `DesignSystemForm*` | Labelled fields with errors |

**PageState is the default wrapper** for list/detail pages:

1. `loading` (exclusive)
2. `error` (exclusive)
3. `empty` (exclusive)
4. default slot (ready)

Do not hand-roll spinners, inline `role="alert"` boxes, or empty-copy blocks on those pages. Overlay chrome that isn't the primary view (filters, stats) stays outside PageState.

**Accessibility baseline** every DS component owns:

- Native elements (`button`, `a`, `dialog`, `input`) over ARIA-only widgets
- Focus rings via `focus:ring-*` brand tokens
- Loading → `aria-busy`, `aria-live="polite"`, decorative spinners `aria-hidden`
- Errors → `role="alert"` / `aria-live="assertive"`
- Unique `useId()` labels; never `Math.random()`
- Disabled link-buttons set `aria-disabled` + `tabindex="-1"` and ignore clicks

**Tokens:** brand utilities (`bg-brand-blue-600`) only. No raw hex / `rgba()` in `<style>` or inline style.

## Badge

**File:** `components/DesignSystem/Badge.vue`

```vue
<Badge color="emerald" variant="light" size="md">Completed</Badge>
```

**Props:**

| Prop | Type | Default | Options |
|------|------|---------|---------|
| `color` | `BadgeColor` | `"blue"` | `"blue" \| "purple" \| "emerald" \| "orange" \| "slate" \| "red"` |
| `variant` | `"solid" \| "light"` | `"light"` | — |
| `size` | `"sm" \| "md"` | `"md"` | — |

**Variant rules:**
- `light`: most status badges — muted background, dark text. Use for inline labels, metadata.
- `solid`: high-emphasis labels — white text on color bg. Use for tier labels (fit tier), prominent status.

**Color × variant quick reference:**

| Color | Light | Solid |
|-------|-------|-------|
| blue | `bg-brand-blue-200 text-brand-blue-900` | `bg-brand-blue-600 text-white` |
| purple | `bg-brand-purple-200 text-brand-purple-900` | `bg-brand-purple-600 text-white` |
| emerald | `bg-brand-emerald-200 text-brand-emerald-900` | `bg-brand-emerald-600 text-white` |
| orange | `bg-brand-orange-100 text-brand-orange-700` | `bg-brand-orange-600 text-white` |
| slate | `bg-brand-slate-200 text-brand-slate-900` | `bg-brand-slate-700 text-white` |
| red | `bg-brand-red-200 text-brand-red-900` | `bg-brand-red-600 text-white` |

---

## Button

**File:** `components/DesignSystem/Button.vue`

```vue
<Button color="blue" variant="solid" size="md" @click="save">Save</Button>
<Button color="red" variant="outline" @click="handleDelete">Delete</Button>
<Button :to="/schools" variant="gradient" color="indigo">Browse Schools</Button>
```

**Props:**

| Prop | Type | Default | Options |
|------|------|---------|---------|
| `color` | `ButtonColor` | `"blue"` | `"blue" \| "purple" \| "emerald" \| "orange" \| "indigo" \| "slate" \| "red"` |
| `variant` | `ButtonVariant` | `"solid"` | `"solid" \| "gradient" \| "outline" \| "ghost"` |
| `size` | `ButtonSize` | `"md"` | `"sm" \| "md" \| "lg"` |
| `to` | `string` | — | NuxtLink href — renders as `<NuxtLink>` |
| `loading` | `boolean` | `false` | Shows spinner, disables click |
| `fullWidth` | `boolean` | `false` | `w-full` |

**Variant rules:**
- `solid`: default — filled bg. Use for primary actions.
- `gradient`: attention-grabbing. Use for hero CTAs, onboarding actions.
- `outline`: bordered, transparent bg. Use for secondary actions alongside a solid primary.
- `ghost`: text-only with hover bg. Use for inline actions, table row actions.

---

## CSS Utility Classes

Defined in `assets/styles/theme.utilities.css` as `@utility` blocks. Apply directly in Vue templates.

### Card

```html
<div class="card">...</div>
```

Applies: `rounded-lg p-4`, card bg + foreground, `--shadow-card`, lifts on hover. Use for any content container card.

### Buttons (CSS utilities)

These are lower-level CSS utilities. Prefer the `<Button>` Vue component for most cases. Use these when you need a plain HTML `<button>` or when the Button component is not appropriate.

| Class | Description |
|-------|-------------|
| `btn` | Base: `px-4 py-2 rounded-lg font-medium transition` |
| `btn-primary` | Blue filled button (`--brand-blue-600` bg) |
| `btn-secondary` | Bordered button, muted hover |
| `search-btn` | Larger blue button (`px-6 py-3`) for search/filter submit |
| `filter-type-btn-active` | Active filter pill — blue bg |
| `filter-type-btn-inactive` | Inactive filter pill — muted bg |

### Badges (CSS utilities)

These are CSS utility badges, distinct from the `<Badge>` Vue component. Use the Vue `<Badge>` component for domain status badges. Use these only for hardcoded labels in plain HTML.

| Class | Color |
|-------|-------|
| `badge-primary` | Blue light |
| `badge-success` | Emerald light |
| `badge-warning` | Orange light |
| `badge-danger` | Destructive red (uses `--destructive` semantic token, not brand-red palette) |

### Input

```html
<input class="input-field" />
```

Applies: `w-full px-3 py-2 rounded-lg`, border, input-background, focus ring (blue-500).

---

## Design System Vue Components

### PageState

**File:** `components/DesignSystem/PageState.vue`

Composes loading / error / empty / ready. Prefer this over stacking the three state components by hand.

```vue
<DesignSystemPageState
  :loading="loading"
  :error="error"
  :empty="schools.length === 0"
  loading-message="Loading schools..."
  empty-title="No schools yet"
  empty-description="Add the schools you want to track."
  empty-action-text="Add Your First School"
  empty-action-href="/schools/new"
  @retry="fetchSchools"
>
  <SchoolList :schools="schools" />
</DesignSystemPageState>
```

| Prop | Type | Default |
|------|------|---------|
| `loading` | `boolean` | `false` |
| `error` | `Error \| string \| null` | `null` |
| `empty` | `boolean` | `false` |
| `loadingMessage` | `string` | `"Loading..."` |
| `loadingVariant` | `"spinner" \| "skeleton" \| "shimmer"` | `"spinner"` |
| `emptyTitle` | `string` | `"Nothing here yet"` |
| `emptyDescription` | `string` | `""` |
| `emptyActionText` / `emptyActionHref` | `string` | — |
| `errorTitle` | `string` | `"Something went wrong"` |
| `retryable` | `boolean` | `true` |

Slots: default (ready), `empty`, `empty-action`, `empty-icon`, `error`. Emits: `retry`, `empty-action`.

### EmptyState

```vue
<DesignSystemEmptyState
  title="No schools match your filters"
  description="Try adjusting your filters or search terms"
  action-text="Clear Filters"
  @action="clearFilters"
/>
```

Use whenever a list has zero items. Prefer `#action` when the CTA is not a link.

| Prop | Type | Default |
|------|------|---------|
| `title` | `string` | required |
| `description` | `string` | — |
| `icon` | `Component` | inbox glyph |
| `actionText` | `string` | — |
| `actionHref` | `string` | — (renders a `DesignSystemButton` link when set) |

### ErrorState

```vue
<DesignSystemErrorState :error="error" @retry="refetch" />
```

Always provide `@retry` when a refetch is possible. Set `retryable` to `false` for terminal errors. Empty/`null` errors fall back to "An unexpected error occurred" — never render a blank alert.

### LoadingState / CardSkeleton / ListSkeleton / ChartSkeleton

- `<DesignSystemLoadingState message="Loading...">` — generic spinner (`role="status"`, `aria-busy`)
- `<DesignSystemCardSkeleton>` — card grid
- `<DesignSystemListSkeleton :lines="5">` — list/table
- `<DesignSystemChartSkeleton>` — chart placeholder

`LoadingState` variants: `spinner` (default), `skeleton`, `shimmer`.

### Alert

**File:** `components/DesignSystem/Alert.vue`

Inline, in-flow status. Use Toast for transient global feedback; use Alert when the message must stay on the page.

```vue
<DesignSystemAlert variant="error" title="Error loading coaches" dismissible @dismiss="error = null">
  {{ error }}
</DesignSystemAlert>
```

| Prop | Type | Default |
|------|------|---------|
| `variant` | `"info" \| "success" \| "warning" \| "error"` | `"info"` |
| `title` | `string` | — |
| `dismissible` | `boolean` | `false` |
| `compact` | `boolean` | `false` |

`error`/`warning` → `role="alert"` + assertive live region. `info`/`success` → `role="status"` + polite.

### Modal

**File:** `components/DesignSystem/Modal.vue`

Native `<dialog>` with `showModal()` (top layer, focus trap, Escape). Build feature modals on this shell instead of another `role="dialog"` div.

```vue
<DesignSystemModal :open="open" title="Assign coach" size="md" @close="open = false">
  <AssignCoachForm />
  <template #footer>
    <DesignSystemButton variant="outline" color="slate" @click="open = false">Cancel</DesignSystemButton>
    <DesignSystemButton :loading="saving" @click="save">Save</DesignSystemButton>
  </template>
</DesignSystemModal>
```

| Prop | Type | Default |
|------|------|---------|
| `open` | `boolean` | required |
| `title` | `string` | — |
| `ariaLabel` | `string` | required if `title` omitted |
| `size` | `"sm" \| "md" \| "lg" \| "full"` | `"md"` |
| `tone` | `"default" \| "danger" \| "warning"` | `"default"` |
| `showClose` | `boolean` | `true` |
| `closeOnBackdrop` | `boolean` | `true` |
| `busy` | `boolean` | `false` (blocks dismiss) |

Footer stacks `flex-col-reverse` on small screens so the primary action stays thumb-reachable.

### Pagination

**File:** `components/DesignSystem/Pagination.vue`

```vue
<DesignSystemPagination :page="currentPage" :total-pages="totalPages" @update:page="goToPage" />
```

| Prop | Type | Default |
|------|------|---------|
| `page` | `number` | required |
| `totalPages` | `number` | required |
| `disabled` | `boolean` | `false` |
| `hideWhenSingle` | `boolean` | `true` |

Compact on small viewports (Previous / "Page X of Y" / Next). From `sm` up, numbered buttons with ellipses. Hidden when `totalPages <= 1`.

### ConfirmDialog

```vue
<DesignSystemConfirmDialog
  :is-open="isDeleteDialogOpen"
  title="Delete School"
  message="This action cannot be undone."
  confirm-text="Delete"
  variant="danger"
  :confirming="deleting"
  @confirm="confirmDeleteSchool"
  @cancel="cancelDeleteSchool"
/>
```

Built on Modal. `confirming` disables cancel and puts the confirm button in a loading state.

### GradientCard

```vue
<DesignSystemGradientCard gradient="blue">
  <template #title>Schools</template>
  <template #value>12</template>
</DesignSystemGradientCard>
```

Use for stat/metric cards with gradient accent backgrounds.

### FilterChips

```vue
<DesignSystemFilterChips
  :configs="filterConfigs"
  :filter-values="filterValues"
  :has-active-filters="hasActiveFilters"
  :active-filter-count="activeFilterCount"
  :get-display-value="getFilterDisplayValue"
  @remove-filter="handleRemoveFilter"
  @clear-all="clearFilters"
/>
```

Each chip's remove control has a unique name (`Remove Status filter`). Use to display active filter state above filtered lists.

---

## ResponsivenessBadge

**File:** `components/ResponsivenessBadge.vue`

```vue
<ResponsivenessBadge :percentage="coach.responsiveness_rate" />
```

Standalone badge for coach responsiveness. Renders color + label from percentage automatically — do not replicate this logic inline.

---

## Interaction Status Badges

**File:** `components/Interaction/StatusBadges.vue`

```vue
<InteractionStatusBadges type="email" direction="outbound" sentiment="positive" />
```

Renders three `<Badge>` components for interaction type, direction, and sentiment. Always use this component for interaction status — never build inline badge sets for interactions.
