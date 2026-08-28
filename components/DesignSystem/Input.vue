<script setup lang="ts">
import { computed, useId } from "vue";

export type InputSize = "sm" | "md" | "lg";

interface Props {
  modelValue?: string | number;
  label?: string;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
  size?: InputSize;
  disabled?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
  id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  type: "text",
  size: "md",
  disabled: false,
  required: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string | number];
  blur: [event: FocusEvent];
  focus: [event: FocusEvent];
}>();

const generatedId = useId();
const inputId = computed(() => props.id || generatedId);

const errorId = computed(() => `${inputId.value}-error`);
const hintId = computed(() => `${inputId.value}-hint`);
const ariaDescribedBy = computed(() => {
  if (props.error) return errorId.value;
  if (props.hint) return hintId.value;
  return undefined;
});

const sizeClasses: Record<InputSize, string> = {
  sm: "px-2.5 py-1.5 text-sm",
  md: "px-3 py-2 text-base",
  lg: "px-4 py-3 text-lg",
};

const inputClasses = computed(() => {
  const base =
    "w-full rounded-lg border bg-white text-brand-slate-900 transition-colors duration-200";
  const size = sizeClasses[props.size];
  const border = props.error
    ? "border-brand-red-500 focus:border-brand-red-500"
    : "border-brand-slate-300 focus:border-brand-blue-500";
  const focus = "focus:ring-2 focus:ring-offset-0";
  const focusRing = props.error
    ? "focus:ring-brand-red-500/20"
    : "focus:ring-brand-blue-500/20";
  const disabled = props.disabled
    ? "opacity-50 cursor-not-allowed bg-brand-slate-100"
    : "";

  return [base, size, border, focus, focusRing, disabled]
    .filter(Boolean)
    .join(" ");
});

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const value = props.type === "number" ? Number(target.value) : target.value;
  emit("update:modelValue", value);
}
</script>

<template>
  <div class="w-full">
    <label
      v-if="label"
      :for="inputId"
      class="mb-1.5 block text-sm font-medium text-brand-slate-900"
    >
      {{ label }}
      <span v-if="required" class="text-brand-red-600" aria-hidden="true"
        >*</span
      >
      <span v-if="required" class="sr-only">(required)</span>
    </label>

    <div class="relative">
      <div
        v-if="$slots.icon"
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-brand-slate-500"
      >
        <slot name="icon" />
      </div>

      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-invalid="error ? 'true' : undefined"
        :aria-required="required || undefined"
        :aria-describedby="ariaDescribedBy"
        :class="[inputClasses, $slots.icon ? 'pl-10' : '']"
        @input="handleInput"
        @blur="emit('blur', $event)"
        @focus="emit('focus', $event)"
      />
    </div>

    <p
      v-if="error"
      :id="errorId"
      class="mt-1.5 text-sm text-brand-red-600"
      role="alert"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      :id="hintId"
      class="mt-1.5 text-sm text-brand-slate-500"
    >
      {{ hint }}
    </p>
  </div>
</template>
