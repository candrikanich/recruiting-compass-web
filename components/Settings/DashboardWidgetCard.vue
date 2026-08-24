<template>
  <div
    :class="[
      'flex items-center gap-3 rounded-lg border bg-white p-3 select-none',
      visible ? 'border-slate-200' : 'border-slate-200 opacity-50',
      disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
    ]"
  >
    <!-- Drag handle -->
    <UIcon
      name="i-heroicons-bars-3-solid"
      v-if="!disabled"
      class="drag-handle h-4 w-4 shrink-0 text-slate-400"
      aria-hidden="true"
    />
    <div v-else class="h-4 w-4 shrink-0" />

    <!-- Label -->
    <span class="flex-1 truncate text-sm font-medium text-slate-800">
      {{ WIDGET_LABELS[id] }}
    </span>

    <!-- Keyboard move buttons -->
    <button
      v-if="!disabled"
      type="button"
      :aria-label="`Move ${WIDGET_LABELS[id]} up`"
      class="shrink-0 rounded p-1 text-slate-400 transition-colors hover:text-slate-700"
      @click.stop="$emit('move-up')"
    >
      <UIcon
        name="i-heroicons-chevron-up"
        class="h-3.5 w-3.5"
        aria-hidden="true"
      />
    </button>
    <button
      v-if="!disabled"
      type="button"
      :aria-label="`Move ${WIDGET_LABELS[id]} down`"
      class="shrink-0 rounded p-1 text-slate-400 transition-colors hover:text-slate-700"
      @click.stop="$emit('move-down')"
    >
      <UIcon
        name="i-heroicons-chevron-down"
        class="h-3.5 w-3.5"
        aria-hidden="true"
      />
    </button>

    <!-- Size badge -->
    <span
      class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
    >
      {{ WIDGET_SIZES[id] }}
    </span>

    <!-- Coming soon badge -->
    <span
      v-if="disabled"
      class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-600"
    >
      Coming soon
    </span>

    <!-- Visibility toggle -->
    <button
      v-else
      data-testid="toggle-visibility"
      type="button"
      :aria-label="visible ? 'Hide widget' : 'Show widget'"
      class="shrink-0 text-slate-400 transition-colors hover:text-slate-700"
      @click.stop="$emit('toggle')"
    >
      <UIcon name="i-heroicons-eye" v-if="visible" class="h-4 w-4" />
      <UIcon name="i-heroicons-eye-slash" v-else class="h-4 w-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { WIDGET_SIZES, WIDGET_LABELS } from "~/types/models";
import type { WidgetId } from "~/types/models";

defineProps<{
  id: WidgetId;
  visible: boolean;
  disabled?: boolean;
}>();

defineEmits<{
  toggle: [];
  "move-up": [];
  "move-down": [];
}>();
</script>
