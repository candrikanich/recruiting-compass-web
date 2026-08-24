<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @keydown.escape="handleClose"
  >
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-upload-title"
      class="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between border-b border-slate-200 p-6"
      >
        <h2
          id="document-upload-title"
          class="text-2xl font-bold text-slate-900"
        >
          Upload Document
        </h2>
        <button
          @click="handleClose"
          aria-label="Close upload document dialog"
          class="text-2xl text-slate-500 transition hover:text-slate-900"
        >
          ×
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleUpload" class="space-y-6 p-6">
        <!-- Document Type -->
        <div>
          <label
            for="type"
            class="mb-1 block text-sm font-medium text-slate-700"
          >
            Document Type <span class="text-red-600">*</span>
          </label>
          <select
            id="type"
            v-model="form.type"
            required
            class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Select Type</option>
            <option value="highlight_video">Highlight Video</option>
            <option value="transcript">Transcript</option>
            <option value="resume">Resume</option>
            <option value="rec_letter">Recommendation Letter</option>
            <option value="questionnaire">Questionnaire</option>
            <option value="stats_sheet">Stats Sheet</option>
          </select>
        </div>

        <!-- Title -->
        <div>
          <label
            for="title"
            class="mb-1 block text-sm font-medium text-slate-700"
          >
            Title <span class="text-red-600">*</span>
          </label>
          <input
            id="title"
            v-model="form.title"
            type="text"
            required
            placeholder="e.g., Spring 2025 Highlights"
            class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <!-- Description -->
        <div>
          <label
            for="description"
            class="mb-1 block text-sm font-medium text-slate-700"
          >
            Description
          </label>
          <textarea
            id="description"
            v-model="form.description"
            rows="3"
            placeholder="Additional details about this document..."
            class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <!-- File Upload -->
        <div>
          <label
            for="file"
            class="mb-1 block text-sm font-medium text-slate-700"
          >
            Select File <span class="text-red-600">*</span>
          </label>
          <div class="relative">
            <input
              id="file"
              ref="fileInput"
              type="file"
              @change="handleFileSelect"
              class="sr-only"
            />
            <button
              type="button"
              @click="fileInput?.click()"
              :disabled="!form.type"
              class="w-full rounded-lg border-2 border-dashed border-slate-300 px-4 py-2 text-slate-600 transition hover:border-blue-500 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ selectedFileName || "Click to select file" }}
            </button>
          </div>
          <p v-if="form.type" class="mt-2 text-xs text-slate-500">
            Allowed formats: {{ allowedFileTypes }}
          </p>
          <p v-if="fileError" class="mt-2 text-xs text-red-600">
            {{ fileError }}
          </p>
        </div>

        <!-- Error Message -->
        <div
          v-if="uploadError"
          class="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p class="text-sm text-red-700">{{ uploadError }}</p>
        </div>

        <!-- Upload Progress -->
        <div v-if="isUploading" class="space-y-2">
          <div class="h-2 w-full rounded-full bg-slate-200">
            <div
              class="h-2 rounded-full bg-blue-600 transition-all duration-300"
              :style="{ width: `${uploadProgress}%` }"
            />
          </div>
          <p class="text-center text-sm text-slate-600">
            Uploading... {{ uploadProgress }}%
          </p>
        </div>

        <!-- Buttons -->
        <div class="flex gap-4">
          <button
            type="submit"
            :disabled="
              isUploading || !form.type || !form.title || !selectedFile
            "
            class="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ isUploading ? "Uploading..." : "Upload" }}
          </button>
          <button
            type="button"
            @click="handleClose"
            :disabled="isUploading"
            class="flex-1 rounded-lg bg-slate-200 px-4 py-2 font-semibold text-slate-900 transition hover:bg-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";
import { useDocumentsConsolidated } from "~/composables/useDocumentsConsolidated";
import { useFormValidation } from "~/composables/useFormValidation";
import type { Database } from "~/types/database";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("DocumentUploadModal");

type DocumentType = Database["public"]["Enums"]["document_type"];

interface Props {
  schoolId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  success: [];
}>();

const {
  uploadDocument,
  shareDocument,
  uploadProgress,
  uploadError: docUploadError,
  isUploading,
} = useDocumentsConsolidated();
const { validateFile } = useFormValidation();

const dialogRef = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(dialogRef);

onMounted(async () => {
  await nextTick();
  activate();
});

const handleClose = () => {
  deactivate();
  emit("close");
};

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const selectedFileName = ref("");
const fileError = ref("");

const form = reactive({
  type: "",
  title: "",
  description: "",
});

const uploadError = computed(() => fileError.value || docUploadError.value);

const allowedFileTypes = computed(() => {
  const typeExtensions: Record<string, string[]> = {
    highlight_video: [".mp4", ".mov", ".avi"],
    transcript: [".pdf", ".txt"],
    resume: [".pdf", ".doc", ".docx"],
    rec_letter: [".pdf"],
    questionnaire: [".pdf", ".doc", ".docx"],
    stats_sheet: [".csv", ".xls", ".xlsx"],
  };

  if (!form.type || !typeExtensions[form.type]) {
    return "Select a document type first";
  }

  return typeExtensions[form.type].join(", ");
});

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  fileError.value = "";

  if (target.files && target.files.length > 0) {
    const file = target.files[0];

    try {
      validateFile(file, form.type as DocumentType);
      selectedFile.value = file;
      selectedFileName.value = file.name;
    } catch (err) {
      fileError.value = err instanceof Error ? err.message : "Invalid file";
      selectedFile.value = null;
      selectedFileName.value = "";
      target.value = "";
    }
  }
};

const handleUpload = async () => {
  if (!selectedFile.value) return;

  try {
    const result = await uploadDocument(
      selectedFile.value,
      form.type,
      form.title,
      form.description || undefined,
    );

    if (result.success && result.data) {
      // Share document with school (append to shared_with_schools on document)
      const updatedSharedSchools = [
        ...(result.data.shared_with_schools || []),
        props.schoolId,
      ];
      await shareDocument(result.data.id, updatedSharedSchools);

      // Reset form
      form.type = "";
      form.title = "";
      form.description = "";
      selectedFile.value = null;
      selectedFileName.value = "";

      // Emit success to parent
      emit("success");
      handleClose();
    }
  } catch (err) {
    logger.error("Failed to upload document", err);
  }
};
</script>
