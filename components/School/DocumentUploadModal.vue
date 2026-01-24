<template>
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
  >
    <div
      class="rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto bg-white border border-slate-200"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-6 border-b border-slate-200"
      >
        <h2 class="text-2xl font-bold text-slate-900">Upload Document</h2>
        <button
          @click="$emit('close')"
          class="text-2xl text-slate-500 transition hover:text-slate-900"
        >
          ×
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleUpload" class="p-6 space-y-6">
        <!-- Document Type -->
        <div>
          <label
            for="type"
            class="block text-sm font-medium mb-1 text-slate-700"
          >
            Document Type <span class="text-red-600">*</span>
          </label>
          <select
            id="type"
            v-model="form.type"
            required
            class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
            class="block text-sm font-medium mb-1 text-slate-700"
          >
            Title <span class="text-red-600">*</span>
          </label>
          <input
            id="title"
            v-model="form.title"
            type="text"
            required
            placeholder="e.g., Spring 2025 Highlights"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <!-- Description -->
        <div>
          <label
            for="description"
            class="block text-sm font-medium mb-1 text-slate-700"
          >
            Description
          </label>
          <textarea
            id="description"
            v-model="form.description"
            rows="3"
            placeholder="Additional details about this document..."
            class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <!-- File Upload -->
        <div>
          <label
            for="file"
            class="block text-sm font-medium mb-1 text-slate-700"
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
              class="w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ selectedFileName || "Click to select file" }}
            </button>
          </div>
          <p v-if="form.type" class="text-xs text-slate-500 mt-2">
            Allowed formats: {{ allowedFileTypes }}
          </p>
          <p v-if="fileError" class="text-xs text-red-600 mt-2">
            {{ fileError }}
          </p>
        </div>

        <!-- Error Message -->
        <div
          v-if="uploadError"
          class="p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <p class="text-sm text-red-700">{{ uploadError }}</p>
        </div>

        <!-- Upload Progress -->
        <div v-if="isUploading" class="space-y-2">
          <div class="w-full bg-slate-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${uploadProgress}%` }"
            />
          </div>
          <p class="text-sm text-slate-600 text-center">
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
            class="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isUploading ? "Uploading..." : "Upload" }}
          </button>
          <button
            type="button"
            @click="$emit('close')"
            :disabled="isUploading"
            class="flex-1 px-4 py-2 bg-slate-200 text-slate-900 font-semibold rounded-lg hover:bg-slate-300 transition disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { useDocumentsConsolidated } from "~/composables/useDocumentsConsolidated";
import { useFormValidation } from "~/composables/useFormValidation";

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
  uploadProgress,
  uploadError: docUploadError,
  isUploading,
  shareDocument,
} = useDocumentsConsolidated();
const { validateFile } = useFormValidation();

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
      validateFile(file, form.type as any);
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
      form.description || undefined
    );

    if (result.success && result.data) {
      // Share document with school by adding school ID to shared_with_schools
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
      emit("close");
    }
  } catch (err) {
    console.error("Failed to upload document:", err);
  }
};
</script>
