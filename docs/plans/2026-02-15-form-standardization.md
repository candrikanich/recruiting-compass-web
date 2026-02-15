# Form Standardization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize all "Add" forms with consistent design system components for visual consistency, accessibility, and maintainability.

**Architecture:** Build reusable form primitives (FormInput, FormSelect, FormTextarea, etc.) with standardized styling, validation integration, and accessibility. Migrate four forms (Event, School, Coach, Interaction) to use these components.

**Tech Stack:** Vue 3, TypeScript, Tailwind CSS, Vitest, Playwright

---

## Phase 1: Design System Form Components

### Task 1: FormInput Component

**Files:**
- Create: `components/DesignSystem/Form/FormInput.vue`
- Create: `tests/components/DesignSystem/Form/FormInput.test.ts`

**Step 1: Write failing test**

Create test file:

```typescript
// tests/components/DesignSystem/Form/FormInput.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FormInput from '~/components/DesignSystem/Form/FormInput.vue';

describe('FormInput', () => {
  it('renders label and input correctly', () => {
    const wrapper = mount(FormInput, {
      props: {
        modelValue: '',
        label: 'Test Label',
        placeholder: 'Enter text'
      }
    });

    expect(wrapper.find('label').text()).toContain('Test Label');
    expect(wrapper.find('input').attributes('placeholder')).toBe('Enter text');
  });

  it('shows required indicator when required is true', () => {
    const wrapper = mount(FormInput, {
      props: {
        modelValue: '',
        label: 'Required Field',
        required: true
      }
    });

    expect(wrapper.find('.text-red-500').text()).toBe('*');
    expect(wrapper.find('.sr-only').text()).toContain('required');
  });

  it('displays error message and applies error styling', () => {
    const wrapper = mount(FormInput, {
      props: {
        modelValue: '',
        label: 'Name',
        error: 'Name is required'
      }
    });

    expect(wrapper.find('input').classes()).toContain('border-red-500');
    expect(wrapper.text()).toContain('Name is required');
  });

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(FormInput, {
      props: {
        modelValue: '',
        label: 'Test'
      }
    });

    await wrapper.find('input').setValue('new value');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['new value']);
  });

  it('shows auto-filled indicator when autoFilled is true', () => {
    const wrapper = mount(FormInput, {
      props: {
        modelValue: 'Auto Value',
        label: 'School Name',
        autoFilled: true
      }
    });

    expect(wrapper.text()).toContain('(auto-filled)');
  });

  it('disables input when disabled is true', () => {
    const wrapper = mount(FormInput, {
      props: {
        modelValue: '',
        label: 'Test',
        disabled: true
      }
    });

    expect(wrapper.find('input').attributes('disabled')).toBeDefined();
    expect(wrapper.find('input').classes()).toContain('disabled:opacity-50');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test tests/components/DesignSystem/Form/FormInput.test.ts`

Expected: FAIL with "Cannot find module '~/components/DesignSystem/Form/FormInput.vue'"

**Step 3: Write minimal implementation**

Create component file:

```vue
<!-- components/DesignSystem/Form/FormInput.vue -->
<template>
  <div>
    <label
      :for="inputId"
      class="block text-sm font-medium text-slate-700 mb-2"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-red-500"
        aria-hidden="true"
      >*</span>
      <span v-if="required" class="sr-only">(required)</span>
      <span
        v-if="autoFilled"
        class="text-xs font-normal text-blue-700 ml-1"
      >(auto-filled)</span>
    </label>
    <input
      :id="inputId"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :maxlength="maxlength"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${inputId}-error` : undefined"
      :class="[
        'w-full px-4 py-3 bg-white border-2 rounded-xl',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'transition-all placeholder:text-slate-600',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        error ? 'border-red-500' : 'border-slate-300'
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur')"
    />
    <DesignSystemFieldError
      v-if="error"
      :id="`${inputId}-error`"
      :error="error"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: string | number;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  autoFilled?: boolean;
  type?: string;
  maxlength?: number;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  required: false,
  disabled: false,
  error: '',
  autoFilled: false,
  type: 'text',
  maxlength: undefined
});

defineEmits<{
  'update:modelValue': [value: string | number];
  blur: [];
}>();

// Generate unique ID for accessibility
const inputId = computed(() => {
  return `input-${props.label.toLowerCase().replace(/\s+/g, '-')}`;
});
</script>
```

**Step 4: Run test to verify it passes**

Run: `npm run test tests/components/DesignSystem/Form/FormInput.test.ts`

Expected: PASS (all 6 tests passing)

**Step 5: Commit**

```bash
git add components/DesignSystem/Form/FormInput.vue tests/components/DesignSystem/Form/FormInput.test.ts
git commit -m "feat: add FormInput design system component with tests"
```

---

### Task 2: FormSelect Component

**Files:**
- Create: `components/DesignSystem/Form/FormSelect.vue`
- Create: `tests/components/DesignSystem/Form/FormSelect.test.ts`

**Step 1: Write failing test**

```typescript
// tests/components/DesignSystem/Form/FormSelect.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FormSelect from '~/components/DesignSystem/Form/FormSelect.vue';

describe('FormSelect', () => {
  const options = [
    { value: '', label: 'Select Option' },
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' }
  ];

  it('renders label and select correctly', () => {
    const wrapper = mount(FormSelect, {
      props: {
        modelValue: '',
        label: 'Choose Option',
        options
      }
    });

    expect(wrapper.find('label').text()).toContain('Choose Option');
    expect(wrapper.findAll('option')).toHaveLength(3);
  });

  it('renders all options with correct values', () => {
    const wrapper = mount(FormSelect, {
      props: {
        modelValue: '',
        label: 'Test',
        options
      }
    });

    const optionElements = wrapper.findAll('option');
    expect(optionElements[0].text()).toBe('Select Option');
    expect(optionElements[0].attributes('value')).toBe('');
    expect(optionElements[1].text()).toBe('Option 1');
    expect(optionElements[1].attributes('value')).toBe('option1');
  });

  it('shows required indicator when required is true', () => {
    const wrapper = mount(FormSelect, {
      props: {
        modelValue: '',
        label: 'Required Select',
        options,
        required: true
      }
    });

    expect(wrapper.find('.text-red-500').text()).toBe('*');
  });

  it('displays error message and applies error styling', () => {
    const wrapper = mount(FormSelect, {
      props: {
        modelValue: '',
        label: 'Division',
        options,
        error: 'Division is required'
      }
    });

    expect(wrapper.find('select').classes()).toContain('border-red-500');
    expect(wrapper.text()).toContain('Division is required');
  });

  it('emits update:modelValue on change', async () => {
    const wrapper = mount(FormSelect, {
      props: {
        modelValue: '',
        label: 'Test',
        options
      }
    });

    await wrapper.find('select').setValue('option1');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option1']);
  });

  it('disables select when disabled is true', () => {
    const wrapper = mount(FormSelect, {
      props: {
        modelValue: '',
        label: 'Test',
        options,
        disabled: true
      }
    });

    expect(wrapper.find('select').attributes('disabled')).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test tests/components/DesignSystem/Form/FormSelect.test.ts`

Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```vue
<!-- components/DesignSystem/Form/FormSelect.vue -->
<template>
  <div>
    <label
      :for="selectId"
      class="block text-sm font-medium text-slate-700 mb-2"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-red-500"
        aria-hidden="true"
      >*</span>
      <span v-if="required" class="sr-only">(required)</span>
    </label>
    <select
      :id="selectId"
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${selectId}-error` : undefined"
      :class="[
        'w-full px-4 py-3 bg-white border-2 rounded-xl',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'transition-all appearance-none cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        error ? 'border-red-500' : 'border-slate-300'
      ]"
      :style="dropdownStyle"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      @blur="$emit('blur')"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <DesignSystemFieldError
      v-if="error"
      :id="`${selectId}-error`"
      :error="error"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  modelValue: string;
  label: string;
  options: SelectOption[];
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false,
  error: ''
});

defineEmits<{
  'update:modelValue': [value: string];
  blur: [];
}>();

const selectId = computed(() => {
  return `select-${props.label.toLowerCase().replace(/\s+/g, '-')}`;
});

const dropdownStyle = computed(() => ({
  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
  backgroundPosition: 'right 0.75rem center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '1.5em 1.5em',
  paddingRight: '2.5rem'
}));
</script>
```

**Step 4: Run test to verify it passes**

Run: `npm run test tests/components/DesignSystem/Form/FormSelect.test.ts`

Expected: PASS (all 6 tests passing)

**Step 5: Commit**

```bash
git add components/DesignSystem/Form/FormSelect.vue tests/components/DesignSystem/Form/FormSelect.test.ts
git commit -m "feat: add FormSelect design system component with tests"
```

---

### Task 3: FormTextarea Component

**Files:**
- Create: `components/DesignSystem/Form/FormTextarea.vue`
- Create: `tests/components/DesignSystem/Form/FormTextarea.test.ts`

**Step 1: Write failing test**

```typescript
// tests/components/DesignSystem/Form/FormTextarea.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FormTextarea from '~/components/DesignSystem/Form/FormTextarea.vue';

describe('FormTextarea', () => {
  it('renders label and textarea correctly', () => {
    const wrapper = mount(FormTextarea, {
      props: {
        modelValue: '',
        label: 'Notes',
        placeholder: 'Enter notes'
      }
    });

    expect(wrapper.find('label').text()).toContain('Notes');
    expect(wrapper.find('textarea').attributes('placeholder')).toBe('Enter notes');
  });

  it('sets correct number of rows', () => {
    const wrapper = mount(FormTextarea, {
      props: {
        modelValue: '',
        label: 'Description',
        rows: 5
      }
    });

    expect(wrapper.find('textarea').attributes('rows')).toBe('5');
  });

  it('shows character counter when showCounter is true', () => {
    const wrapper = mount(FormTextarea, {
      props: {
        modelValue: 'Test content',
        label: 'Notes',
        maxlength: 100,
        showCounter: true
      }
    });

    expect(wrapper.text()).toContain('12/100');
  });

  it('applies warning color when approaching max length', () => {
    const wrapper = mount(FormTextarea, {
      props: {
        modelValue: 'a'.repeat(95),
        label: 'Notes',
        maxlength: 100,
        showCounter: true
      }
    });

    expect(wrapper.find('.text-red-600').exists()).toBe(true);
  });

  it('displays error message and applies error styling', () => {
    const wrapper = mount(FormTextarea, {
      props: {
        modelValue: '',
        label: 'Content',
        error: 'Content is required'
      }
    });

    expect(wrapper.find('textarea').classes()).toContain('border-red-500');
    expect(wrapper.text()).toContain('Content is required');
  });

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(FormTextarea, {
      props: {
        modelValue: '',
        label: 'Test'
      }
    });

    await wrapper.find('textarea').setValue('new text');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['new text']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test tests/components/DesignSystem/Form/FormTextarea.test.ts`

Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```vue
<!-- components/DesignSystem/Form/FormTextarea.vue -->
<template>
  <div>
    <label
      :for="textareaId"
      class="block text-sm font-medium text-slate-700 mb-2"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-red-500"
        aria-hidden="true"
      >*</span>
      <span v-if="required" class="sr-only">(required)</span>
    </label>
    <textarea
      :id="textareaId"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :rows="rows"
      :maxlength="maxlength"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${textareaId}-error` : undefined"
      :class="[
        'w-full px-4 py-3 bg-white border-2 rounded-xl',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'transition-all resize-none placeholder:text-slate-600',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        error ? 'border-red-500' : 'border-slate-300'
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @blur="$emit('blur')"
    />
    <p
      v-if="showCounter && maxlength"
      :class="[
        'text-xs mt-1',
        isNearLimit ? 'text-red-600' : 'text-slate-500'
      ]"
    >
      {{ currentLength }}/{{ maxlength }} characters
    </p>
    <DesignSystemFieldError
      v-if="error"
      :id="`${textareaId}-error`"
      :error="error"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  rows?: number;
  maxlength?: number;
  showCounter?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  required: false,
  disabled: false,
  error: '',
  rows: 4,
  maxlength: undefined,
  showCounter: false
});

defineEmits<{
  'update:modelValue': [value: string];
  blur: [];
}>();

const textareaId = computed(() => {
  return `textarea-${props.label.toLowerCase().replace(/\s+/g, '-')}`;
});

const currentLength = computed(() => {
  return props.modelValue?.length || 0;
});

const isNearLimit = computed(() => {
  if (!props.maxlength) return false;
  return currentLength.value > props.maxlength * 0.9;
});
</script>
```

**Step 4: Run test to verify it passes**

Run: `npm run test tests/components/DesignSystem/Form/FormTextarea.test.ts`

Expected: PASS (all 6 tests passing)

**Step 5: Commit**

```bash
git add components/DesignSystem/Form/FormTextarea.vue tests/components/DesignSystem/Form/FormTextarea.test.ts
git commit -m "feat: add FormTextarea design system component with tests"
```

---

### Task 4: FormButtonGroup Component

**Files:**
- Create: `components/DesignSystem/Form/FormButtonGroup.vue`
- Create: `tests/components/DesignSystem/Form/FormButtonGroup.test.ts`

**Step 1: Write failing test**

```typescript
// tests/components/DesignSystem/Form/FormButtonGroup.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FormButtonGroup from '~/components/DesignSystem/Form/FormButtonGroup.vue';

describe('FormButtonGroup', () => {
  it('renders submit and cancel buttons with correct labels', () => {
    const wrapper = mount(FormButtonGroup, {
      props: {
        submitLabel: 'Save',
        cancelLabel: 'Cancel'
      }
    });

    const buttons = wrapper.findAll('button');
    expect(buttons[0].text()).toBe('Save');
    expect(buttons[1].text()).toBe('Cancel');
  });

  it('shows loading state when loading is true', () => {
    const wrapper = mount(FormButtonGroup, {
      props: {
        submitLabel: 'Add School',
        cancelLabel: 'Cancel',
        loading: true
      }
    });

    expect(wrapper.find('button[type="submit"]').text()).toBe('Adding...');
  });

  it('disables submit button when submitDisabled is true', () => {
    const wrapper = mount(FormButtonGroup, {
      props: {
        submitLabel: 'Submit',
        cancelLabel: 'Cancel',
        submitDisabled: true
      }
    });

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();
  });

  it('disables both buttons when loading is true', () => {
    const wrapper = mount(FormButtonGroup, {
      props: {
        submitLabel: 'Submit',
        cancelLabel: 'Cancel',
        loading: true
      }
    });

    const buttons = wrapper.findAll('button');
    expect(buttons[0].attributes('disabled')).toBeDefined();
    expect(buttons[1].attributes('disabled')).toBeDefined();
  });

  it('emits submit event when submit button clicked', async () => {
    const wrapper = mount(FormButtonGroup, {
      props: {
        submitLabel: 'Submit',
        cancelLabel: 'Cancel'
      }
    });

    await wrapper.find('button[type="submit"]').trigger('click');
    expect(wrapper.emitted('submit')).toBeTruthy();
  });

  it('emits cancel event when cancel button clicked', async () => {
    const wrapper = mount(FormButtonGroup, {
      props: {
        submitLabel: 'Submit',
        cancelLabel: 'Cancel'
      }
    });

    await wrapper.find('button[type="button"]').trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test tests/components/DesignSystem/Form/FormButtonGroup.test.ts`

Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```vue
<!-- components/DesignSystem/Form/FormButtonGroup.vue -->
<template>
  <div class="flex gap-3 pt-4">
    <button
      type="submit"
      :disabled="loading || submitDisabled"
      :aria-busy="loading"
      :class="[
        'flex-1 px-4 py-3 text-white font-semibold rounded-xl transition',
        'bg-gradient-to-r from-blue-500 to-blue-600',
        'hover:from-blue-600 hover:to-blue-700',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
      ]"
      @click="$emit('submit')"
    >
      {{ loading ? loadingLabel : submitLabel }}
    </button>
    <button
      type="button"
      :disabled="loading"
      :class="[
        'flex-1 px-4 py-3 bg-white text-slate-700 font-semibold rounded-xl',
        'border-2 border-slate-300 hover:bg-slate-50 transition',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2'
      ]"
      @click="$emit('cancel')"
    >
      {{ cancelLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  submitLabel: string;
  cancelLabel: string;
  loading?: boolean;
  submitDisabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  submitDisabled: false
});

defineEmits<{
  submit: [];
  cancel: [];
}>();

const loadingLabel = computed(() => {
  // Convert "Add School" to "Adding..."
  // Convert "Create Event" to "Creating..."
  const verb = props.submitLabel.split(' ')[0];
  return `${verb}ing...`;
});
</script>
```

**Step 4: Run test to verify it passes**

Run: `npm run test tests/components/DesignSystem/Form/FormButtonGroup.test.ts`

Expected: PASS (all 6 tests passing)

**Step 5: Commit**

```bash
git add components/DesignSystem/Form/FormButtonGroup.vue tests/components/DesignSystem/Form/FormButtonGroup.test.ts
git commit -m "feat: add FormButtonGroup design system component with tests"
```

---

### Task 5: FormCheckbox Component

**Files:**
- Create: `components/DesignSystem/Form/FormCheckbox.vue`
- Create: `tests/components/DesignSystem/Form/FormCheckbox.test.ts`

**Step 1: Write failing test**

```typescript
// tests/components/DesignSystem/Form/FormCheckbox.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FormCheckbox from '~/components/DesignSystem/Form/FormCheckbox.vue';

describe('FormCheckbox', () => {
  it('renders label correctly', () => {
    const wrapper = mount(FormCheckbox, {
      props: {
        modelValue: false,
        label: 'Accept Terms'
      }
    });

    expect(wrapper.find('label').text()).toContain('Accept Terms');
  });

  it('checks checkbox when modelValue is true', () => {
    const wrapper = mount(FormCheckbox, {
      props: {
        modelValue: true,
        label: 'Registered'
      }
    });

    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(true);
  });

  it('emits update:modelValue on change', async () => {
    const wrapper = mount(FormCheckbox, {
      props: {
        modelValue: false,
        label: 'Test'
      }
    });

    await wrapper.find('input').setValue(true);
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
  });

  it('disables checkbox when disabled is true', () => {
    const wrapper = mount(FormCheckbox, {
      props: {
        modelValue: false,
        label: 'Test',
        disabled: true
      }
    });

    expect(wrapper.find('input').attributes('disabled')).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test tests/components/DesignSystem/Form/FormCheckbox.test.ts`

Expected: FAIL

**Step 3: Write minimal implementation**

```vue
<!-- components/DesignSystem/Form/FormCheckbox.vue -->
<template>
  <label :class="['flex items-center', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer']">
    <input
      :id="checkboxId"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      class="w-4 h-4 border-2 border-slate-300 rounded text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="ml-2 text-sm text-slate-700">{{ label }}</span>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: boolean;
  label: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
});

defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const checkboxId = computed(() => {
  return `checkbox-${props.label.toLowerCase().replace(/\s+/g, '-')}`;
});
</script>
```

**Step 4: Run test to verify it passes**

Run: `npm run test tests/components/DesignSystem/Form/FormCheckbox.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add components/DesignSystem/Form/FormCheckbox.vue tests/components/DesignSystem/Form/FormCheckbox.test.ts
git commit -m "feat: add FormCheckbox design system component with tests"
```

---

### Task 6: FormDateInput and FormTimeInput Components

**Files:**
- Create: `components/DesignSystem/Form/FormDateInput.vue`
- Create: `components/DesignSystem/Form/FormTimeInput.vue`
- Create: `tests/components/DesignSystem/Form/FormDateInput.test.ts`
- Create: `tests/components/DesignSystem/Form/FormTimeInput.test.ts`

**Step 1: Write failing tests**

```typescript
// tests/components/DesignSystem/Form/FormDateInput.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FormDateInput from '~/components/DesignSystem/Form/FormDateInput.vue';

describe('FormDateInput', () => {
  it('renders date input with label', () => {
    const wrapper = mount(FormDateInput, {
      props: {
        modelValue: '2026-02-15',
        label: 'Start Date'
      }
    });

    expect(wrapper.find('label').text()).toContain('Start Date');
    expect(wrapper.find('input').attributes('type')).toBe('date');
  });

  it('displays error and applies error styling', () => {
    const wrapper = mount(FormDateInput, {
      props: {
        modelValue: '',
        label: 'Date',
        error: 'Date is required'
      }
    });

    expect(wrapper.find('input').classes()).toContain('border-red-500');
  });

  it('emits update:modelValue on change', async () => {
    const wrapper = mount(FormDateInput, {
      props: {
        modelValue: '',
        label: 'Test'
      }
    });

    await wrapper.find('input').setValue('2026-03-01');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['2026-03-01']);
  });
});
```

```typescript
// tests/components/DesignSystem/Form/FormTimeInput.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FormTimeInput from '~/components/DesignSystem/Form/FormTimeInput.vue';

describe('FormTimeInput', () => {
  it('renders time input with label', () => {
    const wrapper = mount(FormTimeInput, {
      props: {
        modelValue: '14:30',
        label: 'Start Time'
      }
    });

    expect(wrapper.find('label').text()).toContain('Start Time');
    expect(wrapper.find('input').attributes('type')).toBe('time');
  });

  it('emits update:modelValue on change', async () => {
    const wrapper = mount(FormTimeInput, {
      props: {
        modelValue: '',
        label: 'Test'
      }
    });

    await wrapper.find('input').setValue('09:00');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['09:00']);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test tests/components/DesignSystem/Form/FormDateInput.test.ts tests/components/DesignSystem/Form/FormTimeInput.test.ts`

Expected: FAIL

**Step 3: Write minimal implementations**

```vue
<!-- components/DesignSystem/Form/FormDateInput.vue -->
<template>
  <div>
    <label
      :for="inputId"
      class="block text-sm font-medium text-slate-700 mb-2"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-red-500"
        aria-hidden="true"
      >*</span>
      <span v-if="required" class="sr-only">(required)</span>
    </label>
    <input
      :id="inputId"
      type="date"
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      :min="min"
      :max="max"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${inputId}-error` : undefined"
      :class="[
        'w-full px-4 py-3 bg-white border-2 rounded-xl',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        error ? 'border-red-500' : 'border-slate-300'
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur')"
    />
    <DesignSystemFieldError
      v-if="error"
      :id="`${inputId}-error`"
      :error="error"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  min?: string;
  max?: string;
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false,
  error: '',
  min: undefined,
  max: undefined
});

defineEmits<{
  'update:modelValue': [value: string];
  blur: [];
}>();

const inputId = computed(() => {
  return `date-${props.label.toLowerCase().replace(/\s+/g, '-')}`;
});
</script>
```

```vue
<!-- components/DesignSystem/Form/FormTimeInput.vue -->
<template>
  <div>
    <label
      :for="inputId"
      class="block text-sm font-medium text-slate-700 mb-2"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-red-500"
        aria-hidden="true"
      >*</span>
      <span v-if="required" class="sr-only">(required)</span>
    </label>
    <input
      :id="inputId"
      type="time"
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${inputId}-error` : undefined"
      :class="[
        'w-full px-4 py-3 bg-white border-2 rounded-xl',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        error ? 'border-red-500' : 'border-slate-300'
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur')"
    />
    <DesignSystemFieldError
      v-if="error"
      :id="`${inputId}-error`"
      :error="error"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false,
  error: ''
});

defineEmits<{
  'update:modelValue': [value: string];
  blur: [];
}>();

const inputId = computed(() => {
  return `time-${props.label.toLowerCase().replace(/\s+/g, '-')}`;
});
</script>
```

**Step 4: Run tests to verify they pass**

Run: `npm run test tests/components/DesignSystem/Form/FormDateInput.test.ts tests/components/DesignSystem/Form/FormTimeInput.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add components/DesignSystem/Form/FormDateInput.vue components/DesignSystem/Form/FormTimeInput.vue tests/components/DesignSystem/Form/FormDateInput.test.ts tests/components/DesignSystem/Form/FormTimeInput.test.ts
git commit -m "feat: add FormDateInput and FormTimeInput design system components with tests"
```

---

### Task 7: FormFileInput Component

**Files:**
- Create: `components/DesignSystem/Form/FormFileInput.vue`
- Create: `tests/components/DesignSystem/Form/FormFileInput.test.ts`

**Step 1: Write failing test**

```typescript
// tests/components/DesignSystem/Form/FormFileInput.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FormFileInput from '~/components/DesignSystem/Form/FormFileInput.vue';

describe('FormFileInput', () => {
  it('renders label and file input', () => {
    const wrapper = mount(FormFileInput, {
      props: {
        label: 'Upload Files',
        accept: '.pdf,.jpg,.png'
      }
    });

    expect(wrapper.find('label').text()).toContain('Upload Files');
    expect(wrapper.find('input').attributes('type')).toBe('file');
    expect(wrapper.find('input').attributes('accept')).toBe('.pdf,.jpg,.png');
  });

  it('allows multiple files when multiple is true', () => {
    const wrapper = mount(FormFileInput, {
      props: {
        label: 'Files',
        multiple: true
      }
    });

    expect(wrapper.find('input').attributes('multiple')).toBeDefined();
  });

  it('shows helper text when provided', () => {
    const wrapper = mount(FormFileInput, {
      props: {
        label: 'Documents',
        helperText: 'PDF, images up to 10MB'
      }
    });

    expect(wrapper.text()).toContain('PDF, images up to 10MB');
  });

  it('emits change event with files', async () => {
    const wrapper = mount(FormFileInput, {
      props: {
        label: 'Test'
      }
    });

    const input = wrapper.find('input');
    const files = [new File(['content'], 'test.pdf', { type: 'application/pdf' })];

    Object.defineProperty(input.element, 'files', {
      value: files,
      writable: false
    });

    await input.trigger('change');
    expect(wrapper.emitted('change')).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test tests/components/DesignSystem/Form/FormFileInput.test.ts`

Expected: FAIL

**Step 3: Write minimal implementation**

```vue
<!-- components/DesignSystem/Form/FormFileInput.vue -->
<template>
  <div>
    <label
      :for="inputId"
      class="block text-sm font-medium text-slate-700 mb-2"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-red-500"
        aria-hidden="true"
      >*</span>
      <span v-if="required" class="sr-only">(required)</span>
      <span v-if="helperText" class="text-xs font-normal text-slate-500 ml-1">
        {{ helperText }}
      </span>
    </label>
    <input
      :id="inputId"
      type="file"
      :accept="accept"
      :multiple="multiple"
      :required="required"
      :disabled="disabled"
      :class="[
        'w-full px-3 py-2 border-2 border-slate-300 rounded-lg',
        'text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      ]"
      @change="handleChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  label: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  accept: '',
  multiple: false,
  required: false,
  disabled: false,
  helperText: ''
});

const emit = defineEmits<{
  change: [files: FileList | null];
}>();

const inputId = computed(() => {
  return `file-${props.label.toLowerCase().replace(/\s+/g, '-')}`;
});

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('change', target.files);
};
</script>
```

**Step 4: Run test to verify it passes**

Run: `npm run test tests/components/DesignSystem/Form/FormFileInput.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add components/DesignSystem/Form/FormFileInput.vue tests/components/DesignSystem/Form/FormFileInput.test.ts
git commit -m "feat: add FormFileInput design system component with tests"
```

---

### Task 8: Verify All Design System Components Pass Tests

**Step 1: Run all design system component tests**

Run: `npm run test tests/components/DesignSystem/Form/`

Expected: All tests PASS

**Step 2: Run type check**

Run: `npm run type-check`

Expected: No TypeScript errors

**Step 3: Run linter**

Run: `npm run lint`

Expected: No linting errors

**Step 4: Commit if any fixes needed**

```bash
git add -A
git commit -m "chore: fix linting and type errors in design system components"
```

---

## Phase 2: Migrate Forms

### Task 9: Create EventForm Component

**Files:**
- Create: `components/Event/EventForm.vue`
- Create: `tests/components/Event/EventForm.test.ts`
- Modify: `pages/events/create.vue` (to use EventForm)

**Step 1: Write failing test for EventForm**

```typescript
// tests/components/Event/EventForm.test.ts
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import EventForm from '~/components/Event/EventForm.vue';

describe('EventForm', () => {
  it('renders all required fields', () => {
    const wrapper = mount(EventForm, {
      props: {
        loading: false,
        schools: []
      }
    });

    expect(wrapper.text()).toContain('Event Type');
    expect(wrapper.text()).toContain('Event Name');
    expect(wrapper.text()).toContain('Start Date');
  });

  it('emits submit with form data', async () => {
    const wrapper = mount(EventForm, {
      props: {
        loading: false,
        schools: []
      }
    });

    // Fill required fields
    await wrapper.findComponent({ name: 'FormSelect' }).vm.$emit('update:modelValue', 'camp');
    await wrapper.findComponent({ name: 'FormInput' }).vm.$emit('update:modelValue', 'Test Camp');
    await wrapper.findComponent({ name: 'FormDateInput' }).vm.$emit('update:modelValue', '2026-03-01');

    await wrapper.findComponent({ name: 'FormButtonGroup' }).vm.$emit('submit');

    expect(wrapper.emitted('submit')).toBeTruthy();
    const submitData = wrapper.emitted('submit')?.[0]?.[0] as any;
    expect(submitData.name).toBe('Test Camp');
    expect(submitData.type).toBe('camp');
  });

  it('emits cancel event', async () => {
    const wrapper = mount(EventForm, {
      props: {
        loading: false,
        schools: []
      }
    });

    await wrapper.findComponent({ name: 'FormButtonGroup' }).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('validates required fields', async () => {
    const wrapper = mount(EventForm, {
      props: {
        loading: false,
        schools: []
      }
    });

    // Try to submit without filling required fields
    await wrapper.findComponent({ name: 'FormButtonGroup' }).vm.$emit('submit');

    // Should not emit submit if validation fails
    expect(wrapper.emitted('submit')).toBeFalsy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test tests/components/Event/EventForm.test.ts`

Expected: FAIL

**Step 3: Write EventForm component**

```vue
<!-- components/Event/EventForm.vue -->
<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Error Summary -->
    <FormErrorSummary
      v-if="hasErrors"
      :errors="errors"
      @dismiss="clearErrors"
    />

    <!-- Event Info Section -->
    <div class="space-y-6">
      <h2 class="text-lg font-semibold text-slate-900 pb-2 border-b border-slate-200">
        Event Info
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormSelect
          v-model="formData.type"
          label="Event Type"
          :options="eventTypeOptions"
          required
          :error="fieldErrors.type"
          :disabled="loading"
          @blur="validateField('type', formData.type, validators.type)"
        />

        <FormInput
          v-model="formData.name"
          label="Event Name"
          placeholder="e.g., Spring Showcase 2026"
          required
          :error="fieldErrors.name"
          :disabled="loading"
          @blur="validateField('name', formData.name, validators.name)"
        />

        <FormSelect
          v-if="schools.length > 0"
          v-model="formData.school_id"
          label="School"
          :options="schoolOptions"
          :error="fieldErrors.school_id"
          :disabled="loading"
        />

        <FormSelect
          v-model="formData.event_source"
          label="Event Source"
          :options="eventSourceOptions"
          :disabled="loading"
        />

        <FormInput
          v-model.number="formData.cost"
          label="Cost ($)"
          type="number"
          placeholder="0.00"
          :disabled="loading"
        />

        <FormInput
          v-model="formData.url"
          label="Event URL"
          type="url"
          placeholder="https://..."
          :error="fieldErrors.url"
          :disabled="loading"
        />
      </div>
    </div>

    <!-- Date & Time Section -->
    <div class="space-y-6">
      <h2 class="text-lg font-semibold text-slate-900 pb-2 border-b border-slate-200">
        Date & Time
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormDateInput
          v-model="formData.start_date"
          label="Start Date"
          required
          :error="fieldErrors.start_date"
          :disabled="loading"
        />

        <FormTimeInput
          v-model="formData.start_time"
          label="Start Time"
          :disabled="loading"
        />

        <FormDateInput
          v-model="formData.end_date"
          label="End Date"
          :disabled="loading"
        />

        <FormTimeInput
          v-model="formData.end_time"
          label="End Time"
          :disabled="loading"
        />

        <FormTimeInput
          v-model="formData.checkin_time"
          label="Check-in Time"
          :disabled="loading"
        />
      </div>
    </div>

    <!-- Location Section -->
    <div class="space-y-6">
      <h2 class="text-lg font-semibold text-slate-900 pb-2 border-b border-slate-200">
        Location
      </h2>

      <div class="grid grid-cols-1 gap-6">
        <FormInput
          v-model="formData.address"
          label="Street Address"
          placeholder="e.g., 123 Main St"
          :disabled="loading"
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput
            v-model="formData.city"
            label="City"
            placeholder="e.g., Atlanta"
            :disabled="loading"
          />

          <FormInput
            v-model="formData.state"
            label="State"
            placeholder="e.g., GA"
            maxlength="2"
            :disabled="loading"
          />
        </div>
      </div>
    </div>

    <!-- Event Details Section -->
    <div class="space-y-6">
      <h2 class="text-lg font-semibold text-slate-900 pb-2 border-b border-slate-200">
        Event Details
      </h2>

      <FormTextarea
        v-model="formData.description"
        label="Event Description"
        placeholder="Details about the event..."
        :rows="3"
        :disabled="loading"
      />

      <div class="flex gap-6">
        <FormCheckbox
          v-model="formData.registered"
          label="Registered"
          :disabled="loading"
        />

        <FormCheckbox
          v-model="formData.attended"
          label="Attended"
          :disabled="loading"
        />
      </div>
    </div>

    <!-- Performance Section -->
    <div class="space-y-6">
      <h2 class="text-lg font-semibold text-slate-900 pb-2 border-b border-slate-200">
        Performance
      </h2>

      <FormTextarea
        v-model="formData.performance_notes"
        label="Performance Notes"
        placeholder="How did you perform? Any feedback from coaches?"
        :rows="4"
        :disabled="loading"
      />
    </div>

    <!-- Submit Buttons -->
    <FormButtonGroup
      submit-label="Create Event"
      cancel-label="Cancel"
      :loading="loading"
      :submit-disabled="!isFormValid"
      @submit="handleSubmit"
      @cancel="$emit('cancel')"
    />
  </form>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue';
import { useFormValidation } from '~/composables/useFormValidation';
import { z } from 'zod';
import type { School } from '~/types/models';

interface Props {
  loading: boolean;
  schools: School[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: any];
  cancel: [];
}>();

const { errors, fieldErrors, validate, validateField, clearErrors, hasErrors } =
  useFormValidation();

const formData = reactive({
  type: '',
  name: '',
  school_id: '',
  event_source: '',
  cost: null as number | null,
  url: '',
  start_date: '',
  start_time: '',
  end_date: '',
  end_time: '',
  checkin_time: '',
  address: '',
  city: '',
  state: '',
  description: '',
  registered: false,
  attended: false,
  performance_notes: ''
});

const validators = {
  type: z.string().min(1, 'Event type is required'),
  name: z.string().min(1, 'Event name is required'),
  start_date: z.string().min(1, 'Start date is required'),
  url: z.string().url('Invalid URL').or(z.literal(''))
};

const eventTypeOptions = [
  { value: '', label: 'Select Type' },
  { value: 'showcase', label: 'Showcase' },
  { value: 'camp', label: 'Camp' },
  { value: 'official_visit', label: 'Official Visit' },
  { value: 'unofficial_visit', label: 'Unofficial Visit' },
  { value: 'game', label: 'Game' }
];

const eventSourceOptions = [
  { value: '', label: 'Select Source (Optional)' },
  { value: 'email', label: 'Email' },
  { value: 'flyer', label: 'Flyer' },
  { value: 'web_search', label: 'Web Search' },
  { value: 'recommendation', label: 'Recommendation' },
  { value: 'friend', label: 'Friend' },
  { value: 'other', label: 'Other' }
];

const schoolOptions = computed(() => {
  return [
    { value: '', label: '-- Select a school --' },
    ...props.schools.map(s => ({ value: s.id, label: s.name })),
    { value: 'none', label: 'None' },
    { value: 'other', label: 'Other (not listed)' }
  ];
});

const isFormValid = computed(() => {
  return formData.type && formData.name && formData.start_date && !hasErrors.value;
});

const handleSubmit = async () => {
  const isValid = await validate(formData, z.object({
    type: validators.type,
    name: validators.name,
    start_date: validators.start_date,
    url: validators.url
  }));

  if (!isValid) return;

  emit('submit', {
    ...formData,
    school_id: formData.school_id === 'none' ? null : formData.school_id || null,
    cost: formData.cost && typeof formData.cost === 'number' ? formData.cost : null
  });
};
</script>
```

**Step 4: Run test to verify it passes**

Run: `npm run test tests/components/Event/EventForm.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add components/Event/EventForm.vue tests/components/Event/EventForm.test.ts
git commit -m "feat: create EventForm component with design system components"
```

---

### Task 10: Update pages/events/create.vue to use EventForm

**Files:**
- Modify: `pages/events/create.vue`

**Step 1: Refactor create page to use EventForm**

Replace the inline form with EventForm component:

```vue
<!-- pages/events/create.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back Link -->
      <div class="mb-6">
        <NuxtLink
          to="/events"
          class="text-blue-600 hover:text-blue-700 font-semibold"
        >
          ← Back to Events
        </NuxtLink>
      </div>

      <!-- Page Card -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <h1 class="text-2xl font-bold text-slate-900 mb-6">Add New Event</h1>

        <EventForm
          :loading="loading"
          :schools="schools"
          @submit="handleCreate"
          @cancel="router.push('/events')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useEvents } from '~/composables/useEvents';
import { useSchools } from '~/composables/useSchools';
import { useRouter } from 'vue-router';

definePageMeta({
  middleware: 'auth'
});

const { createEvent, loading } = useEvents();
const { schools, fetchSchools } = useSchools();
const router = useRouter();

const handleCreate = async (formData: any) => {
  try {
    const newEvent = await createEvent(formData);
    await router.push(`/events/${newEvent.id}`);
  } catch (err) {
    console.error('Failed to create event:', err);
  }
};

onMounted(async () => {
  await fetchSchools();
});
</script>
```

**Step 2: Test in browser**

Manual test:
1. Navigate to `/events/create`
2. Fill out form with valid data
3. Submit and verify event is created
4. Check validation works (try submitting empty form)

**Step 3: Update E2E tests**

Modify: `tests/e2e/events.spec.ts` (if exists) to work with new form structure

**Step 4: Run all tests**

Run: `npm run test && npm run test:e2e`

Expected: All tests PASS

**Step 5: Commit**

```bash
git add pages/events/create.vue tests/e2e/events.spec.ts
git commit -m "refactor: update events/create page to use EventForm component"
```

---

### Task 11: Update SchoolForm Component

**Files:**
- Modify: `components/School/SchoolForm.vue`
- Modify: `tests/components/School/SchoolForm.test.ts` (if exists)

**Step 1: Refactor SchoolForm to use design system components**

Update SchoolForm.vue to replace raw inputs with FormInput, FormSelect, FormTextarea, FormButtonGroup.

**Step 2: Test SchoolForm**

Run: `npm run test tests/components/School/`

Expected: PASS

**Step 3: Browser test**

Navigate to pages that use SchoolForm and verify it still works.

**Step 4: Commit**

```bash
git add components/School/SchoolForm.vue tests/components/School/SchoolForm.test.ts
git commit -m "refactor: update SchoolForm to use design system components"
```

---

### Task 12: Update CoachForm Component

**Files:**
- Create: `components/Coach/CoachForm.vue` (extract from AddCoachModal)
- Modify: `components/Coach/AddCoachModal.vue` (use CoachForm)

**Step 1: Extract CoachForm from AddCoachModal**

Create CoachForm.vue with design system components, blue theme (not indigo).

**Step 2: Update AddCoachModal to use CoachForm**

**Step 3: Test**

Run: `npm run test tests/components/Coach/`

**Step 4: Commit**

```bash
git add components/Coach/CoachForm.vue components/Coach/AddCoachModal.vue
git commit -m "refactor: extract CoachForm and update to design system components"
```

---

### Task 13: Update InteractionForm Component

**Files:**
- Create: `components/Interaction/InteractionForm.vue` (extract from InteractionAddForm)
- Modify: `components/Interactions/InteractionAddForm.vue`

**Step 1: Extract InteractionForm**

**Step 2: Update InteractionAddForm**

**Step 3: Test**

Run: `npm run test tests/components/Interaction/`

**Step 4: Commit**

```bash
git add components/Interaction/InteractionForm.vue components/Interactions/InteractionAddForm.vue
git commit -m "refactor: extract InteractionForm and update to design system components"
```

---

### Task 14: Final Verification

**Step 1: Run all tests**

Run: `npm run test`

Expected: All unit tests PASS

**Step 2: Run E2E tests**

Run: `npm run test:e2e`

Expected: All E2E tests PASS

**Step 3: Run type check**

Run: `npm run type-check`

Expected: No TypeScript errors

**Step 4: Run linter**

Run: `npm run lint`

Expected: No linting errors

**Step 5: Browser test all forms**

Manual verification:
1. Add Event form - works with new design
2. Add School form - works with new design
3. Add Coach form - works with new design (blue theme, not indigo)
4. Add Interaction form - works with new design

**Step 6: Commit if any fixes**

```bash
git add -A
git commit -m "chore: final fixes for form standardization"
```

---

## Success Criteria Checklist

- ✅ All design system components created with tests
- ✅ EventForm migrated to use design system components
- ✅ SchoolForm migrated to use design system components
- ✅ CoachForm migrated to use design system components
- ✅ InteractionForm migrated to use design system components
- ✅ All forms use identical visual styling (slate palette, blue gradients)
- ✅ All forms have consistent validation and error handling
- ✅ All tests pass (unit, integration, E2E)
- ✅ Type checking passes
- ✅ Linting passes
- ✅ Browser testing confirms consistent UX

---

## Notes for Implementation

- **DRY**: Design system components eliminate duplication
- **YAGNI**: Only build what's in the design doc
- **TDD**: Write tests first, then implementation
- **Frequent commits**: Commit after each task
- **Reference skills**: Use @tdd-workflow, @vitest, @vue for guidance

---

## Appendix: File Structure After Implementation

```
components/
├── DesignSystem/
│   ├── FieldError.vue (existing)
│   └── Form/
│       ├── FormInput.vue
│       ├── FormSelect.vue
│       ├── FormTextarea.vue
│       ├── FormCheckbox.vue
│       ├── FormDateInput.vue
│       ├── FormTimeInput.vue
│       ├── FormFileInput.vue
│       └── FormButtonGroup.vue
├── Validation/
│   └── FormErrorSummary.vue (existing)
├── Event/
│   └── EventForm.vue (new)
├── School/
│   └── SchoolForm.vue (updated)
├── Coach/
│   ├── CoachForm.vue (new)
│   └── AddCoachModal.vue (updated)
└── Interaction/
    ├── InteractionForm.vue (new)
    └── InteractionAddForm.vue (updated)

pages/
└── events/
    └── create.vue (updated to use EventForm)

tests/
├── components/
│   ├── DesignSystem/Form/ (new tests)
│   ├── Event/ (new tests)
│   ├── School/ (updated tests)
│   ├── Coach/ (updated tests)
│   └── Interaction/ (updated tests)
└── e2e/ (updated tests)
```
