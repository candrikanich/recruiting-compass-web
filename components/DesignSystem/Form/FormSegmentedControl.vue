<script setup lang="ts">
import { computed, useId } from "vue";

interface SegmentOption {
  value: string;
  label: string;
}

interface Props {
  modelValue: string;
  label: string;
  options: SegmentOption[];
  name?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  size?: "sm" | "md";
  /** Fill the container width with equal segments (default). Set false to
   *  size to content when placed inline beside other controls. */
  block?: boolean;
  /** Visually hide the legend while keeping it for screen readers. Use when
   *  the group sits inline and its purpose is clear from context. */
  hideLabel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  name: undefined,
  required: false,
  disabled: false,
  error: "",
  size: "md",
  block: true,
  hideLabel: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  blur: [];
}>();

const fieldId = useId();
const groupName = computed(() => props.name ?? `${fieldId}-group`);
const errorId = computed(() => (props.error ? `${fieldId}-error` : undefined));

const segmentPadding = computed(() =>
  props.size === "sm" ? "px-2 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
);

const select = (value: string) => {
  if (props.disabled) return;
  emit("update:modelValue", value);
};
</script>

<template>
  <fieldset
    :aria-describedby="errorId"
    :aria-invalid="!!error || undefined"
    class="min-w-0 border-0 p-0"
  >
    <legend
      :class="
        hideLabel ? 'sr-only' : 'mb-2 block text-sm font-medium text-slate-700'
      "
    >
      {{ label }}
      <span v-if="required" class="text-red-500" aria-hidden="true">*</span>
      <span v-if="required" class="sr-only">(required)</span>
    </legend>

    <div
      class="gap-1 rounded-xl border-2 bg-white p-1"
      :class="[
        block ? 'flex w-full' : 'inline-flex',
        error ? 'border-red-500' : 'border-slate-300',
      ]"
    >
      <label
        v-for="option in options"
        :key="option.value"
        class="cursor-pointer rounded-lg text-center font-medium whitespace-nowrap transition-colors select-none focus-within:ring-2 focus-within:ring-blue-500"
        :class="[
          block ? 'flex-1' : '',
          segmentPadding,
          modelValue === option.value
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-700 hover:bg-slate-50',
          disabled ? 'cursor-not-allowed opacity-50' : '',
        ]"
      >
        <input
          type="radio"
          class="sr-only"
          :name="groupName"
          :value="option.value"
          :checked="modelValue === option.value"
          :required="required"
          :disabled="disabled"
          @change="select(option.value)"
          @blur="emit('blur')"
        />
        {{ option.label }}
      </label>
    </div>

    <DesignSystemFieldError v-if="error" :id="errorId" :error="error" />
  </fieldset>
</template>
