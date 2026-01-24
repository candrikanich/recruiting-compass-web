<template>
  <div>
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ label }}
      <span v-if="required" class="text-red-600 ml-1">*</span>
    </label>

    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      @input="handleInput"
      @blur="handleBlur"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :class="[
        'w-full px-3 py-2 border rounded-lg',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 transition',
        error
          ? 'border-red-500 focus:border-red-500'
          : 'border-gray-300 focus:border-blue-500',
        disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white',
      ]"
    />

    <DesignSystemFieldError :error="error" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string | number;
    label?: string;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    validateOnBlur?: boolean;
  }>(),
  {
    type: "text",
    disabled: false,
    required: false,
    validateOnBlur: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string | number];
  validate: [value: string | number];
}>();

const inputId = computed(() =>
  props.label
    ? props.label.toLowerCase().replace(/\s+/g, "-")
    : `input-${Math.random().toString(36).slice(2, 9)}`,
);

const handleInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value;
  emit(
    "update:modelValue",
    props.type === "number" ? parseFloat(value) || "" : value,
  );
};

const handleBlur = (e: Event) => {
  if (props.validateOnBlur) {
    const value = (e.target as HTMLInputElement).value;
    emit("validate", props.type === "number" ? parseFloat(value) || "" : value);
  }
};
</script>
