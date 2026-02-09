# The Recruiting Compass Design System

A custom, lightweight design system built with TailwindCSS and Vue 3 for consistent UI patterns across The Recruiting Compass application.

## Table of Contents

- [Getting Started](#getting-started)
- [Color System](#color-system)
- [Components](#components)
  - [DSButton](#dsbutton)
  - [DSCard](#dscard)
  - [DSGradientCard](#dsgradientcard)
  - [DSBadge](#dsbadge)
  - [DSInput](#dsinput)
  - [DSToast](#dstoast)
  - [DSEmptyState](#dsemptystate)
  - [DSErrorState](#dserrorstate)
  - [DSLoadingState](#dsloadingstate)
  - [Skeleton Components](#skeleton-components)
  - [DSFilterChips](#dsfilterchips)
  - [DSFieldError](#dsfielderror)
  - [DSConfirmDialog](#dsconfirmdialog)
- [Design Tokens](#design-tokens)
- [Usage Patterns](#usage-patterns)
- [Accessibility](#accessibility)

---

## Getting Started

All design system components are **auto-imported** by Nuxt and prefixed with `DS` to distinguish them from page-specific components.

```vue
<template>
  <DSCard padding="lg">
    <DSButton variant="gradient" color="blue" @click="handleClick">
      Get Started
    </DSButton>
  </DSCard>
</template>
```

### Import Types (when needed)

```typescript
import type { ButtonVariant, ButtonColor } from "~/components/DesignSystem";
```

---

## Color System

### Brand Colors

The design system uses a vibrant, accessible color palette:

| Color       | Primary Use                            | Tailwind Class           |
| ----------- | -------------------------------------- | ------------------------ |
| **Blue**    | Primary actions, CTAs, links           | `brand-blue-{50-900}`    |
| **Purple**  | Secondary highlights, premium features | `brand-purple-{50-900}`  |
| **Emerald** | Success states, confirmations          | `brand-emerald-{50-900}` |
| **Orange**  | Warnings, alerts                       | `brand-orange-{50-900}`  |
| **Indigo**  | Accent color                           | `brand-indigo-{500-600}` |
| **Slate**   | Neutral, disabled states               | `brand-slate-{50-900}`   |
| **Red**     | Errors, destructive actions            | `brand-red-{50-900}`     |

### Color Usage Guidelines

- **Blue**: Primary buttons, links, focus states
- **Emerald**: Success messages, completed tasks, positive actions
- **Orange**: Warnings, pending states, attention-needed
- **Purple**: Secondary actions, highlights, badges
- **Red**: Errors, validation failures, destructive actions
- **Slate**: Neutral elements, disabled states, borders

### Gradients

Pre-defined gradients available via CSS variables:

```css
--gradient-blue
--gradient-purple
--gradient-emerald
--gradient-orange
```

---

## Components

### DSButton

Flexible button component with multiple variants, colors, and sizes.

#### Props

| Prop        | Type                                                                 | Default    | Description                |
| ----------- | -------------------------------------------------------------------- | ---------- | -------------------------- |
| `variant`   | `'gradient' \| 'outline' \| 'solid' \| 'ghost'`                      | `'solid'`  | Visual style               |
| `color`     | `'blue' \| 'purple' \| 'emerald' \| 'orange' \| 'indigo' \| 'slate'` | `'blue'`   | Color theme                |
| `size`      | `'sm' \| 'md' \| 'lg'`                                               | `'md'`     | Button size                |
| `fullWidth` | `boolean`                                                            | `false`    | Stretch to container width |
| `disabled`  | `boolean`                                                            | `false`    | Disable interactions       |
| `loading`   | `boolean`                                                            | `false`    | Show loading spinner       |
| `type`      | `'button' \| 'submit' \| 'reset'`                                    | `'button'` | HTML button type           |

#### Events

- `@click` - Emitted when button is clicked (only if not disabled/loading)

#### Usage Examples

```vue
<!-- Primary action button -->
<DSButton variant="solid" color="blue" size="md">
  Save Changes
</DSButton>

<!-- Gradient CTA button -->
<DSButton variant="gradient" color="blue" size="lg" full-width>
  Get Started Free
</DSButton>

<!-- Outline secondary button -->
<DSButton variant="outline" color="slate" size="md">
  Cancel
</DSButton>

<!-- Ghost button (minimal) -->
<DSButton variant="ghost" color="blue" size="sm">
  Learn More
</DSButton>

<!-- Loading state -->
<DSButton :loading="isSubmitting" :disabled="isSubmitting">
  Submit Form
</DSButton>
```

---

### DSCard

Standard card container with shadow, border, and hover effects.

#### Props

| Prop        | Type                             | Default | Description              |
| ----------- | -------------------------------- | ------- | ------------------------ |
| `padding`   | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'`  | Internal padding         |
| `hover`     | `boolean`                        | `false` | Enable hover lift effect |
| `clickable` | `boolean`                        | `false` | Make card interactive    |

#### Events

- `@click` - Emitted when card is clicked (only if `clickable` is true)

#### Usage Examples

```vue
<!-- Standard card -->
<DSCard padding="md">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</DSCard>

<!-- Clickable card with hover effect -->
<DSCard padding="lg" hover clickable @click="navigateToDetail">
  <h3>Interactive Card</h3>
  <p>Click to view details</p>
</DSCard>

<!-- No padding (custom layout) -->
<DSCard padding="none">
  <img src="header.jpg" alt="Header" />
  <div class="p-4">
    <p>Custom padded content</p>
  </div>
</DSCard>
```

---

### DSGradientCard

Card with vibrant gradient background (always white text).

#### Props

| Prop        | Type                                                      | Default  | Description              |
| ----------- | --------------------------------------------------------- | -------- | ------------------------ |
| `gradient`  | `'blue' \| 'purple' \| 'emerald' \| 'orange' \| 'indigo'` | `'blue'` | Gradient color           |
| `padding`   | `'none' \| 'sm' \| 'md' \| 'lg'`                          | `'md'`   | Internal padding         |
| `hover`     | `boolean`                                                 | `false`  | Enable hover lift effect |
| `clickable` | `boolean`                                                 | `false`  | Make card interactive    |

#### Usage Examples

```vue
<!-- Gradient stat card -->
<DSGradientCard gradient="blue" padding="lg">
  <h3 class="text-2xl font-bold">142</h3>
  <p class="text-blue-100">Total Schools</p>
</DSGradientCard>

<!-- Gradient CTA card -->
<DSGradientCard gradient="purple" padding="lg" hover clickable>
  <h3 class="text-xl font-semibold mb-2">Upgrade to Pro</h3>
  <p class="text-purple-100">Unlock premium features</p>
</DSGradientCard>
```

---

### DSBadge

Small label for statuses, categories, and tags.

#### Props

| Prop      | Type                                                              | Default   | Description  |
| --------- | ----------------------------------------------------------------- | --------- | ------------ |
| `color`   | `'blue' \| 'purple' \| 'emerald' \| 'orange' \| 'slate' \| 'red'` | `'blue'`  | Badge color  |
| `variant` | `'solid' \| 'light'`                                              | `'light'` | Visual style |
| `size`    | `'sm' \| 'md'`                                                    | `'md'`    | Badge size   |

#### Usage Examples

```vue
<!-- Status badges -->
<DSBadge color="emerald" variant="light">Active</DSBadge>
<DSBadge color="orange" variant="light">Pending</DSBadge>
<DSBadge color="red" variant="light">Inactive</DSBadge>

<!-- Solid variant badges -->
<DSBadge color="blue" variant="solid" size="sm">New</DSBadge>
<DSBadge color="purple" variant="solid" size="sm">Premium</DSBadge>

<!-- Category tags -->
<DSBadge color="slate" variant="light">Academic</DSBadge>
<DSBadge color="blue" variant="light">Division I</DSBadge>
```

#### Common Patterns

```vue
<!-- School status indicator -->
<DSBadge :color="statusColor" variant="light">
  {{ school.status }}
</DSBadge>

<!-- Multiple tags -->
<div class="flex gap-2 flex-wrap">
  <DSBadge v-for="tag in school.tags" :key="tag" color="slate">
    {{ tag }}
  </DSBadge>
</div>
```

---

### DSInput

Accessible form input with label, error, and hint support.

#### Props

| Prop          | Type                                                                        | Default        | Description                  |
| ------------- | --------------------------------------------------------------------------- | -------------- | ---------------------------- |
| `modelValue`  | `string \| number`                                                          | `''`           | Input value (v-model)        |
| `label`       | `string`                                                                    | -              | Input label text             |
| `placeholder` | `string`                                                                    | -              | Placeholder text             |
| `type`        | `'text' \| 'email' \| 'password' \| 'number' \| 'tel' \| 'url' \| 'search'` | `'text'`       | Input type                   |
| `size`        | `'sm' \| 'md' \| 'lg'`                                                      | `'md'`         | Input size                   |
| `disabled`    | `boolean`                                                                   | `false`        | Disable input                |
| `error`       | `string`                                                                    | -              | Error message (shows in red) |
| `hint`        | `string`                                                                    | -              | Helper text (shows in gray)  |
| `required`    | `boolean`                                                                   | `false`        | Required field indicator     |
| `id`          | `string`                                                                    | auto-generated | Input element ID             |

#### Events

- `@update:modelValue` - Emitted on input change
- `@blur` - Emitted on blur
- `@focus` - Emitted on focus

#### Slots

- `icon` - Leading icon slot

#### Usage Examples

```vue
<!-- Basic text input -->
<DSInput
  v-model="email"
  label="Email Address"
  type="email"
  placeholder="you@example.com"
  required
/>

<!-- Input with error -->
<DSInput
  v-model="password"
  label="Password"
  type="password"
  :error="passwordError"
  required
/>

<!-- Input with hint -->
<DSInput
  v-model="website"
  label="Website"
  type="url"
  hint="Include https:// prefix"
/>

<!-- Input with icon -->
<DSInput v-model="search" type="search" placeholder="Search schools...">
  <template #icon>
    <MagnifyingGlassIcon class="w-5 h-5" />
  </template>
</DSInput>

<!-- Disabled input -->
<DSInput
  v-model="username"
  label="Username"
  disabled
  hint="Cannot be changed"
/>
```

---

### DSToast

Global toast notification system (managed via `useToast` composable).

#### Types

```typescript
type ToastType = "success" | "error" | "warning" | "info";
```

#### Usage

```vue
<template>
  <!-- Add to app.vue or layout -->
  <DSToast />
</template>

<script setup>
import { useToast } from "~/composables/useToast";

const { showToast } = useToast();

// Show success toast
showToast("School added successfully!", "success");

// Show error toast
showToast("Failed to save changes", "error");

// Show warning toast
showToast("Connection unstable", "warning");

// Show info toast
showToast("New features available", "info");
</script>
```

#### Behavior

- Toasts appear in top-right corner
- Auto-dismiss after 3 seconds (configurable in composable)
- Manual dismiss via X button
- Stack multiple toasts vertically
- Slide-in/slide-out animations

---

### DSEmptyState

Placeholder for empty lists, no results, or missing data.

#### Props

| Prop          | Type        | Default            | Description               |
| ------------- | ----------- | ------------------ | ------------------------- |
| `title`       | `string`    | **required**       | Main heading              |
| `description` | `string`    | -                  | Optional description      |
| `icon`        | `Component` | default inbox icon | Custom Heroicon component |
| `actionText`  | `string`    | -                  | Button text               |
| `actionHref`  | `string`    | -                  | Button link (NuxtLink)    |

#### Usage Examples

```vue
<!-- No schools added yet -->
<DSEmptyState
  title="No schools yet"
  description="Add your first school to start tracking your recruiting journey"
  action-text="Add School"
  action-href="/schools/add"
/>

<!-- No search results -->
<DSEmptyState
  title="No results found"
  description="Try adjusting your search filters"
/>

<!-- Custom icon -->
<DSEmptyState
  :icon="AcademicCapIcon"
  title="No coaches available"
  description="Add coaches to this school to start managing contacts"
  action-text="Add Coach"
  action-href="/coaches/add"
/>
```

---

### DSErrorState

Error display for failed data fetching or operations.

#### Props

| Prop      | Type       | Default                  | Description             |
| --------- | ---------- | ------------------------ | ----------------------- |
| `title`   | `string`   | `'Something went wrong'` | Error heading           |
| `message` | `string`   | -                        | Error details           |
| `retry`   | `Function` | -                        | Optional retry callback |

#### Usage Examples

```vue
<!-- Basic error state -->
<DSErrorState
  title="Failed to load schools"
  message="Unable to connect to the server. Please try again."
/>

<!-- With retry button -->
<DSErrorState
  title="Failed to load data"
  :message="errorMessage"
  :retry="fetchData"
/>
```

---

### DSLoadingState

Loading indicator with multiple visual variants.

#### Props

| Prop      | Type                                   | Default        | Description     |
| --------- | -------------------------------------- | -------------- | --------------- |
| `message` | `string`                               | `'Loading...'` | Loading message |
| `variant` | `'spinner' \| 'skeleton' \| 'shimmer'` | `'spinner'`    | Visual style    |

#### Usage Examples

```vue
<!-- Spinner (default) -->
<DSLoadingState message="Loading schools..." />

<!-- Skeleton loader -->
<DSLoadingState variant="skeleton" message="Loading data..." />

<!-- Shimmer effect -->
<DSLoadingState variant="shimmer" message="Fetching results..." />
```

#### When to Use Each Variant

- **Spinner**: General loading, indeterminate operations
- **Skeleton**: List/table loading (gives layout preview)
- **Shimmer**: Card/content loading (smooth animation)

---

### Skeleton Components

Purpose-built skeleton loaders for specific UI patterns.

#### DSCardSkeleton

```vue
<DSCardSkeleton />
```

Use when loading card-based layouts (school cards, coach cards).

#### DSChartSkeleton

```vue
<DSChartSkeleton />
```

Use when loading charts and data visualizations.

#### DSListSkeleton

```vue
<DSListSkeleton />
```

Use when loading list items or table rows.

#### DSLoadingSkeleton

```vue
<DSLoadingSkeleton />
```

Generic skeleton for custom layouts.

---

### DSFilterChips

Active filter display with remove/clear functionality.

#### Props

| Prop                | Type                                    | Description                    |
| ------------------- | --------------------------------------- | ------------------------------ |
| `configs`           | `FilterConfig[]`                        | Filter configuration array     |
| `filterValues`      | `Record<string, any>`                   | Current filter values          |
| `hasActiveFilters`  | `boolean`                               | Whether any filters are active |
| `activeFilterCount` | `number`                                | Count of active filters        |
| `getDisplayValue`   | `(field: string, value: any) => string` | Value formatter function       |

#### Events

- `@remove-filter` - Emitted when removing a single filter
- `@clear-all` - Emitted when clearing all filters

#### Usage Example

```vue
<DSFilterChips
  :configs="filterConfigs"
  :filter-values="filters"
  :has-active-filters="hasFilters"
  :active-filter-count="filterCount"
  :get-display-value="formatFilterValue"
  @remove-filter="removeFilter"
  @clear-all="clearAllFilters"
/>
```

---

### DSFieldError

Standalone field error message display.

#### Props

| Prop    | Type     | Description        |
| ------- | -------- | ------------------ |
| `error` | `string` | Error message text |

#### Usage Example

```vue
<label for="email">Email</label>
<input id="email" v-model="email" type="email" />
<DSFieldError v-if="emailError" :error="emailError" />
```

---

### DSConfirmDialog

Modal confirmation dialog for destructive actions.

#### Props

| Prop          | Type                              | Default      | Description          |
| ------------- | --------------------------------- | ------------ | -------------------- |
| `open`        | `boolean`                         | `false`      | Dialog visibility    |
| `title`       | `string`                          | **required** | Dialog title         |
| `message`     | `string`                          | -            | Confirmation message |
| `confirmText` | `string`                          | `'Confirm'`  | Confirm button text  |
| `cancelText`  | `string`                          | `'Cancel'`   | Cancel button text   |
| `variant`     | `'danger' \| 'warning' \| 'info'` | `'warning'`  | Visual style         |

#### Events

- `@confirm` - Emitted when confirmed
- `@cancel` - Emitted when canceled
- `@update:open` - Emitted to control dialog state

#### Usage Example

```vue
<template>
  <DSButton @click="showConfirm = true" color="red"> Delete School </DSButton>

  <DSConfirmDialog
    v-model:open="showConfirm"
    title="Delete School?"
    message="This action cannot be undone. All associated coaches and interactions will be removed."
    confirm-text="Delete"
    variant="danger"
    @confirm="handleDelete"
    @cancel="showConfirm = false"
  />
</template>

<script setup>
const showConfirm = ref(false);

const handleDelete = async () => {
  await deleteSchool();
  showConfirm.value = false;
};
</script>
```

---

## Design Tokens

### CSS Custom Properties

Available in `/assets/styles/theme.css`:

#### Colors

```css
--brand-blue-500, --brand-blue-600, --brand-blue-700
--brand-purple-500, --brand-purple-600, --brand-purple-700
--brand-emerald-500, --brand-emerald-600, --brand-emerald-700
--brand-orange-500, --brand-orange-600, --brand-orange-700
```

#### Shadows

```css
--shadow-card: /* subtle card shadow */ --shadow-card-hover:
  /* elevated hover shadow */
  --shadow-lg: /* large/prominent shadow */;
```

#### Gradients

```css
--gradient-page: /* subtle page background gradient */
  --gradient-blue, --gradient-purple, --gradient-emerald, --gradient-orange;
```

### Utility Classes

Defined in theme.css `@layer components`:

```css
.card          /* Standard card styling */
.btn           /* Base button */
.btn-primary   /* Primary button (blue) */
.btn-secondary /* Secondary button (outline) */
.badge         /* Base badge */
.badge-primary, .badge-success, .badge-warning, .badge-danger
.input-field   /* Standard input field */
.search-btn    /* Search/filter button */
.filter-type-btn-active, .filter-type-btn-inactive
```

---

## Usage Patterns

### Form Layouts

```vue
<form @submit.prevent="handleSubmit">
  <div class="space-y-4">
    <DSInput
      v-model="form.name"
      label="School Name"
      required
      :error="errors.name"
    />

    <DSInput
      v-model="form.email"
      label="Contact Email"
      type="email"
      :error="errors.email"
    />

    <div class="flex gap-3 justify-end">
      <DSButton variant="outline" @click="cancel">
        Cancel
      </DSButton>
      <DSButton type="submit" :loading="isSubmitting">
        Save School
      </DSButton>
    </div>
  </div>
</form>
```

### Data States Pattern

```vue
<template>
  <div>
    <!-- Loading state -->
    <DSLoadingState v-if="loading" variant="skeleton" />

    <!-- Error state -->
    <DSErrorState v-else-if="error" :message="error" :retry="fetchData" />

    <!-- Empty state -->
    <DSEmptyState
      v-else-if="schools.length === 0"
      title="No schools found"
      action-text="Add School"
      action-href="/schools/add"
    />

    <!-- Data display -->
    <div v-else class="grid gap-4">
      <DSCard v-for="school in schools" :key="school.id">
        <!-- School content -->
      </DSCard>
    </div>
  </div>
</template>
```

### Card Grid Layouts

```vue
<!-- Responsive grid of cards -->
<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  <DSCard v-for="item in items" :key="item.id" padding="lg" hover>
    <!-- Card content -->
  </DSCard>
</div>

<!-- Gradient stat cards -->
<div class="grid gap-4 md:grid-cols-4">
  <DSGradientCard gradient="blue">
    <div class="text-3xl font-bold">{{ totalSchools }}</div>
    <div class="text-blue-100">Total Schools</div>
  </DSGradientCard>

  <DSGradientCard gradient="emerald">
    <div class="text-3xl font-bold">{{ activeCoaches }}</div>
    <div class="text-emerald-100">Active Coaches</div>
  </DSGradientCard>
</div>
```

### Status Badges

```vue
<script setup>
const getStatusColor = (status) => {
  const colors = {
    active: "emerald",
    pending: "orange",
    inactive: "slate",
    error: "red",
  };
  return colors[status] || "slate";
};
</script>

<template>
  <DSBadge :color="getStatusColor(item.status)" variant="light">
    {{ item.status }}
  </DSBadge>
</template>
```

---

## Accessibility

All design system components follow WCAG 2.1 AA standards:

### Keyboard Navigation

- ✅ All interactive components are keyboard accessible
- ✅ Focus indicators visible on all elements
- ✅ Logical tab order maintained

### ARIA Attributes

- `DSInput`: Proper label association, `aria-invalid`, `aria-describedby`
- `DSButton`: `aria-label` support, disabled state communication
- `DSToast`: `role="alert"` for screen reader announcements
- `DSConfirmDialog`: Modal focus trap, `role="dialog"`

### Color Contrast

All color combinations meet WCAG AA contrast requirements:

- Text on white backgrounds: 4.5:1 minimum
- Interactive elements: 3:1 minimum
- Focus indicators: 3:1 minimum

### Screen Reader Support

- Semantic HTML elements used throughout
- Alt text required for all images
- Error messages announced dynamically
- Loading states communicated to assistive tech

---

## Best Practices

### DO

✅ Use design system components for consistency
✅ Follow color guidelines (blue for primary, emerald for success, etc.)
✅ Provide meaningful labels and error messages
✅ Use loading states during async operations
✅ Show empty states when no data exists
✅ Use appropriate button variants (gradient for CTAs, outline for secondary)
✅ Include hover effects on clickable cards

### DON'T

❌ Mix custom buttons with DSButton components
❌ Use colors inconsistently (e.g., red for success)
❌ Omit error handling or loading states
❌ Create custom card styles instead of using DSCard
❌ Skip accessibility attributes
❌ Use tiny font sizes or low-contrast colors

---

## Contributing

When adding new components:

1. **Naming**: Prefix with `DS` (e.g., `DSDropdown`)
2. **Props**: Use TypeScript for all prop types
3. **Variants**: Support `color`, `size`, and `variant` props when applicable
4. **Accessibility**: Include ARIA attributes and keyboard support
5. **Documentation**: Add usage examples to this README
6. **Export**: Add to `index.ts` with type exports

---

## Related Files

- `/assets/styles/theme.css` - Design tokens and utility classes
- `/tailwind.config.js` - Extended color palette configuration
- `/components/DesignSystem/index.ts` - Component exports
- `/composables/useToast.ts` - Toast notification composable

---

**Last Updated**: February 9, 2026
**Maintained By**: Chris Andrikanich
