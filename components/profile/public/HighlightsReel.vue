<!-- components/profile/public/HighlightsReel.vue -->
<script setup lang="ts">
import type { VideoLink } from "~/types/models";
import SectionHeader from "~/components/profile/public/SectionHeader.vue";

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
    <SectionHeader icon="i-heroicons-film" title="Featured Highlights" />
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <a
        v-for="link in film"
        :key="link.url"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="group block overflow-hidden rounded-xl border border-brand-slate-200 bg-white transition-shadow hover:shadow-md"
      >
        <div
          class="relative flex aspect-video items-center justify-center bg-gradient-to-br from-brand-slate-800 to-brand-slate-900"
        >
          <span
            class="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-brand-slate-900 shadow-sm transition-transform group-hover:scale-110"
            aria-hidden="true"
          >
            <svg class="ml-0.5 h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.841z"
              />
            </svg>
          </span>
          <span
            class="absolute right-2 bottom-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white"
          >
            {{ PLATFORM_LABEL[link.platform] }}
          </span>
        </div>
        <div class="px-3 py-2.5">
          <p class="truncate text-sm font-medium text-brand-slate-900">
            {{ link.title || PLATFORM_LABEL[link.platform] }}
          </p>
        </div>
      </a>
    </div>
  </section>
</template>
