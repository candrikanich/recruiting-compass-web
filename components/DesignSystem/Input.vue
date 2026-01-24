<script setup lang="ts">
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

const inputId = computed(
  () => props.id || `input-${Math.random().toString(36).slice(2, 9)}`,
);

const sizeClasses: Record<InputSize, string> = {
  sm: "px-2.5 py-1.5 text-sm",
  md: "px-3 py-2 text-base",
  lg: "px-4 py-3 text-lg",
};

const inputClasses = computed(() => {
  const base =
    "w-full rounded-lg border bg-white text-slate-900 transition-colors duration-200";
  const size = sizeClasses[props.size];
  const border = props.error
    ? "border-red-500 focus:border-red-500"
    : "border-slate-300 focus:border-blue-500";
  const focus = "focus:outline-none focus:ring-2 focus:ring-offset-0";
  const focusRing = props.error
    ? "focus:ring-red-500/20"
    : "focus:ring-blue-500/20";
  const disabled = props.disabled
    ? "opacity-50 cursor-not-allowed bg-slate-100"
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
      class="block text-sm font-medium text-slate-900 mb-1.5"
    >
      {{ label }}
      <span v-if="required" class="text-red-600">*</span>
    </label>

    <div class="relative">
      <div
        v-if="$slots.icon"
        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500"
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
        :class="[inputClasses, $slots.icon ? 'pl-10' : '']"
        @input="handleInput"
        @blur="emit('blur', $event)"
        @focus="emit('focus', $event)"
      />
    </div>

    <p v-if="error" class="mt-1.5 text-sm text-red-600">
      {{ error }}
    </p>
    <p v-else-if="hint" class="mt-1.5 text-sm text-slate-500">
      {{ hint }}
    </p>
  </div>
</template>
