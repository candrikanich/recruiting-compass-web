<!-- components/profile/setup/SectionConfigEditor.vue -->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import Sortable from "sortablejs";
import type { ProfileSection } from "~/types/models";
import { SECTION_META } from "~/utils/profile/sectionMeta";

const props = withDefaults(
  defineProps<{
    modelValue: ProfileSection[];
    showMetrics?: boolean;
  }>(),
  { showMetrics: true },
);

const emit = defineEmits<{
  "update:modelValue": [sections: ProfileSection[]];
}>();

const listRef = ref<HTMLElement | null>(null);
let sortable: Sortable | null = null;

// Unknown keys (defensive — normalizeSectionConfig already filters these
// out before they reach here) are preserved in the emitted array but never
// rendered or reordered.
const knownSections = computed(() =>
  props.modelValue.filter((section) => section.key in SECTION_META),
);
const unknownSections = computed(() =>
  props.modelValue.filter((section) => !(section.key in SECTION_META)),
);

function toggleVisibility(key: ProfileSection["key"]) {
  const next = props.modelValue.map((section) =>
    section.key === key ? { ...section, visible: !section.visible } : section,
  );
  emit("update:modelValue", next);
}

function isDisabled(key: ProfileSection["key"]) {
  // Phase 1's show_metrics remains the authoritative owner control for the
  // metrics row until it grows a dedicated toggle here.
  return key === "metrics" && !props.showMetrics;
}

onMounted(() => {
  if (!listRef.value) return;
  sortable = Sortable.create(listRef.value, {
    handle: ".section-drag-handle",
    animation: 150,
    onEnd: (evt) => {
      const { oldIndex, newIndex } = evt;
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;
      const reordered = [...knownSections.value];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      emit("update:modelValue", [...reordered, ...unknownSections.value]);
    },
  });
});

onBeforeUnmount(() => {
  sortable?.destroy();
  sortable = null;
});
</script>

<template>
  <ul ref="listRef" class="flex flex-col gap-2">
    <li
      v-for="section in knownSections"
      :key="section.key"
      class="flex items-center gap-3 rounded-lg border border-brand-slate-200 bg-white p-3"
    >
      <span
        class="section-drag-handle flex h-8 w-8 shrink-0 cursor-grab items-center justify-center text-brand-slate-400 active:cursor-grabbing"
        role="img"
        aria-label="Drag to reorder"
      >
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="6" cy="5" r="1.4" />
          <circle cx="6" cy="10" r="1.4" />
          <circle cx="6" cy="15" r="1.4" />
          <circle cx="14" cy="5" r="1.4" />
          <circle cx="14" cy="10" r="1.4" />
          <circle cx="14" cy="15" r="1.4" />
        </svg>
      </span>

      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-brand-slate-900">
          {{ SECTION_META[section.key].label }}
        </p>
        <p class="truncate text-xs text-brand-slate-500">
          {{ SECTION_META[section.key].description }}
        </p>
      </div>

      <DesignSystemButton
        data-test="section-visibility"
        type="button"
        variant="outline"
        color="slate"
        size="sm"
        :disabled="isDisabled(section.key)"
        :aria-pressed="section.visible"
        @click="toggleVisibility(section.key)"
      >
        {{ section.visible ? "Visible" : "Hidden" }}
      </DesignSystemButton>
    </li>
  </ul>
</template>
