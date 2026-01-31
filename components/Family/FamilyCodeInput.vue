<template>
  <div class="border border-gray-200 bg-gray-50 rounded-lg p-4">
    <h3 class="text-lg font-semibold text-gray-900 mb-2">
      Join a Family
    </h3>
    <p class="text-sm text-gray-700 mb-4">
      Enter the family code provided by the student to join their recruiting
      family.
    </p>

    <form @submit.prevent="handleSubmit">
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Family Code
        </label>
        <input
          v-model="codeInput"
          type="text"
          placeholder="FAM-XXXXXX"
          maxlength="10"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg uppercase"
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
        class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {{ loading ? "Joining..." : "Join Family" }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { validateFamilyCodeInput, formatFamilyCodeInput } from "~/utils/familyCodeValidation";

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
