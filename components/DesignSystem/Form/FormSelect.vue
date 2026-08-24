<script setup lang="ts">
import { computed, useId } from "vue";

interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  modelValue: string;
  label: string;
  options: SelectOption[];
  required?: boolean;
  disabled?: boolean;
  error?: string;
  autoFilled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false,
  error: "",
  autoFilled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  blur: [];
}>();

const inputId = useId();

const dropdownStyle = computed(() => ({
  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
  backgroundPosition: "right 0.75rem center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "1.5em 1.5em",
  paddingRight: "2.5rem",
}));

const handleInput = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit("update:modelValue", target.value);
};

const handleBlur = () => {
  emit("blur");
};
</script>

<template>
  <div>
    <label :for="inputId" class="mb-2 block text-sm font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="text-red-500" aria-hidden="true">*</span>
      <span v-if="required" class="sr-only">(required)</span>
      <span v-if="autoFilled" class="ml-1 text-xs font-normal text-blue-700"
        >(auto-filled)</span
      >
    </label>
    <select
      :id="inputId"
      :value="modelValue"
      :required="required"
      :aria-required="required || undefined"
      :disabled="disabled"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${inputId}-error` : undefined"
      :style="dropdownStyle"
      class="cursor-pointer appearance-none rounded-xl border-2 border-slate-300 bg-white px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      :class="{ 'border-red-500': error }"
      @input="handleInput"
      @blur="handleBlur"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <DesignSystemFieldError
      v-if="error"
      :id="`${inputId}-error`"
      :error="error"
    />
  </div>
</template>
