# Components Guide

Component source files live in `components/DesignSystem/`. All are auto-imported by Nuxt — no import needed.

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

### EmptyState

```vue
<DesignSystemEmptyState title="No schools yet" description="Add your first school to get started." />
```

Use whenever a list or data view has zero items. Do not write inline empty state UI.

### ErrorState

```vue
<DesignSystemErrorState :error="error" @retry="refetch" />
```

Use for async load errors in page-level data fetching. Always provide `@retry` if re-fetching is possible.

### LoadingState / CardSkeleton / ListSkeleton / ChartSkeleton

Use the appropriate skeleton for the content type while loading:
- `<DesignSystemLoadingState>` — generic spinner
- `<DesignSystemCardSkeleton>` — card grid loading
- `<DesignSystemListSkeleton>` — list/table loading
- `<DesignSystemChartSkeleton>` — chart loading

### GradientCard

```vue
<DesignSystemGradientCard gradient="blue">
  <template #title>Schools</template>
  <template #value>12</template>
</DesignSystemGradientCard>
```

Use for stat/metric cards with gradient accent backgrounds. Gradient options match `--gradient-*` tokens.

### FilterChips

```vue
<DesignSystemFilterChips :filters="activeFilters" @remove="removeFilter" />
```

Use to display active filter state above filtered lists.

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
