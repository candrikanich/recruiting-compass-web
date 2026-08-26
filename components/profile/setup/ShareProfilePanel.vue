<!-- components/profile/setup/ShareProfilePanel.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import QRCode from "qrcode";
import { createClientLogger } from "~/utils/logger";

const props = defineProps<{
  url: string;
}>();

const logger = createClientLogger("profile/setup/ShareProfilePanel");

const copied = ref(false);
const qrDataUrl = ref<string | null>(null);

const mailtoHref = computed(() => {
  const subject = encodeURIComponent("Check out my recruiting profile");
  const body = encodeURIComponent(props.url);
  return `mailto:?subject=${subject}&body=${body}`;
});

const smsHref = computed(() => `sms:?&body=${encodeURIComponent(props.url)}`);

const twitterHref = computed(
  () => `https://twitter.com/intent/tweet?url=${encodeURIComponent(props.url)}`,
);

async function generateQrCode() {
  if (!props.url) {
    qrDataUrl.value = null;
    return;
  }
  try {
    qrDataUrl.value = await QRCode.toDataURL(props.url);
  } catch (err) {
    logger.error("Failed to generate QR code", err);
    qrDataUrl.value = null;
  }
}

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

watch(() => props.url, generateQrCode);
onMounted(generateQrCode);
</script>

<template>
  <div class="rounded-2xl border border-brand-slate-200 bg-white p-6 shadow-xs">
    <h3 class="mb-1 font-semibold text-brand-slate-900">Share your profile</h3>
    <p class="mb-4 text-xs text-brand-slate-500">
      Share this link with coaches. Anyone with it can view your profile.
    </p>

    <div
      class="mb-4 flex items-center gap-2 rounded-lg border border-brand-slate-200 bg-brand-slate-50 px-3 py-2"
    >
      <span class="min-w-0 flex-1 truncate font-mono text-xs text-brand-slate-700" :title="url">
        {{ url }}
      </span>
      <DesignSystemButton
        data-test="copy-link"
        type="button"
        variant="outline"
        color="slate"
        size="sm"
        @click="copyLink"
      >
        {{ copied ? "Copied!" : "Copy" }}
      </DesignSystemButton>
    </div>

    <div class="mb-4 flex flex-wrap gap-2">
      <a
        data-test="share-email"
        :href="mailtoHref"
        class="inline-flex items-center justify-center rounded-lg border border-brand-slate-200 px-4 py-2 text-sm font-medium text-brand-slate-700 transition-colors hover:bg-brand-slate-50"
      >
        Email
      </a>
      <a
        data-test="share-text"
        :href="smsHref"
        class="inline-flex items-center justify-center rounded-lg border border-brand-slate-200 px-4 py-2 text-sm font-medium text-brand-slate-700 transition-colors hover:bg-brand-slate-50"
      >
        Text
      </a>
      <a
        data-test="share-twitter"
        :href="twitterHref"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center justify-center rounded-lg border border-brand-slate-200 px-4 py-2 text-sm font-medium text-brand-slate-700 transition-colors hover:bg-brand-slate-50"
      >
        Twitter
      </a>
    </div>

    <div v-if="qrDataUrl" class="flex justify-center">
      <img
        data-test="qr"
        :src="qrDataUrl"
        alt="QR code linking to your public profile"
        class="h-32 w-32 rounded-lg border border-brand-slate-200 bg-white p-2"
      />
    </div>
  </div>
</template>
