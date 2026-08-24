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
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :maxlength="resolvedMaxlength"
      :autocomplete="type === 'tel' ? 'tel' : undefined"
      :inputmode="type === 'tel' ? 'tel' : undefined"
      :aria-required="required || undefined"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `${inputId}-error` : undefined"
      class="rounded-xl border-2 bg-white px-4 py-3"
      :class="[
        error ? 'border-red-500' : 'border-slate-300',
        'focus:border-transparent focus:ring-2 focus:ring-blue-500',
        'transition-all placeholder:text-slate-600',
        'disabled:cursor-not-allowed disabled:opacity-50',
      ]"
      @input="onInput"
      @blur="$emit('blur')"
    />
    <DesignSystemFieldError
      v-if="error"
      :error="error"
      :id="`${inputId}-error`"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from "vue";
import { formatPhoneNational } from "~/utils/phone";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    autoFilled?: boolean;
    type?: "text" | "email" | "password" | "tel" | "url" | "search" | "number";
    maxlength?: number;
  }>(),
  {
    placeholder: "",
    required: false,
    disabled: false,
    autoFilled: false,
    type: "text",
    maxlength: undefined,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  blur: [];
}>();

const inputId = useId();
const resolvedMaxlength = computed(() => {
  if (props.maxlength !== undefined) return props.maxlength;
  return props.type === "tel" ? 14 : undefined;
});

const onInput = (event: Event) => {
  const raw = (event.target as HTMLInputElement).value;
  emit(
    "update:modelValue",
    props.type === "tel" ? formatPhoneNational(raw) : raw,
  );
};
</script>
