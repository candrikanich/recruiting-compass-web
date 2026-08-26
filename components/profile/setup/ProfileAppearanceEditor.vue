<!-- components/profile/setup/ProfileAppearanceEditor.vue -->
<script setup lang="ts">
import { useProfileBanner } from "~/composables/useProfileBanner";

const HEADER_COLORS = [
  { key: "slate", label: "Slate", swatch: "bg-slate-700" },
  { key: "blue", label: "Blue", swatch: "bg-blue-700" },
  { key: "indigo", label: "Indigo", swatch: "bg-indigo-700" },
  { key: "violet", label: "Violet", swatch: "bg-violet-700" },
  { key: "rose", label: "Rose", swatch: "bg-rose-700" },
  { key: "amber", label: "Amber", swatch: "bg-amber-600" },
  { key: "emerald", label: "Emerald", swatch: "bg-emerald-700" },
  { key: "teal", label: "Teal", swatch: "bg-teal-700" },
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
      <label class="text-xs font-semibold tracking-wide text-brand-slate-400 uppercase">
        Header color
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
      <label class="text-xs font-semibold tracking-wide text-brand-slate-400 uppercase" for="banner-upload">
        Upload Custom Banner
      </label>
      <input
        id="banner-upload"
        data-test="banner-upload"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        class="block w-full text-sm text-brand-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-blue-700 hover:file:bg-brand-blue-100"
        @change="onBannerChange"
      />
      <p class="text-xs text-brand-slate-400">Recommended: 1200x400 JPG or PNG</p>
      <p v-if="uploading" data-test="banner-uploading" class="text-xs text-brand-slate-500">
        Uploading…
      </p>
      <p v-if="error" data-test="banner-error" class="text-xs text-red-500">
        {{ error }}
      </p>
    </div>
  </div>
</template>
