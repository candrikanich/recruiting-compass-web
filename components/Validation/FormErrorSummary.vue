<template>
  <Transition name="slide-down">
    <div
      v-if="errors.length > 0"
      ref="containerRef"
      id="form-error-summary"
      data-testid="error-message"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      tabindex="-1"
      class="mb-6 rounded-r-lg border-l-4 border-red-500 bg-red-50 p-4 focus:outline-2 focus:outline-offset-2 focus:outline-red-600"
    >
      <div class="flex items-start gap-3">
        <UIcon
          name="i-heroicons-exclamation-triangle-solid"
          class="mt-0.5 h-5 w-5 shrink-0 text-red-600"
          aria-hidden="true"
        />
        <div class="flex-1">
          <h3 class="mb-2 text-sm font-semibold text-red-800">
            Please correct the following errors:
          </h3>
          <ul class="space-y-1 text-sm text-red-700">
            <li
              v-for="error in errors"
              :key="error.field"
              class="flex items-start gap-2"
            >
              <span class="mt-1 text-red-700">•</span>
              <div>
                <button
                  type="button"
                  @click="focusField(error.field)"
                  class="font-semibold text-red-700 hover:underline focus:outline-2 focus:outline-offset-2 focus:outline-red-600"
                >
                  {{ formatFieldName(error.field) }}
                </button>
                : {{ error.message }}
              </div>
            </li>
          </ul>
        </div>
        <button
          type="button"
          @click="$emit('dismiss')"
          class="mt-0.5 shrink-0 text-red-600 transition hover:text-red-800 focus:outline-2 focus:outline-offset-2 focus:outline-red-600"
          aria-label="Dismiss error summary"
        >
          <UIcon
            name="i-heroicons-x-mark-solid"
            class="h-5 w-5"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { FormFieldError } from "~/composables/useFormValidation";

const props = defineProps<{
  errors: FormFieldError[];
}>();

defineEmits<{
  dismiss: [];
}>();

const containerRef = ref<HTMLElement | null>(null);

// Focus error summary when errors appear
watch(
  () => props.errors.length > 0,
  (hasErrors) => {
    if (hasErrors && containerRef.value) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        containerRef.value?.focus();
      });
    }
  },
);

/**
 * Focus the field associated with an error
 */
const focusField = (fieldName: string) => {
  const fieldId = fieldName.replace(/\./g, "-");
  const element =
    document.getElementById(fieldId) ||
    document.querySelector(`[name="${fieldName}"]`);
  element?.focus();
};

/**
 * Formats field name for display
 * Example: 'school_id' -> 'School ID'
 * Example: 'address.street' -> 'Address → Street'
 */
const formatFieldName = (field: string): string => {
  return field
    .split(".")
    .map((part) =>
      part
        .replace(/_/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    )
    .join(" → ");
};
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
