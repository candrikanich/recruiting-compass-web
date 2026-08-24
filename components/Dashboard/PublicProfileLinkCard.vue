<template>
  <div
    class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
  >
    <h3 class="mb-1 font-semibold text-slate-900">Public Profile</h3>

    <!-- Published: show shareable link + copy + preview -->
    <template v-if="isPublished && publicUrl">
      <p class="mb-3 text-xs text-slate-500">
        Share this link with coaches. Anyone with it can view the profile.
      </p>
      <div
        class="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
      >
        <span
          data-testid="public-profile-url"
          class="min-w-0 flex-1 truncate font-mono text-xs text-slate-700"
          :title="publicUrl"
          >{{ publicUrl }}</span
        >
        <button
          type="button"
          data-testid="copy-public-profile-link"
          :aria-label="copied ? 'Copied!' : 'Copy public profile link'"
          :title="copied ? 'Copied!' : 'Copy'"
          class="shrink-0 text-slate-400 transition-colors hover:text-slate-600"
          @click="copyLink"
        >
          <svg
            v-if="!copied"
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="inline-flex flex-1 items-center justify-center rounded-lg bg-brand-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-brand-blue-700"
          @click="copyLink"
        >
          {{ copied ? "Copied!" : "Copy link" }}
        </button>
        <NuxtLink
          :to="profilePath"
          class="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Preview
        </NuxtLink>
      </div>
    </template>

    <!-- Not published: nudge to publish -->
    <template v-else>
      <p class="mb-3 text-xs text-slate-500">
        Publish a public profile to get a shareable link for coaches.
      </p>
      <NuxtLink
        to="/settings/player-details?tab=public-profile"
        class="inline-flex w-full items-center justify-center rounded-lg bg-brand-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-brand-blue-700"
      >
        Set up public profile
      </NuxtLink>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { usePlayerProfile } from "~/composables/usePlayerProfile";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("Dashboard/PublicProfileLinkCard");

const { isPublished, publicUrl } = usePlayerProfile();

// Relative path for the in-app <NuxtLink> preview (publicUrl is absolute).
const profilePath = computed(() => {
  if (!publicUrl.value) return "/";
  try {
    return new URL(publicUrl.value).pathname;
  } catch {
    return publicUrl.value.startsWith("/") ? publicUrl.value : "/";
  }
});

const copied = ref(false);

async function copyLink() {
  if (!publicUrl.value) return;
  try {
    await navigator.clipboard.writeText(publicUrl.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    logger.error("Failed to copy public profile link", err);
  }
}
</script>
