<script setup lang="ts">
import { computed } from "vue";

export type AnimatedCheckSize = "sm" | "md";

interface Props {
  /** Two-way bound checked state. Undefined is treated as unchecked. */
  modelValue?: boolean;
  disabled?: boolean;
  size?: AnimatedCheckSize;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  size: "md",
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

// Native input stays the source of truth: any @change / data-testid / aria-*
// the caller passes is forwarded straight onto it.
defineOptions({ inheritAttrs: false });

const sizeClass = computed(() => (props.size === "sm" ? "h-5 w-5" : "h-6 w-6"));

function onChange(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).checked);
}
</script>

<template>
  <label
    class="group relative inline-flex items-center gap-2"
    :class="disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'"
  >
    <!-- Real checkbox: keyboard, focus, screen-reader announce, form semantics.
         Invisible but full-size for hit-testing (sr-only clips to 0×0 which
         breaks WebKit mouse-event routing). -->
    <input
      type="checkbox"
      class="peer absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      :checked="modelValue"
      :disabled="disabled"
      v-bind="$attrs"
      @change="onChange"
    />

    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      class="shrink-0 rounded peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600 motion-reduce:[&_*]:!transition-none [&_.box]:transition-[stroke] [&_.box]:duration-200 peer-checked:[&_.box]:stroke-emerald-600 [&_.fill]:origin-center [&_.fill]:scale-0 [&_.fill]:transition-transform [&_.fill]:duration-300 [&_.fill]:[transition-timing-function:cubic-bezier(.34,1.56,.64,1)] peer-checked:[&_.fill]:scale-100 [&_.tick]:transition-[stroke-dashoffset] [&_.tick]:delay-100 [&_.tick]:duration-300 [&_.tick]:[stroke-dasharray:22] [&_.tick]:[stroke-dashoffset:22] peer-checked:[&_.tick]:[stroke-dashoffset:0]"
      :class="sizeClass"
    >
      <rect
        class="box stroke-slate-300"
        x="1.5"
        y="1.5"
        width="21"
        height="21"
        rx="6"
        fill="none"
        stroke-width="2"
      />
      <rect
        class="fill fill-emerald-500"
        x="1.5"
        y="1.5"
        width="21"
        height="21"
        rx="6"
      />
      <path
        class="tick stroke-white"
        d="M6.5 12.5 L10.5 16 L17.5 8"
        fill="none"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>

    <span
      v-if="$slots.default"
      class="text-sm font-medium text-slate-700 transition-colors group-hover:text-slate-900"
    >
      <slot />
    </span>
  </label>
</template>
