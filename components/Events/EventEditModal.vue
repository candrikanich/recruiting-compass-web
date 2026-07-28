<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  >
    <div
      class="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-screen overflow-y-auto"
    >
      <div
        class="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between"
      >
        <h2 class="text-2xl font-bold text-gray-900">Edit Event</h2>
        <button
          @click="emit('cancel')"
          class="text-gray-600 hover:text-gray-900"
        >
          <UIcon name="i-heroicons-x-mark-solid" class="w-6 h-6" />
        </button>
      </div>

      <form @submit.prevent="emit('submit')" class="p-6 space-y-6">
        <!-- Event Name -->
        <div>
          <label
            for="editName"
            class="block text-sm font-medium text-gray-700 mb-1"
          >
            Event Name <span class="text-red-600">*</span>
          </label>
          <input
            id="editName"
            v-model="formData.name"
            type="text"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Event Type -->
        <div>
          <label
            for="editType"
            class="block text-sm font-medium text-gray-700 mb-1"
          >
            Event Type <span class="text-red-600">*</span>
          </label>
          <select
            id="editType"
            v-model="formData.type"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            class="block text-sm font-medium text-gray-700 mb-1"
          >
            Location
          </label>
          <input
            id="editLocation"
            v-model="formData.location"
            type="text"
            placeholder="e.g., University Stadium, City, State"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Dates -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              for="editStartDate"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Start Date <span class="text-red-600">*</span>
            </label>
            <input
              id="editStartDate"
              v-model="formData.start_date"
              type="date"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label
              for="editEndDate"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              End Date
            </label>
            <input
              id="editEndDate"
              v-model="formData.end_date"
              type="date"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <!-- Cost -->
        <div>
          <label
            for="editCost"
            class="block text-sm font-medium text-gray-700 mb-1"
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
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Performance Notes -->
        <div>
          <label
            for="editNotes"
            class="block text-sm font-medium text-gray-700 mb-1"
          >
            Performance Notes
          </label>
          <textarea
            id="editNotes"
            v-model="formData.performance_notes"
            rows="4"
            placeholder="How did it go? Any highlights?"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Buttons -->
        <div class="flex gap-4 justify-end">
          <button
            type="button"
            @click="emit('cancel')"
            class="px-6 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isUpdating"
            class="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {{ isUpdating ? "Saving..." : "Save Changes" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
interface EventEditFormData {
  name: string;
  type: string;
  location: string;
  start_date: string;
  end_date: string;
  cost: number;
  performance_notes: string;
}

defineProps<{
  isOpen: boolean;
  formData: EventEditFormData;
  isUpdating: boolean;
}>();

const emit = defineEmits<{
  submit: [];
  cancel: [];
}>();
</script>
