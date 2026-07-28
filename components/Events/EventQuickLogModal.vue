<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div class="absolute inset-0 bg-black/50" @click="emit('close')"></div>
      <div
        class="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6"
      >
        <h3 class="text-xl font-bold text-slate-900 mb-2">Log Interactions</h3>
        <p class="text-sm text-slate-600 mb-6">
          Did you have any coaching interactions at {{ eventName }}?
        </p>

        <form @submit.prevent="emit('submit')" class="space-y-4">
          <!-- Type -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Interaction Type
            </label>
            <select
              v-model="data.type"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="in_person_visit">In-Person Meeting</option>
              <option value="phone_call">Phone Call</option>
              <option value="email">Email</option>
              <option value="game">Game Appearance</option>
            </select>
          </div>

          <!-- Direction -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Who initiated?
            </label>
            <select
              v-model="data.direction"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="inbound">Coach contacted us</option>
              <option value="outbound">We contacted coach</option>
            </select>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              What was discussed? <span class="text-red-600">*</span>
            </label>
            <textarea
              v-model="data.content"
              rows="3"
              required
              placeholder="Brief notes about the interaction..."
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <!-- Sentiment -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              How did it go?
            </label>
            <select
              v-model="data.sentiment"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="very_positive">Very Positive</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              class="flex-1 px-4 py-2 bg-linear-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition"
            >
              Log Interaction
            </button>
            <button
              type="button"
              @click="emit('close')"
              class="flex-1 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
            >
              Skip for Now
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface QuickLogData {
  type: string;
  direction: "inbound" | "outbound";
  content: string;
  sentiment: string;
}

defineProps<{
  isOpen: boolean;
  eventName: string | undefined;
  data: QuickLogData;
}>();

const emit = defineEmits<{
  submit: [];
  close: [];
}>();
</script>
