<script setup lang="ts">
import { computed } from "vue";
import { paginationItems, type PaginationItem } from "~/utils/paginationItems";

interface Props {
  page: number;
  totalPages: number;
  disabled?: boolean;
  /** Hide the control entirely when there is only one page (default). */
  hideWhenSingle?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  hideWhenSingle: true,
});

const emit = defineEmits<{
  "update:page": [page: number];
}>();

const safeTotal = computed(() =>
  Number.isFinite(props.totalPages)
    ? Math.max(0, Math.floor(props.totalPages))
    : 0,
);

const visible = computed(
  () => safeTotal.value > 0 && !(props.hideWhenSingle && safeTotal.value <= 1),
);

const items = computed(() => paginationItems(props.page, safeTotal.value));

const atStart = computed(() => props.page <= 1);
const atEnd = computed(() => props.page >= safeTotal.value);

function goTo(next: number) {
  if (props.disabled) return;
  if (next < 1 || next > safeTotal.value || next === props.page) return;
  emit("update:page", next);
}

function itemKey(item: PaginationItem, index: number): string {
  return item === "ellipsis" ? `ellipsis-${index}` : `page-${item}`;
}
</script>

<template>
  <nav
    v-if="visible"
    aria-label="Pagination"
    class="flex flex-wrap items-center justify-center gap-3"
  >
    <DesignSystemButton
      variant="outline"
      color="slate"
      size="sm"
      :disabled="disabled || atStart"
      aria-label="Previous page"
      @click="goTo(page - 1)"
    >
      Previous
    </DesignSystemButton>

    <p
      class="text-sm text-brand-slate-600 sm:hidden"
      aria-live="polite"
      aria-atomic="true"
    >
      Page {{ page }} of {{ safeTotal }}
    </p>

    <ul class="hidden items-center gap-1 sm:flex">
      <li v-for="(item, index) in items" :key="itemKey(item, index)">
        <span
          v-if="item === 'ellipsis'"
          class="px-2 text-brand-slate-400"
          aria-hidden="true"
        >
          …
        </span>
        <DesignSystemButton
          v-else
          :variant="item === page ? 'solid' : 'ghost'"
          :color="item === page ? 'blue' : 'slate'"
          size="sm"
          :disabled="disabled"
          :aria-current="item === page ? 'page' : undefined"
          :aria-label="
            item === page ? `Page ${item}, current page` : `Page ${item}`
          "
          @click="goTo(item)"
        >
          {{ item }}
        </DesignSystemButton>
      </li>
    </ul>

    <DesignSystemButton
      variant="outline"
      color="slate"
      size="sm"
      :disabled="disabled || atEnd"
      aria-label="Next page"
      @click="goTo(page + 1)"
    >
      Next
    </DesignSystemButton>
  </nav>
</template>
