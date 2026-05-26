<template>
  <div class="space-y-6">
    <!-- Notes Card -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-slate-900">Notes</h2>
        <div class="flex items-center gap-2">
          <NotesHistory :school-id="schoolId" />
          <button
            @click="toggleEdit"
            :aria-label="isEditing ? 'Cancel editing notes' : 'Edit notes'"
            class="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition flex items-center gap-1"
          >
            <UIcon name="i-heroicons-pencil" class="w-4 h-4" aria-hidden="true"  />
            {{ isEditing ? "Cancel" : "Edit" }}
          </button>
        </div>
      </div>
      <div v-if="isEditing" class="space-y-3">
        <label
          for="notes-textarea"
          class="block text-sm font-medium text-slate-700"
        >
          Notes
        </label>
        <textarea
          id="notes-textarea"
          v-model="editedValue"
          rows="4"
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          placeholder="Add notes about this school..."
        />
        <button
          @click="handleSave"
          :disabled="isSaving"
          :aria-busy="isSaving"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {{ isSaving ? "Saving..." : "Save Notes" }}
        </button>
      </div>
      <p v-else class="text-slate-700 text-sm whitespace-pre-wrap">
        {{ notes || "No notes added yet." }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import NotesHistory from "~/components/School/NotesHistory.vue";
import { useNotesEditor } from "~/composables/useNotesEditor";

const props = defineProps<{
  notes: string | null;
  schoolId: string;
  saveFn: (value: string) => Promise<unknown>;
}>();

const currentValue = computed(() => props.notes ?? "");

const { isEditing, editedValue, isSaving, toggleEdit, save } =
  useNotesEditor(currentValue);

const handleSave = async () => {
  await save(props.saveFn);
};
</script>
