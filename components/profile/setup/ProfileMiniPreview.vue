<!-- components/profile/setup/ProfileMiniPreview.vue -->
<!--
  Owner-facing compact preview of the public profile (Figma "Live Mini
  Preview"). A purpose-built summary card — avatar + key stats + academic
  summary — NOT a scaled render of the whole public page. Plus a QR card so a
  coach can scan the profile at a tournament.
-->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import QRCode from "qrcode";
import type { PlayerDetails } from "~/types/models";
import { useUserStore } from "~/stores/user";
import { usePerformance } from "~/composables/usePerformance";
import { formatPositionsShort } from "~/utils/positions/canonical";
import { buildPublicMetrics } from "~/utils/profile/publicProfileBuilders";
import { createClientLogger } from "~/utils/logger";

const props = defineProps<{
  details: PlayerDetails;
  url: string;
}>();

const logger = createClientLogger("profile/setup/ProfileMiniPreview");
const userStore = useUserStore();

const playerName = computed(() => userStore.user?.full_name ?? "Your Name");
const photoUrl = computed(() => userStore.user?.profile_photo_url ?? null);

const sportLine = computed(() => {
  const d = props.details;
  const posShort = formatPositionsShort(
    d.primary_sport,
    d.positions,
    d.primary_position,
  );
  return [d.primary_sport, posShort].filter(Boolean).join(" · ");
});

// Key stats reuse the public builder so the formatting (e.g. ".410", units)
// and the newest-per-type dedupe match the live page exactly.
const { metrics, fetchMetrics } = usePerformance();
const keyStats = computed(() => buildPublicMetrics(metrics.value).slice(0, 2));

onMounted(() => {
  fetchMetrics().catch(() => {
    /* preview degrades to no key-stats block; not worth surfacing */
  });
});

const gpa = computed(() => {
  const g = props.details.gpa;
  return typeof g === "number" ? g.toFixed(2) : null;
});
const highSchool = computed(
  () => props.details.high_school ?? null,
);

// QR of the public URL.
const qrDataUrl = ref<string | null>(null);
async function generateQr() {
  if (!props.url) {
    qrDataUrl.value = null;
    return;
  }
  try {
    qrDataUrl.value = await QRCode.toDataURL(props.url, { margin: 1 });
  } catch (err) {
    logger.error("Failed to generate QR code", err);
    qrDataUrl.value = null;
  }
}
onMounted(generateQr);
watch(() => props.url, generateQr);
</script>

<template>
  <div class="flex w-full max-w-[400px] flex-col gap-4">
    <div class="flex items-center justify-between">
      <p class="text-xs font-semibold tracking-wide text-brand-slate-400 uppercase">
        Live Mini Preview
      </p>
      <span
        class="inline-flex items-center gap-1 rounded-full bg-brand-emerald-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brand-emerald-700 uppercase"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-brand-emerald-500" />
        Live
      </span>
    </div>

    <!-- Compact profile card -->
    <div
      class="overflow-hidden rounded-2xl border border-brand-slate-200 bg-white shadow-sm"
    >
      <div class="flex items-center gap-3 bg-brand-slate-900 p-5 text-white">
        <img
          v-if="photoUrl"
          :src="photoUrl"
          :alt="playerName"
          class="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/20"
        />
        <div
          v-else
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-slate-700 text-lg font-semibold ring-2 ring-white/20"
          aria-hidden="true"
        >
          {{ playerName.charAt(0) }}
        </div>
        <div class="min-w-0">
          <p class="truncate font-semibold">{{ playerName }}</p>
          <p v-if="sportLine" class="truncate text-sm text-brand-slate-300">
            {{ sportLine }}
          </p>
        </div>
      </div>

      <div class="space-y-4 p-5">
        <div v-if="keyStats.length">
          <p class="mb-2 text-xs font-semibold tracking-wide text-brand-slate-400 uppercase">
            Verified Key Stats
          </p>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="stat in keyStats"
              :key="stat.key"
              class="rounded-lg bg-brand-slate-50 p-3"
            >
              <p class="text-[11px] text-brand-slate-500">{{ stat.label }}</p>
              <p class="text-lg font-bold text-brand-slate-900">
                {{ stat.value }}<span
                  v-if="stat.unit"
                  class="ml-0.5 text-xs font-medium text-brand-slate-500"
                  >{{ stat.unit }}</span
                >
              </p>
            </div>
          </div>
        </div>

        <div v-if="gpa || highSchool">
          <p class="mb-2 text-xs font-semibold tracking-wide text-brand-slate-400 uppercase">
            Academic Summary
          </p>
          <p v-if="gpa" class="text-sm text-brand-slate-700">
            GPA: <span class="font-semibold text-brand-slate-900">{{ gpa }}</span>
          </p>
          <p v-if="highSchool" class="text-sm text-brand-slate-500">
            {{ highSchool }}
          </p>
        </div>
      </div>
    </div>

    <!-- QR card -->
    <div
      class="rounded-2xl border border-brand-slate-200 bg-white p-5 text-center shadow-sm"
    >
      <p class="mb-3 text-sm font-medium text-brand-slate-700">
        Profile QR Code
      </p>
      <img
        v-if="qrDataUrl"
        data-test="preview-qr"
        :src="qrDataUrl"
        alt="QR code linking to your public profile"
        class="mx-auto h-28 w-28 rounded-lg border border-brand-slate-200 bg-white p-1.5"
      />
      <p class="mt-3 text-xs text-brand-slate-400">
        Coaches can scan directly at tournaments
      </p>
    </div>
  </div>
</template>
