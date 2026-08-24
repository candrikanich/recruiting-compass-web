<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @keydown.escape="handleClose"
  >
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-event-title"
      class="max-h-screen w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-lg"
    >
      <div
        class="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-6"
      >
        <h2 id="edit-event-title" class="text-2xl font-bold text-gray-900">
          Edit Event
        </h2>
        <button
          @click="handleClose"
          aria-label="Close edit event dialog"
          class="text-gray-600 hover:text-gray-900"
        >
          <UIcon name="i-heroicons-x-mark-solid" class="h-6 w-6" />
        </button>
      </div>

      <form @submit.prevent="emit('submit')" class="space-y-6 p-6">
        <!-- Event Name -->
        <div>
          <label
            for="editName"
            class="mb-1 block text-sm font-medium text-gray-700"
          >
            Event Name <span class="text-red-600">*</span>
          </label>
          <input
            id="editName"
            v-model="formData.name"
            type="text"
            required
            class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Event Type -->
        <div>
          <label
            for="editType"
            class="mb-1 block text-sm font-medium text-gray-700"
          >
            Event Type <span class="text-red-600">*</span>
          </label>
          <select
            id="editType"
            v-model="formData.type"
            required
            class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Type</option>
            <option value="camp">Camp</option>
            <option value="showcase">Showcase</option>
            <option value="game">Game</option>
            <option value="official_visit">Official Visit</option>
            <option value="unofficial_visit">Unofficial Visit</option>
          </select>
        </div>

        <!-- Location -->
        <div>
          <label
            for="editLocation"
            class="mb-1 block text-sm font-medium text-gray-700"
          >
            Location
          </label>
          <input
            id="editLocation"
            v-model="formData.location"
            type="text"
            placeholder="e.g., University Stadium, City, State"
            class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Dates -->
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label
              for="editStartDate"
              class="mb-1 block text-sm font-medium text-gray-700"
            >
              Start Date <span class="text-red-600">*</span>
            </label>
            <input
              id="editStartDate"
              v-model="formData.start_date"
              type="date"
              required
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              for="editEndDate"
              class="mb-1 block text-sm font-medium text-gray-700"
            >
              End Date
            </label>
            <input
              id="editEndDate"
              v-model="formData.end_date"
              type="date"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <!-- Cost -->
        <div>
          <label
            for="editCost"
            class="mb-1 block text-sm font-medium text-gray-700"
          >
            Cost ($)
          </label>
          <input
            id="editCost"
            v-model.number="formData.cost"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Performance Notes -->
        <div>
          <label
            for="editNotes"
            class="mb-1 block text-sm font-medium text-gray-700"
          >
            Performance Notes
          </label>
          <textarea
            id="editNotes"
            v-model="formData.performance_notes"
            rows="4"
            placeholder="How did it go? Any highlights?"
            class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Buttons -->
        <div class="flex justify-end gap-4">
          <button
            type="button"
            @click="handleClose"
            class="rounded-lg bg-gray-200 px-6 py-2 font-semibold text-gray-900 transition hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isUpdating"
            class="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {{ isUpdating ? "Saving..." : "Save Changes" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";

interface EventEditFormData {
  name: string;
  type: string;
  location: string;
  start_date: string;
  end_date: string;
  cost: number;
  performance_notes: string;
}

const props = defineProps<{
  isOpen: boolean;
  formData: EventEditFormData;
  isUpdating: boolean;
}>();

const emit = defineEmits<{
  submit: [];
  cancel: [];
}>();

const dialogRef = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(dialogRef);

const handleClose = () => {
  deactivate();
  emit("cancel");
};

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      await nextTick();
      activate();
    } else {
      deactivate();
    }
  },
);
</script>
