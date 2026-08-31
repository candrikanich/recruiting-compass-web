<!-- components/profile/setup/ProfileMiniPreview.vue -->
<!--
  Owner-facing LIVE preview of the public profile. Renders the real
  PublicProfileCard from the in-progress draft, so section visibility/order,
  content, and the chosen hero color all reflect exactly what a coach will see.
  A Profile QR card sits beneath it. Metrics are fetched (they live in
  performance_metrics, not on the draft) so the preview isn't missing the
  athlete's key numbers.
-->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import QRCode from "qrcode";
import type {
  PlayerDetails,
  PlayerProfile,
  PublicProfileData,
} from "~/types/models";
import { useUserStore } from "~/stores/user";
import { usePerformance } from "~/composables/usePerformance";
import {
  resolveSections,
  isSectionVisible,
} from "~/utils/profile/sectionConfig";
import {
  buildTeamHistory,
  buildPublicMetrics,
} from "~/utils/profile/publicProfileBuilders";
import { createClientLogger } from "~/utils/logger";
import PublicProfileCard from "~/components/profile/PublicProfileCard.vue";

export type ProfileSetupDraft = Partial<PlayerProfile>;

const props = defineProps<{
  draft: ProfileSetupDraft;
  details: PlayerDetails;
  url: string;
}>();

const logger = createClientLogger("profile/setup/ProfileMiniPreview");
const userStore = useUserStore();

const { metrics, fetchMetrics } = usePerformance();
onMounted(() => {
  fetchMetrics().catch(() => {
    /* preview simply shows no metrics; not worth surfacing */
  });
});

function str(v: unknown) {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : undefined;
}

// Mirrors assemblePublicProfile() in server/api/public/profile/[slug].get.ts,
// driven by the in-progress draft instead of the persisted row.
const previewData = computed<PublicProfileData>(() => {
  const draft = props.draft;
  const details = props.details as unknown as Record<string, unknown>;
  const sections = resolveSections({
    ...draft,
    section_config: draft.section_config ?? [],
  });

  const social = {
    twitter_handle: str(details.twitter_handle),
    instagram_handle: str(details.instagram_handle),
    tiktok_handle: str(details.tiktok_handle),
    facebook_url: str(details.facebook_url),
  };
  const hasSocial = Object.values(social).some((v) => v !== undefined);

  return {
    playerName: userStore.user?.full_name ?? "Athlete",
    photoUrl: userStore.user?.profile_photo_url ?? null,
    headerColor: draft.header_color ?? "slate",
    bio: draft.bio ?? null,
    academics:
      isSectionVisible(sections, "academics") && details
        ? {
            gpa: details.gpa as number | undefined,
            sat_score: details.sat_score as number | undefined,
            act_score: details.act_score as number | undefined,
            graduation_year: details.graduation_year as number | undefined,
            high_school: (details.school_name ?? details.high_school) as
              string | undefined,
            intended_major: details.intended_major as string | undefined,
            core_courses: details.core_courses as string[] | undefined,
          }
        : null,
    athletic:
      draft.show_athletic && details
        ? {
            primary_sport: details.primary_sport as string | undefined,
            primary_position: details.primary_position as string | undefined,
            positions: details.positions as string[] | undefined,
            height_inches: details.height_inches as number | undefined,
            weight_lbs: details.weight_lbs as number | undefined,
            ncaa_id: (details.ncaa_id as string | undefined) || undefined,
            perfect_game_id:
              (details.perfect_game_id as string | undefined) || undefined,
            prep_baseball_id:
              (details.prep_baseball_id as string | undefined) || undefined,
            prep_baseball_state:
              (details.prep_baseball_state as string | undefined) || undefined,
          }
        : null,
    film: isSectionVisible(sections, "film") ? [] : null,
    schools: draft.show_schools ? [] : null,
    social: hasSocial ? social : null,
    bannerUrl: draft.banner_url ?? null,
    jerseyNumber: (details.jersey_number as number | undefined) ?? null,
    commitmentStatus: draft.commitment_status ?? "uncommitted",
    committedSchoolName: null,
    lookingFor: isSectionVisible(sections, "values")
      ? (draft.looking_for ?? null)
      : null,
    valuesTags: isSectionVisible(sections, "values")
      ? (draft.values_tags ?? [])
      : [],
    awards: isSectionVisible(sections, "awards") ? (draft.awards ?? []) : [],
    metrics: isSectionVisible(sections, "metrics")
      ? buildPublicMetrics(metrics.value)
      : null,
    teamHistory: isSectionVisible(sections, "team_history")
      ? buildTeamHistory(details)
      : null,
    updatedAt: null,
    sections,
  };
});

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
  <div class="flex w-full flex-col gap-4">
    <div class="flex items-center justify-between">
      <p
        class="text-xs font-semibold tracking-wide text-brand-slate-400 uppercase"
      >
        Live Preview
      </p>
      <span
        class="inline-flex items-center gap-1 rounded-full bg-brand-emerald-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brand-emerald-700 uppercase"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-brand-emerald-500" />
        Live
      </span>
    </div>

    <PublicProfileCard :data="previewData" />

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
