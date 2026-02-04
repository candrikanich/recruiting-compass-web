<script setup lang="ts">
import { ref } from "vue";
import { validateZipCode } from "~/utils/zipCodeValidation";

const emit = defineEmits<{
  "next-screen": [data: { zipCode: string }];
}>();

const zipCode = ref("");
const error = ref<string | null>(null);

const handleSubmit = () => {
  error.value = null;

  if (!zipCode.value) {
    error.value = "Zip code is required";
    return;
  }

  if (!validateZipCode(zipCode.value)) {
    error.value = "Please enter a valid 5-digit zip code";
    return;
  }

  emit("next-screen", { zipCode: zipCode.value });
};

const handleZipCodeInput = (value: string) => {
  // Only allow digits
  zipCode.value = value.replace(/\D/g, "").slice(0, 5);
};
</script>

<template>
  <div class="flex flex-col min-h-screen bg-white px-4 py-8">
    <div class="max-w-2xl mx-auto w-full space-y-6">
      <!-- Header -->
      <div>
        <h2 class="text-2xl font-bold text-slate-900">
          Where are you located?
        </h2>
        <p class="text-slate-600 mt-2">
          We'll use this to calculate distance to schools
        </p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Zip Code -->
        <div>
          <label class="block text-sm font-medium text-slate-900 mb-2">
            Zip Code <span class="text-red-500">*</span>
          </label>
          <input
            :value="zipCode"
            @input="
              handleZipCodeInput(($event.target as HTMLInputElement).value)
            "
            type="text"
            placeholder="12345"
            pattern="\d{5}"
            maxlength="5"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p class="text-sm text-slate-500 mt-2">
            Used to calculate distance to schools
          </p>
        </div>

        <!-- Error -->
        <div
          v-if="error"
          class="p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <p class="text-red-700 text-sm">{{ error }}</p>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-6">
          <button
            type="button"
            class="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            class="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            @click="handleSubmit"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
