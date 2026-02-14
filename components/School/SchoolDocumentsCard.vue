<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <DocumentTextIcon class="w-5 h-5 text-slate-400" />
        <h2 class="text-lg font-semibold text-slate-900">Shared Documents</h2>
      </div>
      <button
        @click="showUploadModal = true"
        aria-label="Upload document"
        class="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Upload
      </button>
    </div>

    <div v-if="documents.length > 0" class="space-y-3">
      <div
        v-for="doc in documents"
        :key="doc.id"
        class="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
      >
        <div>
          <p class="font-medium text-slate-900 text-sm">
            {{ doc.title }}
          </p>
          <p class="text-xs text-slate-500 capitalize">
            {{ doc.type }}
          </p>
        </div>
        <NuxtLink
          :to="`/documents/${doc.id}`"
          class="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          View
        </NuxtLink>
      </div>
    </div>

    <div v-else class="text-center py-8 text-slate-500 text-sm">
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
import { ref, defineAsyncComponent } from "vue";
import type { Document } from "~/types/models";
import { DocumentTextIcon } from "@heroicons/vue/24/outline";
const SchoolDocumentUploadModal = defineAsyncComponent(
  () => import("~/components/School/DocumentUploadModal.vue"),
);

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
