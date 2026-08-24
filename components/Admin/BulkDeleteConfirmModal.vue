<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="bg-opacity-50 fixed inset-0 z-40 flex items-center justify-center bg-black p-4"
      >
        <div class="z-50 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <!-- Header -->
          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg
                class="h-5 w-5 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4v2m0-4V7m0 6v2m0-6h2m0 0h2m0 0h-2m0 0h-2"
                />
              </svg>
              <h2 class="text-lg font-semibold text-gray-900">
                Delete {{ emails.length }} User{{
                  emails.length !== 1 ? "s" : ""
                }}?
              </h2>
            </div>
            <button
              @click="emit('cancel')"
              class="text-gray-400 hover:text-gray-600"
              data-testid="close-modal"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Warning Message -->
          <div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p class="text-sm font-medium text-red-800">
              This action cannot be undone. All user data will be permanently
              deleted.
            </p>
          </div>

          <!-- User Preview List -->
          <div class="mb-4">
            <p class="mb-2 text-xs font-semibold text-gray-600 uppercase">
              Users to delete:
            </p>
            <div
              class="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50"
            >
              <div
                v-for="(email, index) in displayedEmails"
                :key="email"
                class="border-b border-gray-100 px-3 py-2 text-sm text-gray-700 last:border-b-0"
              >
                {{ index + 1 }}. {{ email }}
              </div>
              <div
                v-if="emails.length > 5"
                class="px-3 py-2 text-xs font-medium text-gray-600 italic"
              >
                ... and {{ emails.length - 5 }} more
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              @click="emit('cancel')"
              class="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
              data-testid="cancel-bulk-delete"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="emit('confirm')"
              class="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
              data-testid="confirm-bulk-delete"
            >
              Delete {{ emails.length }} User{{
                emails.length !== 1 ? "s" : ""
              }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  isOpen: boolean;
  emails: string[];
}

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const props = withDefaults(defineProps<Props>(), {
  emails: () => [],
});

const displayedEmails = computed(() => props.emails.slice(0, 5));
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
