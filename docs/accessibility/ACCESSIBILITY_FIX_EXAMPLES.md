# Accessibility Fixes - Code Examples

## Critical Issue #1: Communication Panel Modal Focus Management

### Current (Inaccessible)

```vue
<Teleport to="body">
  <Transition name="fade">
    <div
      v-if="showPanel && coach"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      @click="showPanel = false"
    >
      <div
        class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <!-- Close button with NO label -->
        <button
          @click="showPanel = false"
          class="text-slate-400 hover:text-slate-600"
        >
          <XMarkIcon class="w-6 h-6" />
        </button>
```

### Fixed (Accessible)

```vue
<Teleport to="body">
  <Transition name="fade">
    <div
      v-if="showPanel && coach"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      @click="showPanel = false"
      @keydown.esc="showPanel = false"
      role="presentation"
    >
      <div
        class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        @click.stop
        role="dialog"
        aria-modal="true"
        aria-labelledby="communication-panel-title"
        ref="modalRef"
      >
        <div class="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <h2 id="communication-panel-title" class="text-xl font-bold text-slate-900">
            Quick Communication
          </h2>
          <button
            @click="showPanel = false"
            aria-label="Close communication panel"
            class="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
          >
            <XMarkIcon class="w-6 h-6" aria-hidden="true" />
          </button>
        </div>
```

**What Changed:**

- Added `role="dialog"` and `aria-modal="true"` to modal container
- Added `aria-labelledby="communication-panel-title"` pointing to title
- Added `aria-label="Close communication panel"` to close button
- Added `@keydown.esc="showPanel = false"` for Escape key support
- Added `aria-hidden="true"` to icon (text label is sufficient)
- Added focus:ring styling to close button

**Focus Trap Implementation (add to script):**

```typescript
import { ref, watch, onMounted, onUnmounted } from "vue";

const modalRef = ref<HTMLDivElement | null>(null);
const previouslyFocusedElement = ref<HTMLElement | null>(null);

watch(showPanel, (isOpen) => {
  if (isOpen) {
    // Save currently focused element
    previouslyFocusedElement.value = document.activeElement as HTMLElement;
    // Move focus to modal after transition
    setTimeout(() => {
      modalRef.value?.focus();
    }, 50);
  } else if (previouslyFocusedElement.value) {
    // Restore focus when modal closes
    previouslyFocusedElement.value.focus();
  }
});
```

---

## Critical Issue #2: EditCoachModal Focus Management

### Current (Inaccessible)

```vue
<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
  <div class="rounded-xl shadow-xl max-w-2xl w-full">
    <div class="flex items-center justify-between p-6 border-b border-slate-200">
      <h2 class="text-2xl font-bold text-slate-900">Edit Coach</h2>
      <button
        @click="$emit('close')"
        class="text-2xl text-slate-500 transition hover:text-slate-900"
      >
        ×
      </button>
```

### Fixed (Accessible)

```vue
<Teleport to="body">
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @keydown.esc="$emit('close')"
    role="presentation"
  >
    <div
      class="rounded-xl shadow-xl max-w-2xl w-full"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-coach-title"
      ref="modalRef"
    >
      <div class="flex items-center justify-between p-6 border-b border-slate-200">
        <h2 id="edit-coach-title" class="text-2xl font-bold text-slate-900">
          Edit Coach
        </h2>
        <button
          @click="$emit('close')"
          aria-label="Close edit dialog"
          class="text-slate-500 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
        >
          <span aria-hidden="true">×</span>
        </button>
```

---

## High Priority Issue #4: Color + Text Status Indicators

### Current (Color Only)

```vue
<template>
  <section aria-labelledby="coach-stats-heading">
    <h2 id="coach-stats-heading" class="sr-only">Coach Statistics</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Days Since Contact - COLOR ONLY -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 id="stat-days-since-contact" class="text-sm text-slate-500">
          Days Since Contact
        </h3>
        <p
          class="text-3xl font-bold"
          :class="daysSinceContactColor"
          aria-labelledby="stat-days-since-contact"
        >
          {{ stats.daysSinceContact }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const daysSinceContactColor = computed(() => {
  if (props.stats.daysSinceContact === 0) return "text-emerald-600";
  if (props.stats.daysSinceContact > 30) return "text-red-600";
  return "text-orange-500";
});
</script>
```

### Fixed (Color + Text)

```vue
<template>
  <section aria-labelledby="coach-stats-heading">
    <h2 id="coach-stats-heading" class="sr-only">Coach Statistics</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Days Since Contact - COLOR + TEXT LABEL -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 id="stat-days-since-contact" class="text-sm text-slate-500">
          Days Since Contact
        </h3>
        <div class="flex items-center gap-3 mt-2">
          <p
            class="text-3xl font-bold"
            :class="daysSinceContactColor"
            aria-label="Days since contact"
          >
            {{ stats.daysSinceContact }}
          </p>
          <!-- Text badge with status -->
          <span
            :class="[
              'text-xs font-semibold px-2 py-1 rounded border border-current',
              daysSinceContactBadgeClass,
            ]"
            role="status"
            aria-live="polite"
          >
            {{ daysSinceContactStatus }}
          </span>
        </div>
        <p class="text-xs text-slate-500 mt-2">
          {{ daysSinceContactHint }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const daysSinceContactStatus = computed(() => {
  if (props.stats.daysSinceContact === 0) return "Just contacted";
  if (props.stats.daysSinceContact > 30) return "Urgent";
  return "Follow up soon";
});

const daysSinceContactBadgeClass = computed(() => {
  if (props.stats.daysSinceContact === 0)
    return "bg-emerald-100 text-emerald-700";
  if (props.stats.daysSinceContact > 30) return "bg-red-100 text-red-700";
  return "bg-orange-100 text-orange-700";
});

const daysSinceContactHint = computed(() => {
  if (props.stats.daysSinceContact === 0)
    return "Last contact was today - great work!";
  if (props.stats.daysSinceContact > 30)
    return `No contact in over a month - reach out soon`;
  return `Last contact was ${props.stats.daysSinceContact} days ago`;
});
</script>
```

**What Changed:**

- Added text badge with status label next to number
- Added `role="status"` and `aria-live="polite"` for dynamic announcements
- Added descriptive hint text for screen reader users
- Used both color AND text to convey status

---

## High Priority Issue #5: Semantic Interaction List

### Current (No Semantics)

```vue
<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <h3 class="text-lg font-semibold text-slate-900 mb-4">
      Recent Interactions
    </h3>

    <div v-if="interactions.length === 0" class="text-center py-8">
      <p class="text-slate-600">No interactions recorded yet</p>
    </div>

    <!-- DIV-based list - NOT semantic -->
    <div v-else class="border border-slate-200 rounded-lg overflow-hidden">
      <div
        v-for="(interaction, index) in displayedInteractions"
        :key="interaction.id"
        class="flex items-center justify-between px-4 py-3"
        :class="{ 'border-t border-slate-200': index > 0 }"
      >
        <div class="flex items-center gap-3">
          <!-- Icon with NO text alternative -->
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center"
            :class="getInteractionBgColor(interaction.type)"
          >
            <component
              :is="getInteractionIconComponent(interaction.type)"
              class="w-4 h-4"
              :class="getInteractionIconColor(interaction.type)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

### Fixed (Semantic List)

```vue
<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <h2 class="text-lg font-semibold text-slate-900 mb-4">
      Recent Interactions with {{ coachName }}
    </h2>

    <div v-if="interactions.length === 0" class="text-center py-8">
      <p class="text-slate-600">No interactions recorded yet</p>
    </div>

    <!-- UL-based list - SEMANTIC -->
    <ul
      v-else
      class="border border-slate-200 rounded-lg overflow-hidden space-y-0"
    >
      <li
        v-for="(interaction, index) in displayedInteractions"
        :key="interaction.id"
        class="flex items-center justify-between px-4 py-3 border-t border-slate-200 first:border-t-0"
      >
        <div class="flex items-center gap-3 flex-1">
          <!-- Icon with aria-label -->
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            :class="getInteractionBgColor(interaction.type)"
            role="img"
            :aria-label="formatInteractionType(interaction.type)"
          >
            <component
              :is="getInteractionIconComponent(interaction.type)"
              class="w-4 h-4"
              :class="getInteractionIconColor(interaction.type)"
              aria-hidden="true"
            />
          </div>

          <!-- Interaction details -->
          <div class="min-w-0">
            <p class="font-medium text-slate-900">
              {{ formatInteractionType(interaction.type) }}
            </p>
            <time class="text-xs text-slate-500">
              {{ formatDate(interaction.occurred_at) }}
            </time>
          </div>
        </div>

        <!-- Right side info -->
        <div class="flex items-center gap-2 flex-shrink-0 ml-2">
          <!-- Sentiment with aria-label -->
          <span
            v-if="interaction.sentiment"
            class="px-2 py-1 text-xs font-semibold rounded"
            :class="getSentimentColor(interaction.sentiment)"
            :aria-label="`Sentiment: ${interaction.sentiment}`"
          >
            {{ interaction.sentiment }}
          </span>

          <!-- Subject with title for truncated text -->
          <span
            v-if="interaction.subject"
            class="text-sm text-slate-600 max-w-[200px] truncate"
            :title="interaction.subject"
          >
            {{ interaction.subject }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>
```

**What Changed:**

- Changed from `<div>` wrapper to semantic `<ul>`
- Changed item divs to semantic `<li>`
- Added `role="img"` and `aria-label` to icon container
- Added `aria-hidden="true"` to icon component
- Added `<time>` element for date (semantic)
- Added `aria-label` to sentiment badge
- Added `title` attribute to truncated text for tooltip on hover

---

## High Priority Issue #6: Save State Feedback with ARIA Live

### Current (No Feedback)

```vue
<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-slate-900">Notes</h3>
      <button @click="toggleEdit" class="text-sm text-slate-600">
        <PencilIcon class="w-4 h-4" />
        {{ isEditing ? "Cancel" : "Edit" }}
      </button>
    </div>

    <div v-if="!isEditing" class="text-slate-700">
      {{ modelValue || "No notes added yet." }}
    </div>

    <div v-if="isEditing" class="space-y-4">
      <textarea v-model="editedValue" rows="6" class="..." />
      <button @click="handleSave" :disabled="isSaving" class="...">
        {{ isSaving ? "Saving..." : "Save Notes" }}
      </button>
    </div>
  </div>
</template>
```

### Fixed (With Feedback)

```vue
<template>
  <!-- Status feedback region with aria-live -->
  <div
    v-if="saveStatus"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    class="mb-4 px-4 py-3 rounded-lg border"
    :class="{
      'bg-green-50 text-green-700 border-green-200': saveStatus === 'success',
      'bg-red-50 text-red-700 border-red-200': saveStatus === 'error',
    }"
  >
    {{
      saveStatus === "success"
        ? "Notes saved successfully"
        : "Failed to save notes. Please try again."
    }}
  </div>

  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-slate-900">Notes</h3>
      <button
        @click="toggleEdit"
        class="text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
        :aria-label="isEditing ? 'Cancel editing notes' : 'Edit notes'"
      >
        <PencilIcon class="w-4 h-4" aria-hidden="true" />
        {{ isEditing ? "Cancel" : "Edit" }}
      </button>
    </div>

    <div v-if="!isEditing" class="text-slate-700 whitespace-pre-wrap">
      {{ modelValue || "No notes added yet." }}
    </div>

    <div v-if="isEditing" class="space-y-4">
      <textarea
        v-model="editedValue"
        rows="6"
        class="..."
        :aria-label="`Edit notes`"
      />
      <div class="flex gap-3">
        <button
          @click="handleSave"
          :disabled="isSaving"
          :aria-busy="isSaving"
          :aria-label="isSaving ? 'Saving notes' : 'Save notes'"
          class="..."
        >
          {{ isSaving ? "Saving..." : "Save Notes" }}
        </button>
        <button @click="cancelEdit" class="...">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

type SaveStatus = "success" | "error" | null;
const saveStatus = ref<SaveStatus>(null);

const handleSave = async () => {
  try {
    await save(async (value: string) => {
      emit("update:modelValue", value);
      emit("save", value);

      // Show success message
      saveStatus.value = "success";

      // Clear after 3 seconds
      setTimeout(() => {
        saveStatus.value = null;
      }, 3000);
    });
  } catch (error) {
    // Show error message
    saveStatus.value = "error";

    // Clear after 5 seconds
    setTimeout(() => {
      saveStatus.value = null;
    }, 5000);
  }
};
</script>
```

**What Changed:**

- Added `role="status"` and `aria-live="polite"` region for feedback messages
- Added `aria-busy="true"` to save button while saving
- Added `aria-label` to buttons for clarity
- Show feedback message on success or error
- Auto-clear message after 3-5 seconds
- Added `aria-hidden="true"` to decorative icons

---

## High Priority Issue #8: Close Button Labels

### Current (No Label)

```vue
<button @click="showPanel = false" class="text-slate-400 hover:text-slate-600">
  <XMarkIcon class="w-6 h-6" />
</button>

<!-- OR -->

<button
  @click="$emit('close')"
  class="text-2xl text-slate-500 transition hover:text-slate-900"
>
  ×
</button>
```

### Fixed (With Label)

```vue
<!-- Option 1: Icon button with aria-label -->
<button
  @click="showPanel = false"
  aria-label="Close communication panel"
  class="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
>
  <XMarkIcon class="w-6 h-6" aria-hidden="true" />
</button>

<!-- Option 2: × symbol with aria-label -->
<button
  @click="$emit('close')"
  aria-label="Close"
  class="text-slate-500 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
>
  <span aria-hidden="true">×</span>
</button>

<!-- Option 3: Visible text + icon (best for clarity) -->
<button
  @click="$emit('close')"
  class="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-3 py-1"
>
  <span>Close</span>
  <XMarkIcon class="w-4 h-4" aria-hidden="true" />
</button>
```

**What Changed:**

- Added `aria-label` to button explaining its purpose
- Added `aria-hidden="true"` to icon (text label is sufficient)
- Added `focus:outline-none focus:ring-2 focus:ring-blue-500` for visible focus

---

## Testing: Before vs After

### Keyboard Navigation

**Before:**

- Tab → Focus goes behind modal (not trapped)
- Escape → Modal stays open
- Screen reader → "Button" (no context)

**After:**

- Tab → Focus cycles within modal only
- Escape → Modal closes
- Screen reader → "Close communication panel" or "Close"

### Screen Reader (NVDA)

**Before:**

```
H1: John Smith
P: Heading Coach, University of Example
P: No context for status color
Button [empty name] - appears in list
```

**After:**

```
H1: John Smith
P: Heading Coach, University of Example
Status: Days Since Contact: 5 Follow up soon
List with 3 items
  Listitem 1 of 3: Email interaction, 2 days ago
  Status: positive
```

### Color Blindness (Protanopia Simulator)

**Before:**

- Red "30+ days" and green "0 days" appear similar shades
- Cannot distinguish status without text

**After:**

- Number + text badge ("Urgent", "Just contacted", "Follow up soon")
- Color + text makes status clear regardless of color perception

---

## Implementation Checklist

Complete these in order:

### Critical (This Sprint)

- [ ] Add focus trap to Communication Panel Modal
- [ ] Add focus trap to EditCoachModal
- [ ] Fix DeleteConfirmationModal with .showModal()

### High Priority (Next Sprint)

- [ ] Add text badges to CoachStatsGrid status indicators
- [ ] Convert CoachRecentInteractions to `<ul>`/`<li>` with aria-labels
- [ ] Add aria-live feedback to CoachNotesEditor
- [ ] Add aria-haspopup and aria-labels to CommunicationPanel buttons
- [ ] Fix all close button labels (×)

### Testing After Each Change

- [ ] Keyboard Tab through component
- [ ] Test Escape key on modals
- [ ] Screen reader announces all labels
- [ ] Focus ring visible on all interactive elements
- [ ] No console errors

---

## Files to Modify

1. `/pages/coaches/[id].vue` - Modal focus trap
2. `/components/EditCoachModal.vue` - Focus trap + close button label
3. `/components/DeleteConfirmationModal.vue` - .showModal() implementation
4. `/components/CommunicationPanel.vue` - Button labels + aria-haspopup
5. `/components/Coach/CoachStatsGrid.vue` - Add text badges
6. `/components/Coach/CoachRecentInteractions.vue` - Semantic structure
7. `/components/Coach/CoachNotesEditor.vue` - Save feedback + aria-live
8. `/components/Coach/CoachHeader.vue` - Close button label + link focus
