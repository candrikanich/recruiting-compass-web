<template>
  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-heroicons-document-text"
          class="h-5 w-5 text-slate-400"
        />
        <h2 class="text-lg font-semibold text-slate-900">Shared Documents</h2>
      </div>
      <button
        @click="showUploadModal = true"
        aria-label="Upload document"
        class="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        Upload
      </button>
    </div>

    <div v-if="documents.length > 0" class="space-y-3">
      <div
        v-for="doc in documents"
        :key="doc.id"
        class="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50"
      >
        <div>
          <p class="text-sm font-medium text-slate-900">
            {{ doc.title }}
          </p>
          <p class="text-xs text-slate-500 capitalize">
            {{ doc.type }}
          </p>
        </div>
        <NuxtLink
          :to="`/documents/${doc.id}`"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          View
        </NuxtLink>
      </div>
    </div>

    <div v-else class="py-8 text-center text-sm text-slate-500">
      No documents shared with this school yet
    </div>

    <!-- Document Upload Modal -->
    <SchoolDocumentUploadModal
      v-if="showUploadModal"
      :school-id="schoolId"
      @close="showUploadModal = false"
      @success="handleUploadSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { Document } from "~/types/models";
import SchoolDocumentUploadModal from "~/components/School/DocumentUploadModal.vue";

defineProps<{
  schoolId: string;
  documents: Document[];
}>();

const emit = defineEmits<{
  "upload-success": [];
}>();

const showUploadModal = ref(false);

const handleUploadSuccess = () => {
  showUploadModal.value = false;
  emit("upload-success");
};
</script>
