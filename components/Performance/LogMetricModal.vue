<script setup lang="ts">
interface Props {
  show: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  'metric-created': [metric: any];
}>();

const handleClose = () => {
  emit('close');
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="handleClose"
    >
      <div
        class="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        @click.stop
      >
        <!-- Header -->
        <div class="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white">
          <h2 class="text-xl font-bold">Log Performance Metric</h2>
          <p class="mt-1 text-sm text-white/90">Record your athletic performance</p>
        </div>

        <!-- Content -->
        <div class="p-6">
          <form @submit.prevent>
            <!-- Form fields will be added in next task -->

            <!-- Action Buttons -->
            <div class="flex gap-4">
              <button
                type="submit"
                class="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Log Metric
              </button>
              <button
                type="button"
                @click="handleClose"
                class="flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>
