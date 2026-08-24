<template>
  <div
    class="flex flex-col rounded-lg bg-white p-6 shadow-sm transition hover:shadow-lg"
  >
    <!-- Document Icon/Preview -->
    <div
      class="mb-4 flex h-24 items-center justify-center rounded-lg bg-slate-100"
    >
      <span class="text-4xl">{{ getDocumentIcon(document.type) }}</span>
    </div>

    <!-- Document Info -->
    <div class="mb-4 flex-1">
      <p class="mb-1 text-xs font-semibold text-blue-600">
        {{ getTypeLabel(document.type) }}
      </p>
      <h3 class="line-clamp-2 text-lg font-bold text-slate-900">
        {{ document.title }}
      </h3>
      <p
        v-if="document.description"
        class="mt-2 line-clamp-2 text-sm text-slate-600"
      >
        {{ document.description }}
      </p>

      <!-- Metadata -->
      <div class="mt-3 space-y-1 text-xs text-slate-600">
        <p v-if="schoolName" class="flex items-center gap-1">
          <UIcon name="i-heroicons-building-library" class="h-4 w-4" />
          <span>{{ schoolName }}</span>
        </p>
        <p v-if="document.version">📌 Version {{ document.version }}</p>
        <p
          v-if="
            document.shared_with_schools &&
            document.shared_with_schools.length > 0
          "
          class="flex items-center gap-1 text-emerald-600"
        >
          <UIcon name="i-heroicons-check" class="h-4 w-4" />
          <span
            >Shared with
            {{ document.shared_with_schools.length }} school(s)</span
          >
        </p>
        <p>📅 {{ formatDate(document.created_at) }}</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 border-t border-slate-200 pt-4">
      <NuxtLink
        :to="{
          path: '/documents/view',
          query: { id: document.id },
        }"
        class="flex-1 rounded-sm bg-blue-100 px-3 py-2 text-center text-sm font-semibold text-blue-700 transition hover:bg-blue-200"
      >
        View Details →
      </NuxtLink>
      <button
        v-if="showActions"
        @click="handleDelete"
        class="flex-1 rounded-sm bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Delete
      </button>
    </div>

    <DesignSystemConfirmDialog
      :is-open="isDeleteDialogOpen"
      title="Delete Document"
      message="Are you sure you want to delete this document? This action cannot be undone."
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { Document } from "~/types/models";

interface Props {
  document: Document;
  schoolName?: string;
  showActions?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  schoolName: undefined,
  showActions: true,
});

const emit = defineEmits<{
  delete: [id: string];
}>();

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    highlight_video: "Highlight Video",
    transcript: "Transcript",
    resume: "Resume",
    rec_letter: "Rec Letter",
    questionnaire: "Questionnaire",
    stats_sheet: "Stats Sheet",
  };
  return labels[type] || type;
};

const getDocumentIcon = (type: string): string => {
  const icons: Record<string, string> = {
    highlight_video: "🎬",
    transcript: "📄",
    resume: "📋",
    rec_letter: "💌",
    questionnaire: "📝",
    stats_sheet: "📊",
  };
  return icons[type] || "📎";
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const isDeleteDialogOpen = ref(false);

const handleDelete = () => {
  isDeleteDialogOpen.value = true;
};

const confirmDelete = () => {
  isDeleteDialogOpen.value = false;
  emit("delete", props.document.id);
};

const cancelDelete = () => {
  isDeleteDialogOpen.value = false;
};
</script>
