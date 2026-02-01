<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-50">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
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
          <div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p class="text-sm text-red-800 font-medium">
              This action cannot be undone. All user data will be permanently
              deleted.
            </p>
          </div>

          <!-- User Preview List -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-600 uppercase mb-2">
              Users to delete:
            </p>
            <div
              class="border border-gray-200 rounded-lg bg-gray-50 max-h-40 overflow-y-auto"
            >
              <div
                v-for="(email, index) in displayedEmails"
                :key="email"
                class="px-3 py-2 border-b border-gray-100 last:border-b-0 text-sm text-gray-700"
              >
                {{ index + 1 }}. {{ email }}
              </div>
              <div
                v-if="emails.length > 5"
                class="px-3 py-2 text-xs text-gray-600 italic font-medium"
              >
                ... and {{ emails.length - 5 }} more
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              @click="emit('cancel')"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
              data-testid="cancel-bulk-delete"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="emit('confirm')"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition"
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
