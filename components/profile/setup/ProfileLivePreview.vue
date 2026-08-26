<!-- components/profile/setup/ProfileLivePreview.vue -->
<script setup lang="ts">
import { computed } from "vue";
import type { PlayerDetails, PlayerProfile, PublicProfileData } from "~/types/models";
import { useUserStore } from "~/stores/user";
import { resolveSections, isSectionVisible } from "~/utils/profile/sectionConfig";
import { buildTeamHistory } from "~/utils/profile/publicProfileBuilders";
import PublicProfileCard from "~/components/profile/PublicProfileCard.vue";

// The in-progress owner draft — a partial PlayerProfile. Only the fields
// assemblePublicProfile()/resolveSections() consume are read; everything
// else on the draft is ignored here.
export type ProfileSetupDraft = Partial<PlayerProfile>;

const props = defineProps<{
  draft: ProfileSetupDraft;
  details: PlayerDetails;
}>();

const userStore = useUserStore();

function str(v: unknown) {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : undefined;
}

// Mirrors assemblePublicProfile() in server/api/public/profile/[slug].get.ts
// field-for-field, driven by the in-progress draft instead of the persisted
// row, so the mini-preview's gating is identical to the live public page's.
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
            ncsa_id: (details.ncsa_id as string | undefined) || undefined,
            hudl_url: (details.hudl_url as string | undefined) || undefined,
            perfect_game_id:
              (details.perfect_game_id as string | undefined) || undefined,
            prep_baseball_id:
              (details.prep_baseball_id as string | undefined) || undefined,
            prep_baseball_state:
              (details.prep_baseball_state as string | undefined) ||
              undefined,
            athletic_net_id:
              (details.athletic_net_id as string | undefined) || undefined,
            swimcloud_id:
              (details.swimcloud_id as string | undefined) || undefined,
            utr_id: (details.utr_id as string | undefined) || undefined,
            tennis_recruiting_id:
              (details.tennis_recruiting_id as string | undefined) ||
              undefined,
            elite_prospects_id:
              (details.elite_prospects_id as string | undefined) || undefined,
            sportsrecruits_id:
              (details.sportsrecruits_id as string | undefined) || undefined,
            concept2_id:
              (details.concept2_id as string | undefined) || undefined,
            milesplit_url:
              (details.milesplit_url as string | undefined) || undefined,
            on3_url: (details.on3_url as string | undefined) || undefined,
            sports247_url:
              (details.sports247_url as string | undefined) || undefined,
          }
        : null,
    // The setup flow has no video_links wired into the draft yet — the
    // mini-preview shows the film section empty rather than gating it off,
    // since visibility (not content) is what this preview proves out.
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
    // Metrics live in performance_metrics, not on the draft/details this
    // component receives — same deferral as film above.
    metrics: null,
    teamHistory: isSectionVisible(sections, "team_history")
      ? buildTeamHistory(details)
      : null,
    sections,
  };
});
</script>

<template>
  <div class="mx-auto flex w-full max-w-[400px] flex-col gap-2">
    <div class="flex items-center justify-between">
      <p class="text-xs font-semibold tracking-wide text-brand-slate-400 uppercase">
        Live Mini Preview
      </p>
      <span
        class="inline-flex items-center gap-1 rounded-full bg-brand-blue-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brand-blue-700 uppercase"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-brand-blue-500" />
        Live
      </span>
    </div>
    <div class="origin-top scale-[0.85] transform">
      <PublicProfileCard :data="previewData" />
    </div>
  </div>
</template>
