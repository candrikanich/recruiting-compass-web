<!-- components/profile/public/HighlightsReel.vue -->
<script setup lang="ts">
import type { VideoLink } from "~/types/models";

defineProps<{ film: VideoLink[] | null }>();

const PLATFORM_LABEL: Record<VideoLink["platform"], string> = {
  hudl: "Hudl",
  youtube: "YouTube",
  vimeo: "Vimeo",
  other: "Video",
};
</script>

<template>
  <section v-if="film?.length">
    <h2 class="mb-3 text-sm font-semibold text-brand-slate-900">
      Highlights
    </h2>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <DesignSystemCard v-for="link in film" :key="link.url" padding="md">
        <a
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-3"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-slate-100 text-brand-slate-600"
            aria-hidden="true"
          >
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.841z"
              />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-brand-slate-900">
              {{ link.title || PLATFORM_LABEL[link.platform] }}
            </p>
            <p class="text-xs text-brand-slate-500">
              {{ PLATFORM_LABEL[link.platform] }}
            </p>
          </div>
        </a>
      </DesignSystemCard>
    </div>
  </section>
</template>
