<template>
  <Transition name="slide-down">
    <div
      v-if="errors.length > 0"
      data-testid="error-message"
      class="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg"
    >
      <div class="flex items-start gap-3">
        <ExclamationTriangleIcon class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-red-800 mb-2">
            Please correct the following errors:
          </h3>
          <ul class="text-sm text-red-700 space-y-1">
            <li v-for="error in errors" :key="error.field" class="flex items-start gap-2">
              <span class="text-red-700 mt-1">•</span>
              <div>
                <strong>{{ formatFieldName(error.field) }}:</strong>
                {{ error.message }}
              </div>
            </li>
          </ul>
        </div>
        <button
          type="button"
          @click="$emit('dismiss')"
          class="text-red-600 hover:text-red-800 transition flex-shrink-0 mt-0.5"
          aria-label="Dismiss error summary"
        >
          <XMarkIcon class="w-5 h-5" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/vue/24/solid'
import type { FormFieldError } from '~/composables/useFormValidation'

defineProps<{
  errors: FormFieldError[]
}>()

defineEmits<{
  dismiss: []
}>()

/**
 * Formats field name for display
 * Example: 'school_id' -> 'School ID'
 * Example: 'address.street' -> 'Address → Street'
 */
const formatFieldName = (field: string): string => {
  return field
    .split('.')
    .map(part =>
      part
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join(' → ')
}
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 300ms ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
