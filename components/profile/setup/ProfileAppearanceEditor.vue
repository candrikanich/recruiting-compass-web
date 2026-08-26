<!-- components/profile/setup/ProfileAppearanceEditor.vue -->
<script setup lang="ts">
import { ref } from "vue";
import { useProfileBanner } from "~/composables/useProfileBanner";

// Six theme swatches matching the Figma design (navy / blue / teal / red /
// purple / indigo). Keys are constrained to the header_color enum the server
// accepts (server/api/player/profile.put.ts).
const HEADER_COLORS = [
  { key: "slate", label: "Navy", swatch: "bg-slate-800" },
  { key: "blue", label: "Blue", swatch: "bg-blue-700" },
  { key: "teal", label: "Teal", swatch: "bg-teal-700" },
  { key: "rose", label: "Red", swatch: "bg-rose-700" },
  { key: "violet", label: "Purple", swatch: "bg-violet-700" },
  { key: "indigo", label: "Indigo", swatch: "bg-indigo-900" },
] as const;

defineProps<{
  headerColor: string;
  bannerUrl: string | null;
}>();

const emit = defineEmits<{
  "update:headerColor": [color: string];
  "update:bannerUrl": [url: string];
}>();

const { uploading, error, uploadBanner } = useProfileBanner();

const bannerInput = ref<HTMLInputElement | null>(null);
function triggerBannerUpload() {
  bannerInput.value?.click();
}

async function onBannerChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const url = await uploadBanner(file);
    emit("update:bannerUrl", url);
  } catch {
    // error state already surfaced via useProfileBanner's error ref
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="space-y-2">
      <label class="text-sm font-medium text-brand-slate-700">
        Hero Background Color Theme
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="color in HEADER_COLORS"
          :key="color.key"
          type="button"
          :title="color.label"
          :data-test="`header-color-${color.key}`"
          class="h-7 w-7 rounded-full transition-transform hover:scale-110 focus:ring-2 focus:ring-brand-slate-400 focus:ring-offset-2 focus:outline-none"
          :class="[
            color.swatch,
            headerColor === color.key ? 'scale-110 ring-2 ring-brand-slate-600 ring-offset-2' : '',
          ]"
          @click="emit('update:headerColor', color.key)"
        />
      </div>
    </div>

    <div class="space-y-2">
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-test="banner-upload-trigger"
          class="inline-flex items-center gap-2 rounded-lg border border-brand-slate-300 bg-white px-4 py-2 text-sm font-medium text-brand-slate-700 transition-colors hover:bg-brand-slate-50"
          @click="triggerBannerUpload"
        >
          <UIcon
            name="i-heroicons-arrow-up-tray"
            class="h-4 w-4"
            aria-hidden="true"
          />
          Upload Custom Banner
        </button>
        <span class="text-xs text-brand-slate-400">
          Recommended: 1200×400 JPG or PNG
        </span>
      </div>
      <input
        ref="bannerInput"
        data-test="banner-upload"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        class="hidden"
        @change="onBannerChange"
      />
      <p v-if="uploading" data-test="banner-uploading" class="text-xs text-brand-slate-500">
        Uploading…
      </p>
      <p v-if="error" data-test="banner-error" class="text-xs text-red-500">
        {{ error }}
      </p>
    </div>
  </div>
</template>
