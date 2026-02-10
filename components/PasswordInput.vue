<template>
  <div>
    <label :for="id" class="block text-sm font-medium text-slate-700 mb-2">
      {{ label }}
      <span v-if="required" aria-label="required" class="text-red-600 ml-1"
        >*</span
      >
    </label>
    <div class="relative">
      <LockClosedIcon
        class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
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
          'w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed',
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
        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
      >
        <component
          :is="showPassword ? EyeSlashIcon : EyeIcon"
          class="w-5 h-5"
          aria-hidden="true"
        />
      </button>
    </div>
    <FieldError :id="`${id}-error`" :error="error" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/vue/24/outline";
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
