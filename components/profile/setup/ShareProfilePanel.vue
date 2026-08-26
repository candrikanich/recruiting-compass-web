<!-- components/profile/setup/ShareProfilePanel.vue -->
<script setup lang="ts">
import { ref, computed } from "vue";
import { createClientLogger } from "~/utils/logger";

const props = defineProps<{
  url: string;
}>();

const logger = createClientLogger("profile/setup/ShareProfilePanel");

const copied = ref(false);

const mailtoHref = computed(() => {
  const subject = encodeURIComponent("Check out my recruiting profile");
  const body = encodeURIComponent(props.url);
  return `mailto:?subject=${subject}&body=${body}`;
});

const smsHref = computed(() => `sms:?&body=${encodeURIComponent(props.url)}`);

const twitterHref = computed(
  () => `https://twitter.com/intent/tweet?url=${encodeURIComponent(props.url)}`,
);

async function copyLink() {
  if (!props.url) return;
  try {
    await navigator.clipboard.writeText(props.url);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    logger.error("Failed to copy public profile link", err);
  }
}
</script>

<template>
  <div class="rounded-2xl border border-brand-slate-200 bg-white p-6 shadow-xs">
    <h3 class="mb-3 font-semibold text-brand-slate-900">Share Profile Link</h3>

    <div class="mb-3 flex items-center gap-2">
      <span
        class="min-w-0 flex-1 truncate rounded-lg border border-brand-slate-200 bg-brand-slate-50 px-3 py-2 text-sm text-brand-slate-700"
        :title="url"
      >
        {{ url }}
      </span>
      <button
        data-test="copy-link"
        type="button"
        class="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-blue-700"
        @click="copyLink"
      >
        {{ copied ? "Copied!" : "Copy Link" }}
      </button>
    </div>

    <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <a
        data-test="share-email"
        :href="mailtoHref"
        class="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-slate-200 px-4 py-2 text-sm font-medium text-brand-slate-700 transition-colors hover:bg-brand-slate-50"
      >
        <UIcon name="i-heroicons-envelope" class="h-4 w-4" aria-hidden="true" />
        Share via Email
      </a>
      <a
        data-test="share-text"
        :href="smsHref"
        class="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-slate-200 px-4 py-2 text-sm font-medium text-brand-slate-700 transition-colors hover:bg-brand-slate-50"
      >
        <UIcon
          name="i-heroicons-chat-bubble-left-right"
          class="h-4 w-4"
          aria-hidden="true"
        />
        Share via Text
      </a>
      <a
        data-test="share-twitter"
        :href="twitterHref"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-slate-200 px-4 py-2 text-sm font-medium text-brand-slate-700 transition-colors hover:bg-brand-slate-50"
      >
        <UIcon
          name="i-heroicons-arrow-up-on-square"
          class="h-4 w-4"
          aria-hidden="true"
        />
        Share to Twitter
      </a>
    </div>
  </div>
</template>
