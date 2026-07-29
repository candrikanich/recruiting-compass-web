<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";

interface Props {
  show: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  continue: [coachName: string];
}>();

const coachName = ref("");

const dialogRef = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(dialogRef);

watch(
  () => props.show,
  async (show) => {
    if (show) {
      await nextTick();
      activate();
    } else {
      deactivate();
    }
  },
);

const handleContinue = () => {
  if (coachName.value.trim()) {
    emit("continue", coachName.value.trim());
    handleClose();
  }
};

const handleClose = () => {
  coachName.value = "";
  deactivate();
  emit("close");
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="handleClose"
      @keydown.escape="handleClose"
    >
      <div
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="other-coach-title"
        class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
        @click.stop
      >
        <div
          class="bg-linear-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white"
        >
          <h2 id="other-coach-title" class="text-xl font-bold">Other Coach</h2>
          <p class="mt-1 text-sm text-white/90">
            Enter the name of the coach (not currently in system)
          </p>
        </div>

        <div class="p-6">
          <form @submit.prevent="handleContinue">
            <div>
              <label
                for="coachName"
                class="block text-sm font-medium text-slate-700"
              >
                Coach Name
              </label>
              <input
                id="coachName"
                v-model="coachName"
                type="text"
                placeholder="e.g., John Smith"
                class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div class="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                @click="handleClose"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!coachName.trim()"
                class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>
