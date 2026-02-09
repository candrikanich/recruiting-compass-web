<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <!-- Screen reader announcements -->
    <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
      {{ announcement }}
    </div>

    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-semibold text-slate-900 mb-1">
          {{ title }}
        </h3>
        <p v-if="subtitle" class="text-slate-600 text-sm">{{ subtitle }}</p>
      </div>
      <button
        @click="toggleEdit"
        :aria-label="isEditing ? 'Cancel editing notes' : 'Edit notes'"
        class="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <PencilIcon class="w-4 h-4" aria-hidden="true" />
        {{ isEditing ? "Cancel" : "Edit" }}
      </button>
    </div>

    <!-- Display Mode -->
    <div v-if="!isEditing" class="text-slate-700 whitespace-pre-wrap">
      {{ displayValue || emptyText }}
    </div>

    <!-- Edit Mode -->
    <div v-if="isEditing" class="space-y-4">
      <textarea
        v-model="editedValue"
        :rows="rows"
        :aria-busy="isSaving"
        class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        :placeholder="placeholder"
      />
      <div class="flex gap-3">
        <button
          @click="handleSave"
          :disabled="isSaving"
          :aria-busy="isSaving"
          class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {{ isSaving ? "Saving..." : "Save Notes" }}
        </button>
        <button
          @click="cancelEdit"
          aria-label="Cancel editing"
          class="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { PencilIcon } from "@heroicons/vue/24/outline";
import { useNotesEditor } from "~/composables/useNotesEditor";

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    modelValue: string;
    placeholder?: string;
    emptyText?: string;
    rows?: number;
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
  save: [value: string];
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
      emit("save", value);
    });
    announcement.value = "Notes saved successfully";
  } catch (error) {
    announcement.value = "Failed to save notes";
    throw error;
  }
};
</script>
