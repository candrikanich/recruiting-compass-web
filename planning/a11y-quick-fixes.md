# Quick Fix Guide: School Detail Page Accessibility

This guide provides copy-paste ready code fixes for the most critical accessibility issues.

---

## Fix 1: Icon-Only Buttons (SchoolDocumentsCard.vue)

**Current:**

```vue
<button
  @click="showUploadModal = true"
  class="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
>
  + Upload
</button>
```

**Fixed:**

```vue
<button
  @click="showUploadModal = true"
  aria-label="Upload document"
  class="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
>
  Upload
</button>
```

---

## Fix 2: Textarea Labels (SchoolNotesCard.vue)

**Current:**

```vue
<textarea
  v-model="localNotes"
  rows="4"
  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="Add notes about this school..."
/>
```

**Fixed:**

```vue
<div class="space-y-2">
  <label for="notes-textarea" class="block text-sm font-medium text-slate-700">
    Notes
  </label>
  <textarea
    id="notes-textarea"
    v-model="localNotes"
    rows="4"
    class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="Add notes about this school..."
  />
</div>
```

Apply the same pattern to the private notes textarea.

---

## Fix 3: Edit Button Context (SchoolNotesCard.vue)

**Current:**

```vue
<button
  @click="isEditingNotes = !isEditingNotes"
  class="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition flex items-center gap-1"
>
  <PencilIcon class="w-4 h-4" />
  {{ isEditingNotes ? "Cancel" : "Edit" }}
</button>
```

**Fixed:**

```vue
<button
  @click="isEditingNotes = !isEditingNotes"
  :aria-label="isEditingNotes ? 'Cancel editing notes' : 'Edit notes'"
  class="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition flex items-center gap-1"
>
  <PencilIcon class="w-4 h-4" aria-hidden="true" />
  {{ isEditingNotes ? "Cancel" : "Edit" }}
</button>
```

---

## Fix 4: Document View Links (SchoolDocumentsCard.vue)

**Current:**

```vue
<NuxtLink
  :to="`/documents/${doc.id}`"
  class="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
>
  View
</NuxtLink>
```

**Fixed:**

```vue
<NuxtLink
  :to="`/documents/${doc.id}`"
  class="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
>
  View
</NuxtLink>
```

---

## Fix 5: Status Dropdown Focus (SchoolDetailHeader.vue)

**Current:**

```vue
<label for="school-status" class="sr-only">School status</label>
<select
  id="school-status"
  :model-value="school.status"
  @change="handleStatusChange"
  :disabled="statusUpdating"
  class="px-2 py-1 text-xs font-medium rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500"
  :class="[
    getStatusBadgeColor(school.status),
    statusUpdating ? 'opacity-50' : '',
  ]"
>
```

**Fixed:**

```vue
<div class="relative">
  <label for="school-status" class="sr-only">School status</label>
  <select
    id="school-status"
    :model-value="school.status"
    @change="handleStatusChange"
    :disabled="statusUpdating"
    :aria-busy="statusUpdating"
    class="px-2 py-1 text-xs font-medium rounded-full border-2 border-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
    :class="[
      getStatusBadgeColor(school.status),
      statusUpdating ? 'opacity-50 cursor-not-allowed' : '',
    ]"
  >
    <option value="researching">Researching</option>
    <option value="contacted">Contacted</option>
    <option value="interested">Interested</option>
    <option value="offer_received">Offer Received</option>
    <option value="committed">Committed</option>
  </select>
  <span v-if="statusUpdating" class="sr-only">
    Status is updating, please wait
  </span>
</div>
```

---

## Fix 6: Loading State (SchoolStatusHistory.vue)

**Current:**

```vue
<button v-if="loading" disabled class="text-sm text-slate-400">
  <div
    class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"
  ></div>
</button>
```

**Fixed:**

```vue
<div v-if="loading" class="flex items-center gap-2" role="status" aria-live="polite">
  <div
    class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"
    aria-hidden="true"
  ></div>
  <span class="text-sm text-slate-400">Loading status history...</span>
</div>
```

---

## Fix 7: Coach Contact Links (SchoolSidebar.vue)

**Current:**

```vue
<a
  v-if="coach.email"
  :href="`mailto:${coach.email}`"
  class="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
  title="Email"
>
  <EnvelopeIcon class="w-3.5 h-3.5" />
</a>
```

**Fixed:**

```vue
<a
  v-if="coach.email"
  :href="`mailto:${coach.email}`"
  :aria-label="`Send email to ${coach.first_name} ${coach.last_name}`"
  class="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
>
  <EnvelopeIcon class="w-3.5 h-3.5" aria-hidden="true" />
</a>
```

Apply same pattern to SMS and phone links (using green-600 and purple-600 respectively).

---

## Fix 8: Manage Coaches Link (SchoolSidebar.vue)

**Current:**

```vue
<NuxtLink
  :to="`/schools/${schoolId}/coaches`"
  class="text-sm text-blue-600 hover:text-blue-700 font-medium"
>
  Manage &rarr;
</NuxtLink>
```

**Fixed:**

```vue
<NuxtLink
  :to="`/schools/${schoolId}/coaches`"
  class="text-sm text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
>
  Manage Coaches <span aria-hidden="true">&rarr;</span>
</NuxtLink>
```

---

## Fix 9: Delete Confirmation Dialog

Verify your DesignSystemConfirmDialog component includes:

```vue
<div
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
>
  <div class="bg-white rounded-lg shadow-lg p-6 max-w-sm">
    <h2 id="dialog-title" class="text-lg font-semibold text-slate-900">
      {{ title }}
    </h2>
    <p id="dialog-description" class="mt-2 text-slate-600">
      {{ message }}
    </p>
    <div class="mt-6 flex gap-3 justify-end">
      <button
        @click="$emit('cancel')"
        class="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
      >
        {{ cancelText }}
      </button>
      <button
        @click="$emit('confirm')"
        :class="variantClasses"
        class="px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
      >
        {{ confirmText }}
      </button>
    </div>
  </div>
</div>
```

---

## Fix 10: Disabled Button State (SchoolNotesCard.vue)

**Current:**

```vue
<button
  @click="handleSaveNotes"
  :disabled="isSaving"
  class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
>
  {{ isSaving ? "Saving..." : "Save Notes" }}
</button>
```

**Fixed:**

```vue
<button
  @click="handleSaveNotes"
  :disabled="isSaving"
  class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400"
>
  {{ isSaving ? "Saving..." : "Save Notes" }}
</button>
```

---

## Implementation Checklist

After applying these fixes, verify:

- [ ] Screen reader announces all button purposes correctly
- [ ] All form inputs have associated labels
- [ ] Focus indicators are visible on all interactive elements
- [ ] Tab order follows logical flow
- [ ] Escape key closes modals
- [ ] Loading states have text descriptions
- [ ] Color contrast ratios are 4.5:1 or higher
- [ ] Disabled states are visually distinct

---

## Testing Commands

```bash
# Run accessibility tests (requires axe-core integration)
npm run test:a11y

# Manual keyboard navigation
# 1. Unplug mouse
# 2. Tab through page
# 3. Verify focus visible at all times
# 4. Test Escape key on modals

# Screen reader testing
# Windows: NVDA (free) - H key = heading navigation
# macOS: VoiceOver (built-in) - VO + U = rotor
# ChromeOS: ChromeVox (built-in) - Alt + + key

# Contrast checking
# Use WebAIM Color Contrast Checker or Stark plugin
```

---

## Resources

- **WCAG 2.1 AA Quick Ref:** https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Practices:** https://www.w3.org/WAI/ARIA/apg/
- **Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **Axe DevTools:** https://www.deque.com/axe/devtools/
