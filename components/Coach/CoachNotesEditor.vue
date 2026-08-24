<template>
  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
    <!-- Screen reader announcements -->
    <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
      {{ announcement }}
    </div>

    <div class="mb-4 flex items-center justify-between">
      <div>
        <h3 class="mb-1 text-lg font-semibold text-slate-900">
          {{ title }}
        </h3>
        <p v-if="subtitle" class="text-sm text-slate-600">{{ subtitle }}</p>
      </div>
      <button
        @click="toggleEdit"
        :aria-label="isEditing ? 'Cancel editing notes' : 'Edit notes'"
        class="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <UIcon name="i-heroicons-pencil" class="h-4 w-4" aria-hidden="true" />
        {{ isEditing ? "Cancel" : "Edit" }}
      </button>
    </div>

    <!-- Display Mode -->
    <div v-if="!isEditing" class="whitespace-pre-wrap text-slate-700">
      {{ displayValue || emptyText }}
    </div>

    <!-- Edit Mode -->
    <div v-if="isEditing" class="space-y-4">
      <textarea
        v-model="editedValue"
        :rows="rows"
        :aria-busy="isSaving"
        class="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
        :placeholder="placeholder"
      />
      <div class="flex gap-3">
        <button
          @click="handleSave"
          :disabled="isSaving"
          :aria-busy="isSaving"
          class="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {{ isSaving ? "Saving..." : "Save Notes" }}
        </button>
        <button
          @click="cancelEdit"
          aria-label="Cancel editing"
          class="rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useNotesEditor } from "~/composables/useNotesEditor";

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    modelValue: string;
    placeholder?: string;
    emptyText?: string;
    rows?: number;
    saveFn: (value: string) => Promise<unknown>;
  }>(),
  {
    subtitle: "",
    placeholder: "Add notes...",
    emptyText: "No notes added yet.",
    rows: 6,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const announcement = ref("");

const displayValue = computed(() => props.modelValue);
const currentValue = computed(() => props.modelValue);

const { isEditing, editedValue, isSaving, toggleEdit, cancelEdit, save } =
  useNotesEditor(currentValue);

const handleSave = async () => {
  announcement.value = "Saving notes...";
  try {
    await save(async (value: string) => {
      emit("update:modelValue", value);
      await props.saveFn(value);
    });
    announcement.value = "Notes saved successfully";
  } catch (error) {
    announcement.value = "Failed to save notes";
    throw error;
  }
};
</script>
