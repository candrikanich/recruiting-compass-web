<template>
  <div>
    <label :for="id" class="mb-2 block text-sm font-medium text-slate-700">
      {{ label }}
      <span v-if="required" aria-label="required" class="ml-1 text-red-600"
        >*</span
      >
    </label>
    <div class="relative">
      <UIcon
        name="i-heroicons-lock-closed"
        class="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        :id="id"
        :value="modelValue"
        :type="showPassword ? 'text' : 'password'"
        :required="required"
        :aria-required="required"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-describedby="
          ariaDescribedby || (error ? `${id}-error` : undefined)
        "
        :aria-invalid="error ? 'true' : 'false'"
        :class="[
          'w-full rounded-lg border py-3 pr-12 pl-10 transition-all focus:border-transparent focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
          error
            ? 'border-red-600 focus:ring-red-500 focus:outline-red-600'
            : 'border-slate-300 focus:ring-blue-500 focus:outline-blue-600',
        ]"
        @input="
          $emit('update:modelValue', ($event.target as HTMLInputElement).value)
        "
        @blur="$emit('blur')"
      />
      <button
        v-if="showToggle"
        type="button"
        @click="showPassword = !showPassword"
        :aria-label="showPassword ? 'Hide password' : 'Show password'"
        class="absolute top-1/2 right-3 -translate-y-1/2 rounded-sm text-slate-400 hover:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <UIcon
          :name="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
          class="h-5 w-5"
          aria-hidden="true"
        />
      </button>
    </div>
    <FieldError :id="`${id}-error`" :error="error" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import FieldError from "~/components/DesignSystem/FieldError.vue";

withDefaults(
  defineProps<{
    id: string;
    label: string;
    placeholder?: string;
    autocomplete?: string;
    modelValue: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    showToggle?: boolean;
    ariaDescribedby?: string;
  }>(),
  {
    placeholder: "",
    autocomplete: "new-password",
    required: true,
    showToggle: true,
    disabled: false,
  },
);

defineEmits<{
  "update:modelValue": [value: string];
  blur: [];
}>();

const showPassword = ref(false);
</script>
