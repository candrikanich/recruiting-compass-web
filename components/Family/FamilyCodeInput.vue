<template>
  <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
    <h3 class="mb-2 text-lg font-semibold text-gray-900">Join a Family</h3>
    <p class="mb-4 text-sm text-gray-700">
      Enter the family code provided by the student to join their recruiting
      family.
    </p>

    <form @submit.prevent="handleSubmit">
      <div class="mb-4">
        <label
          for="family-code-input"
          class="mb-2 block text-sm font-medium text-gray-700"
        >
          Family Code
        </label>
        <input
          id="family-code-input"
          v-model="codeInput"
          type="text"
          placeholder="FAM-XXXXXX"
          maxlength="10"
          class="w-full rounded-lg border border-gray-300 px-4 py-2 font-mono text-lg uppercase focus:ring-2 focus:ring-blue-500"
          @input="handleInput"
        />
        <p v-if="validationError" class="mt-1 text-sm text-red-600">
          {{ validationError }}
        </p>
        <p class="mt-1 text-xs text-gray-500">
          Format: FAM-XXXXXX (6 characters after FAM-)
        </p>
      </div>

      <button
        type="submit"
        :disabled="!isValid || loading"
        class="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {{ loading ? "Joining..." : "Join Family" }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  validateFamilyCodeInput,
  formatFamilyCodeInput,
} from "~/utils/familyCodeValidation";

defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  submit: [code: string];
}>();

const codeInput = ref("");
const validationError = ref<string | null>(null);

const isValid = computed(() => {
  if (!codeInput.value) return false;
  const result = validateFamilyCodeInput(codeInput.value);
  return result.isValid;
});

const handleInput = () => {
  codeInput.value = formatFamilyCodeInput(codeInput.value);
  validationError.value = null;
};

const handleSubmit = () => {
  const result = validateFamilyCodeInput(codeInput.value);

  if (!result.isValid) {
    validationError.value = result.error || "Invalid code";
    return;
  }

  emit("submit", codeInput.value.trim().toUpperCase());
};
</script>
