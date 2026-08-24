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
        :name="icon"
        class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        :id="id"
        :value="modelValue"
        :type="type"
        required
        aria-required="true"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-describedby="
          [error ? `${id}-error` : null, describedBy]
            .filter(Boolean)
            .join(' ') || undefined
        "
        class="w-full rounded-lg border border-slate-300 py-3 pr-4 pl-10 transition-all focus:border-transparent focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        @input="
          $emit('update:modelValue', ($event.target as HTMLInputElement).value)
        "
        @blur="$emit('blur')"
      />
    </div>
    <FieldError :id="`${id}-error`" :error="error" />
  </div>
</template>

<script setup lang="ts">
import FieldError from "~/components/DesignSystem/FieldError.vue";

defineProps<{
  id: string;
  label: string;
  type: string;
  placeholder: string;
  autocomplete: string;
  modelValue: string;
  error?: string;
  disabled: boolean;
  icon: string;
  required?: boolean;
  describedBy?: string;
}>();

defineEmits<{
  "update:modelValue": [value: string];
  blur: [];
}>();
</script>
