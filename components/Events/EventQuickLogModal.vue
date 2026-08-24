<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center"
      @keydown.escape="handleClose"
    >
      <div class="absolute inset-0 bg-black/50" @click="handleClose"></div>
      <div
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-log-title"
        class="relative mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <h3 id="quick-log-title" class="mb-2 text-xl font-bold text-slate-900">
          Log Interactions
        </h3>
        <p class="mb-6 text-sm text-slate-600">
          Did you have any coaching interactions at {{ eventName }}?
        </p>

        <form @submit.prevent="emit('submit')" class="space-y-4">
          <!-- Type -->
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">
              Interaction Type
            </label>
            <select
              v-model="data.type"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="in_person_visit">In-Person Meeting</option>
              <option value="phone_call">Phone Call</option>
              <option value="email">Email</option>
              <option value="game">Game Appearance</option>
            </select>
          </div>

          <!-- Direction -->
          <DesignSystemFormSegmentedControl
            v-model="data.direction"
            label="Who initiated?"
            :options="[
              { value: 'inbound', label: 'Coach contacted us' },
              { value: 'outbound', label: 'We contacted coach' },
            ]"
          />

          <!-- Notes -->
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">
              What was discussed? <span class="text-red-600">*</span>
            </label>
            <textarea
              v-model="data.content"
              rows="3"
              required
              placeholder="Brief notes about the interaction..."
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <!-- Sentiment -->
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">
              How did it go?
            </label>
            <select
              v-model="data.sentiment"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
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
              class="flex-1 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700"
            >
              Log Interaction
            </button>
            <button
              type="button"
              @click="handleClose"
              class="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
import { ref, watch, nextTick } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";

interface QuickLogData {
  type: string;
  direction: "inbound" | "outbound";
  content: string;
  sentiment: string;
}

const props = defineProps<{
  isOpen: boolean;
  eventName: string | undefined;
  data: QuickLogData;
}>();

const emit = defineEmits<{
  submit: [];
  close: [];
}>();

const dialogRef = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(dialogRef);

const handleClose = () => {
  deactivate();
  emit("close");
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
