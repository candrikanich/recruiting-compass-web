<template>
  <div data-testid="profile-photo-upload" class="space-y-4">
    <!-- Current Photo Display -->
    <div class="flex items-center gap-4">
      <div class="flex-shrink-0">
        <div
          v-if="hasProfilePhoto"
          class="relative w-24 h-24 rounded-full overflow-hidden bg-slate-200"
        >
          <img
            :src="profilePhotoUrl"
            :alt="userName"
            class="w-full h-full object-cover"
            @error="handleImageError"
          />
        </div>
        <div
          v-else
          class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-2xl"
        >
          {{ userInitials }}
        </div>
      </div>

      <div class="flex-1">
        <p class="text-sm font-medium text-slate-900">Profile Photo</p>
        <p class="text-sm text-slate-600 mt-1">
          JPG, PNG, WebP, or GIF up to 5MB (automatically compressed)
        </p>

        <div class="flex items-center gap-2 mt-4">
          <button
            type="button"
            data-testid="upload-photo-btn"
            @click="triggerFileInput"
            :disabled="uploading"
            class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {{ uploading ? "Uploading..." : "Upload Photo" }}
          </button>

          <button
            v-if="hasProfilePhoto"
            type="button"
            data-testid="remove-photo-btn"
            @click="confirmDelete"
            :disabled="uploading"
            class="px-4 py-2 border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Remove
          </button>
        </div>
      </div>
    </div>

    <!-- File Input (hidden) -->
    <input
      ref="fileInput"
      data-testid="file-input"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      class="hidden"
      @change="handleFileSelect"
    />

    <!-- Upload Progress -->
    <div v-if="uploading" class="space-y-2">
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium text-slate-900">Uploading photo...</p>
        <span class="text-sm text-slate-600">{{ uploadProgress }}%</span>
      </div>
      <div
        data-testid="upload-progress"
        class="w-full h-2 bg-slate-200 rounded-full overflow-hidden"
      >
        <div
          class="h-full bg-blue-600 transition-all duration-300"
          :style="{ width: `${uploadProgress}%` }"
        />
      </div>
    </div>

    <!-- Error Message -->
    <div
      v-if="error"
      data-testid="upload-error"
      class="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm"
    >
      <p class="font-medium">Upload failed</p>
      <p>{{ error }}</p>
    </div>

    <!-- Confirmation Dialog -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="cancelDelete"
    >
      <div class="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4" @click.stop>
        <h3 class="text-lg font-semibold text-slate-900 mb-4">
          Remove Profile Photo?
        </h3>
        <p class="text-slate-600 mb-6">
          Are you sure you want to remove your profile photo? You can upload a
          new one anytime.
        </p>
        <div class="flex gap-3 justify-end">
          <button
            type="button"
            @click="cancelDelete"
            class="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="confirmDeleteAction"
            :disabled="uploading"
            class="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Remove Photo
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useProfilePhoto } from "~/composables/useProfilePhoto";
import { useUserStore } from "~/stores/user";

const fileInput = ref<HTMLInputElement>();
const showDeleteConfirm = ref(false);

const userStore = useUserStore();
const {
  uploading,
  uploadProgress,
  error,
  profilePhotoUrl,
  hasProfilePhoto,
  uploadProfilePhoto,
  deleteProfilePhoto,
} = useProfilePhoto();

const userName = computed(() => userStore.user?.full_name || "User");

const userInitials = computed(() => {
  const name = userName.value;
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
});

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;

  if (!files || files.length === 0) {
    return;
  }

  const file = files[0];

  // Clear previous error
  error.value = null;

  try {
    const result = await uploadProfilePhoto(file);

    if (result.success) {
      // Clear file input
      target.value = "";
    }
  } catch (err) {
    console.error("Upload error:", err);
  }
};

const handleImageError = () => {
  // Image failed to load, this might happen if URL is no longer valid
  console.error("Failed to load profile photo");
};

const confirmDelete = () => {
  showDeleteConfirm.value = true;
};

const cancelDelete = () => {
  showDeleteConfirm.value = false;
};

const confirmDeleteAction = async () => {
  try {
    await deleteProfilePhoto();
    showDeleteConfirm.value = false;
  } catch (err) {
    console.error("Delete error:", err);
    showDeleteConfirm.value = false;
  }
};
</script>
