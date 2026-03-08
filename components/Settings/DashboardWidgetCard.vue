<template>
  <div
    :class="[
      'flex items-center gap-3 p-3 rounded-lg border bg-white select-none',
      visible ? 'border-slate-200' : 'border-slate-200 opacity-50',
      disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
    ]"
  >
    <!-- Drag handle -->
    <Bars3Icon
      v-if="!disabled"
      class="w-4 h-4 text-slate-400 shrink-0 drag-handle"
      aria-hidden="true"
    />
    <div v-else class="w-4 h-4 shrink-0" />

    <!-- Label -->
    <span class="flex-1 text-sm font-medium text-slate-800 truncate">
      {{ WIDGET_LABELS[id] }}
    </span>

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
      <EyeIcon v-if="visible" class="w-4 h-4" />
      <EyeSlashIcon v-else class="w-4 h-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { EyeIcon, EyeSlashIcon } from "@heroicons/vue/24/outline";
import { Bars3Icon } from "@heroicons/vue/24/solid";
import { WIDGET_SIZES, WIDGET_LABELS } from "~/types/models";
import type { WidgetId } from "~/types/models";

defineProps<{
  id: WidgetId;
  visible: boolean;
  disabled?: boolean;
}>();

defineEmits<{
  toggle: [];
}>();
</script>
