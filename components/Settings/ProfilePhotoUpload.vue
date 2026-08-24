<template>
  <div data-testid="profile-photo-upload" class="space-y-4">
    <!-- Current Photo Display -->
    <div class="flex items-center gap-4">
      <div class="shrink-0">
        <div
          v-if="hasProfilePhoto && profilePhotoUrl"
          class="relative h-24 w-24 overflow-hidden rounded-full bg-slate-200"
        >
          <img
            :src="profilePhotoUrl"
            :alt="`${userName}'s profile photo`"
            class="h-full w-full object-cover"
            loading="lazy"
            @error="handleImageError"
          />
        </div>
        <div
          v-else
          class="flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-blue-600 text-2xl font-semibold text-white"
        >
          {{ userInitials }}
        </div>
      </div>

      <div class="flex-1">
        <p class="text-sm font-medium text-slate-900">Profile Photo</p>
        <p class="mt-1 text-sm text-slate-600">
          JPG, PNG, WebP, or GIF up to 5MB (automatically compressed)
        </p>

        <div class="mt-4 flex items-center gap-2">
          <button
            type="button"
            data-testid="upload-photo-btn"
            @click="triggerFileInput"
            :disabled="uploading"
            class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ uploading ? "Uploading..." : "Upload Photo" }}
          </button>

          <button
            v-if="hasProfilePhoto"
            type="button"
            data-testid="remove-photo-btn"
            @click="confirmDelete"
            :disabled="uploading"
            class="rounded-lg border border-red-300 px-4 py-2 font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
        class="h-2 w-full overflow-hidden rounded-full bg-slate-200"
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
      class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
    >
      <p class="font-medium">Upload failed</p>
      <p>{{ error }}</p>
    </div>

    <!-- Confirmation Dialog -->
    <div
      v-if="showDeleteConfirm"
      class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
      @click="cancelDelete"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-photo-title"
        class="mx-4 max-w-sm rounded-lg bg-white p-6 shadow-lg"
        @click.stop
      >
        <h3
          id="remove-photo-title"
          class="mb-4 text-lg font-semibold text-slate-900"
        >
          Remove Profile Photo?
        </h3>
        <p class="mb-6 text-slate-600">
          Are you sure you want to remove your profile photo? You can upload a
          new one anytime.
        </p>
        <div class="flex justify-end gap-3">
          <button
            type="button"
            @click="cancelDelete"
            class="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="confirmDeleteAction"
            :disabled="uploading"
            class="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("ProfilePhotoUpload");

const props = defineProps<{
  // When set, the photo targets this user (a family athlete) instead of the
  // logged-in user, so a parent can view/edit the athlete's photo.
  targetUserId?: string;
}>();

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
} = useProfilePhoto(() => props.targetUserId ?? null);

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
    logger.error("Upload error", err);
  }
};

const handleImageError = () => {
  // Image failed to load, this might happen if URL is no longer valid
  logger.error("Failed to load profile photo");
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
    logger.error("Delete error", err);
    showDeleteConfirm.value = false;
  }
};
</script>
