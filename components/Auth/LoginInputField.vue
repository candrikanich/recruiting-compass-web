<template>
  <div>
    <label :for="id" class="block text-sm font-medium text-slate-700 mb-2">
      {{ label }}
      <span v-if="required" aria-label="required" class="text-red-600 ml-1"
        >*</span
      >
    </label>
    <div class="relative">
      <component
        :is="icon"
        class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
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
        :aria-describedby="error ? `${id}-error` : undefined"
        class="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
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
  icon: any;
  required?: boolean;
}>();

defineEmits<{
  "update:modelValue": [value: string];
  blur: [];
}>();
</script>
