# Form Standardization Design

**Date:** 2026-02-15
**Status:** Approved
**Goal:** Standardize all "Add" forms (Event, School, Coach, Interaction) with consistent visual styling, structure, and reusable component patterns.

---

## Problem Statement

The application currently has four "Add" forms with inconsistent patterns:

- **Add Event** (pages/events/create.vue): Gray palette, basic styling, no validation feedback
- **Add School** (SchoolForm.vue): Slate palette, blue gradient buttons, FormErrorSummary, validation
- **Add Coach** (AddCoachModal.vue): Indigo palette, modal-only, different input sizes
- **Add Interaction** (InteractionAddForm.vue): Slate palette, inline card, file uploads

This inconsistency creates a fragmented user experience and makes maintenance difficult.

---

## Design Goals

1. **Visual Consistency**: All forms use identical colors, borders, spacing, typography
2. **Structural Consistency**: All forms use the same validation, error handling, and accessibility patterns
3. **Component Reusability**: Form components work in modals, dedicated pages, and inline contexts
4. **Maintainability**: Single source of truth for form styling and behavior

---

## Solution: Design System Components

### Architecture

Create reusable form primitives in `components/DesignSystem/Form/`:

```
components/DesignSystem/Form/
├── FormContainer.vue      # Wrapper with error summary
├── FormSection.vue        # Section dividers with headers
├── FormInput.vue          # Text inputs
├── FormSelect.vue         # Dropdowns
├── FormTextarea.vue       # Multi-line text
├── FormCheckbox.vue       # Single checkbox
├── FormDateInput.vue      # Date picker
├── FormTimeInput.vue      # Time picker
├── FormFileInput.vue      # File uploads
└── FormButtonGroup.vue    # Submit/Cancel button pair
```

Plus existing:
- `components/DesignSystem/FieldError.vue` (already exists)
- `components/Validation/FormErrorSummary.vue` (already exists)

---

## Standardized Visual Pattern

### Colors & Borders

- **Palette**: Slate throughout (border-slate-300, text-slate-700)
- **Primary actions**: Blue gradient (from-blue-500 to-blue-600)
- **Border thickness**: `border-2` for inputs (prominent, clear boundaries)
- **Border radius**: `rounded-xl` for modern feel
- **Error state**: `border-red-500` when validation fails

### Spacing

- **Input padding**: `px-4 py-3` (comfortable hit areas)
- **Form spacing**: `space-y-6` (clear visual grouping)
- **Button padding**: `px-4 py-3` (matches inputs)
- **Section margins**: Consistent spacing between form sections

### Typography

- **Labels**: `text-sm font-medium text-slate-700 mb-2`
- **Required indicator**: `<span class="text-red-500" aria-hidden="true">*</span>` + sr-only text for screen readers
- **Placeholders**: `placeholder:text-slate-600`

### Focus States

- All interactive elements: `focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`

---

## Component API Design

### FormInput

```vue
<FormInput
  v-model="formData.name"
  label="School Name"
  placeholder="e.g., University of Florida"
  :required="true"
  :disabled="loading"
  :error="fieldErrors.name"
  :auto-filled="autoFilledFields.name"
  type="text"
  maxlength="200"
  @blur="validateName"
/>
```

**Props:**
- `modelValue` - v-model binding
- `label` - Field label text
- `placeholder` - Placeholder text
- `required` - Boolean, adds asterisk and required attribute
- `disabled` - Boolean for loading states
- `error` - Error message string (integrates with validation)
- `autoFilled` - Boolean, shows "(auto-filled)" indicator
- `type` - text, email, url, number, etc.
- `maxlength` - Character limit

### FormSelect

```vue
<FormSelect
  v-model="formData.division"
  label="Division"
  :options="[
    { value: '', label: 'Select Division' },
    { value: 'D1', label: 'Division 1 (D1)' },
    { value: 'D2', label: 'Division 2 (D2)' },
    { value: 'D3', label: 'Division 3 (D3)' }
  ]"
  :required="false"
  :error="fieldErrors.division"
  @blur="validateDivision"
/>
```

**Props:**
- Same base props as FormInput
- `options` - Array of `{ value: string, label: string }`
- Auto-includes dropdown arrow styling

### FormTextarea

```vue
<FormTextarea
  v-model="formData.notes"
  label="Notes"
  placeholder="Any notes about this school..."
  :rows="4"
  :maxlength="1000"
  :error="fieldErrors.notes"
  :show-counter="true"
/>
```

**Props:**
- Same base props as FormInput
- `rows` - Number of visible rows
- `showCounter` - Boolean, displays character count (e.g., "245/1000")

### FormButtonGroup

```vue
<FormButtonGroup
  submit-label="Add School"
  cancel-label="Cancel"
  :loading="loading"
  :submit-disabled="!formData.name || hasErrors"
  @submit="handleSubmit"
  @cancel="$emit('cancel')"
/>
```

**Props:**
- `submitLabel` - Text for primary button
- `cancelLabel` - Text for secondary button
- `loading` - Shows "Adding..." state
- `submitDisabled` - Boolean to disable submit

---

## Validation Integration

Each form component integrates with existing `useFormValidation` composable:

### Field-Level Errors

- Components accept `error` prop from `fieldErrors`
- If error exists, component shows red border: `border-red-500`
- Error text displayed via `DesignSystemFieldError` below field
- `aria-invalid` and `aria-describedby` added automatically

### Form-Level Errors

- `FormErrorSummary` displays at top of form
- Lists all validation errors
- Dismissible by user
- Only shown when `hasErrors` is true

### Example Integration

```vue
<template>
  <FormContainer @submit="handleSubmit">
    <FormErrorSummary v-if="hasErrors" :errors="errors" @dismiss="clearErrors" />

    <FormInput
      v-model="formData.name"
      label="School Name"
      required
      :error="fieldErrors.name"
      @blur="validateName"
    />
  </FormContainer>
</template>

<script setup>
const { errors, fieldErrors, validate, validateField, clearErrors, hasErrors } =
  useFormValidation();

const validateName = async () => {
  await validateField('name', formData.name, validators.name);
};
</script>
```

---

## Accessibility

All form components include:

- ✅ Proper label association (`for`/`id` attributes)
- ✅ Required field indicators (visual asterisk + sr-only text)
- ✅ Error announcements (`aria-invalid`, `aria-describedby`)
- ✅ Focus management (proper tab order)
- ✅ Disabled state handling
- ✅ Keyboard navigation support

---

## Reusable Form Component Pattern

Each domain gets a reusable form component:

```
components/
├── Event/
│   └── EventForm.vue
├── School/
│   └── SchoolForm.vue
├── Coach/
│   └── CoachForm.vue
└── Interaction/
    └── InteractionForm.vue
```

### Form Component Responsibilities

- ✅ Manages form state (reactive formData object)
- ✅ Handles validation (useFormValidation composable)
- ✅ Renders fields using design system components
- ✅ Emits events: `@submit`, `@cancel`
- ❌ Does NOT handle navigation, modals, or API calls

### Usage Contexts

**1. Modal**

```vue
<Teleport to="body">
  <div v-if="show" class="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div class="bg-white rounded-2xl max-w-2xl w-full p-6">
      <h2 class="text-xl font-bold mb-4">Add New Event</h2>
      <EventForm
        :loading="loading"
        @submit="handleSubmit"
        @cancel="$emit('close')"
      />
    </div>
  </div>
</Teleport>
```

**2. Dedicated Page**

```vue
<div class="max-w-2xl mx-auto px-4 py-8">
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <h1 class="text-2xl font-bold mb-6">Add New Event</h1>
    <EventForm
      :loading="loading"
      @submit="handleCreate"
      @cancel="router.push('/events')"
    />
  </div>
</div>
```

**3. Inline Card**

```vue
<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
  <h2 class="text-xl font-semibold mb-6">Add Event</h2>
  <EventForm
    :loading="loading"
    @submit="handleCreate"
    @cancel="showForm = false"
  />
</div>
```

---

## Migration Strategy

### Phase 1: Build Design System Components

1. Create all `components/DesignSystem/Form/*` components
2. Write unit tests for each component (validation, accessibility, props)
3. Verify components work in isolation

### Phase 2: Migrate Forms (One at a Time)

**Order:**
1. **EventForm** (new component) - Cleanest slate
2. **SchoolForm** - Already close to target pattern
3. **InteractionForm** - Update to use new components
4. **CoachForm** - Convert from indigo to blue theme

**Per-Form Process:**
1. Create new reusable form component
2. Replace raw HTML inputs with design system components
3. Keep validation logic intact, update error prop passing
4. Update parent pages/modals to use new form component
5. Run tests to ensure behavior unchanged
6. Browser test the form

### Testing Strategy

- **Unit tests**: Each design system component (props, validation, a11y)
- **Integration tests**: Form components with real validation
- **E2E tests**: Update existing tests for new DOM structure
- **Visual regression**: Ensure forms look consistent

---

## Success Criteria

✅ All "Add" forms use identical visual styling
✅ All forms use design system components
✅ All forms have consistent validation and error handling
✅ Form components are reusable across contexts (modal, page, inline)
✅ All tests pass (unit, integration, E2E)
✅ Accessibility audit passes (WCAG 2.1 AA)
✅ User experience is consistent across all data entry points

---

## Benefits

1. **User Experience**: Consistent, predictable forms across the app
2. **Developer Experience**: Faster to build new forms, less code duplication
3. **Maintainability**: Single source of truth for styling and behavior
4. **Accessibility**: Baked in once, correct everywhere
5. **Testing**: Test components once, confidence everywhere
6. **Future-Proof**: New forms automatically consistent

---

## Next Steps

1. ✅ Design approved
2. ⏭️ Create implementation plan (invoke writing-plans skill)
3. Build design system components
4. Migrate forms one by one
5. Update tests
6. Deploy and verify
