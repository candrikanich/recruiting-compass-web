<template>
  <div
    :class="[
      'flex items-center gap-3 p-3 rounded-lg border bg-white select-none',
      visible ? 'border-slate-200' : 'border-slate-200 opacity-50',
      disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
    ]"
  >
    <!-- Drag handle -->
    <UIcon name="i-heroicons-bars-3-solid"
      v-if="!disabled"
      class="w-4 h-4 text-slate-400 shrink-0 drag-handle"
      aria-hidden="true"
     />
    <div v-else class="w-4 h-4 shrink-0" />

    <!-- Label -->
    <span class="flex-1 text-sm font-medium text-slate-800 truncate">
      {{ WIDGET_LABELS[id] }}
    </span>

    <!-- Keyboard move buttons -->
    <button
      v-if="!disabled"
      type="button"
      :aria-label="`Move ${WIDGET_LABELS[id]} up`"
      class="shrink-0 p-1 text-slate-400 hover:text-slate-700 transition-colors rounded"
      @click.stop="$emit('move-up')"
    >
      <UIcon name="i-heroicons-chevron-up" class="w-3.5 h-3.5" aria-hidden="true"  />
    </button>
    <button
      v-if="!disabled"
      type="button"
      :aria-label="`Move ${WIDGET_LABELS[id]} down`"
      class="shrink-0 p-1 text-slate-400 hover:text-slate-700 transition-colors rounded"
      @click.stop="$emit('move-down')"
    >
      <UIcon name="i-heroicons-chevron-down" class="w-3.5 h-3.5" aria-hidden="true"  />
    </button>

    <!-- Size badge -->
    <span
      class="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0"
    >
      {{ WIDGET_SIZES[id] }}
    </span>

    <!-- Coming soon badge -->
    <span
      v-if="disabled"
      class="text-xs font-medium bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full shrink-0"
    >
      Coming soon
    </span>

    <!-- Visibility toggle -->
    <button
      v-else
      data-testid="toggle-visibility"
      type="button"
      :aria-label="visible ? 'Hide widget' : 'Show widget'"
      class="shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
      @click.stop="$emit('toggle')"
    >
      <UIcon name="i-heroicons-eye" v-if="visible" class="w-4 h-4"  />
      <UIcon name="i-heroicons-eye-slash" v-else class="w-4 h-4"  />
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
