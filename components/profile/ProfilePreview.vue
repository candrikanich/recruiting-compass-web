<!-- components/profile/ProfilePreview.vue -->
<script setup lang="ts">
import { computed, onMounted } from "vue";
import type {
  PlayerProfile,
  PublicProfileData,
  VideoLink,
} from "~/types/models";
import { useUserStore } from "~/stores/user";
import { useVideoLinks } from "~/composables/useVideoLinks";
import { resolveSections } from "~/utils/profile/sectionConfig";

const props = defineProps<{
  settings: PlayerProfile;
  playerName: string;
  details: Record<string, unknown> | null;
  schools: Array<{ id: string; name: string }>;
}>();

const userStore = useUserStore();

// Film preview is sourced from the video_links table — the same source the
// public profile page and recruiting packet already use — not the (dropped)
// JSONB `details.video_links` field.
const { links: videoLinkRows, load: loadVideoLinks } = useVideoLinks();

onMounted(() => {
  loadVideoLinks();
});

const filmLinks = computed<VideoLink[]>(() =>
  videoLinkRows.value.map((row) => ({
    platform: row.platform,
    url: row.url,
    title: row.title ?? undefined,
  })),
);

const previewData = computed<PublicProfileData>(() => ({
  playerName: props.playerName,
  photoUrl: userStore.user?.profile_photo_url ?? null,
  headerColor: props.settings.header_color ?? "slate",
  bio: props.settings.bio ?? null,
  academics:
    props.settings.show_academics && props.details
      ? {
          gpa: props.details.gpa as number | undefined,
          sat_score: props.details.sat_score as number | undefined,
          act_score: props.details.act_score as number | undefined,
          graduation_year: props.details.graduation_year as number | undefined,
          high_school: (props.details.school_name ??
            props.details.high_school) as string | undefined,
          core_courses: props.details.core_courses as string[] | undefined,
        }
      : null,
  athletic:
    props.settings.show_athletic && props.details
      ? {
          primary_sport: props.details.primary_sport as string | undefined,
          primary_position: props.details.primary_position as
            string | undefined,
          positions: props.details.positions as string[] | undefined,
          height_inches: props.details.height_inches as number | undefined,
          weight_lbs: props.details.weight_lbs as number | undefined,
          ncaa_id: (props.details.ncaa_id as string | undefined) || undefined,
          perfect_game_id:
            (props.details.perfect_game_id as string | undefined) || undefined,
          prep_baseball_id:
            (props.details.prep_baseball_id as string | undefined) || undefined,
          prep_baseball_state:
            (props.details.prep_baseball_state as string | undefined) ||
            undefined,
          athletic_net_id:
            (props.details.athletic_net_id as string | undefined) || undefined,
          swimcloud_id:
            (props.details.swimcloud_id as string | undefined) || undefined,
          utr_id: (props.details.utr_id as string | undefined) || undefined,
          tennis_recruiting_id:
            (props.details.tennis_recruiting_id as string | undefined) ||
            undefined,
          elite_prospects_id:
            (props.details.elite_prospects_id as string | undefined) ||
            undefined,
          sportsrecruits_id:
            (props.details.sportsrecruits_id as string | undefined) ||
            undefined,
          concept2_id:
            (props.details.concept2_id as string | undefined) || undefined,
          milesplit_url:
            (props.details.milesplit_url as string | undefined) || undefined,
          on3_url: (props.details.on3_url as string | undefined) || undefined,
          sports247_url:
            (props.details.sports247_url as string | undefined) || undefined,
        }
      : null,
  film: props.settings.show_film ? filmLinks.value : null,
  schools: props.settings.show_schools ? props.schools : null,
  social: previewSocial.value,
  bannerUrl: props.settings.banner_url ?? null,
  jerseyNumber: (props.details?.jersey_number as number | undefined) ?? null,
  commitmentStatus: props.settings.commitment_status,
  committedSchoolName: null,
  lookingFor: props.settings.looking_for ?? null,
  valuesTags: props.settings.values_tags ?? [],
  awards: props.settings.awards ?? [],
  metrics: props.settings.show_metrics
    ? ((props.details?.metrics as PublicProfileData["metrics"]) ?? [])
    : null,
  teamHistory:
    (props.details?.team_history as PublicProfileData["teamHistory"]) ?? null,
  sections: previewSections.value,
}));

// Mirrors the public endpoint's resolution so the owner preview never
// diverges from the live page: show_metrics/show_film/show_academics stay
// authoritative overrides, and an empty/absent section_config backfills to a
// sensible default instead of hiding every section.
const previewSections = computed(() => resolveSections(props.settings));

// Socials are not gated by a visibility flag — shown whenever a handle is set.
const previewSocial = computed<PublicProfileData["social"]>(() => {
  const d = props.details;
  if (!d) return null;
  const str = (v: unknown) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s.length ? s : undefined;
  };
  const social = {
    twitter_handle: str(d.twitter_handle),
    instagram_handle: str(d.instagram_handle),
    tiktok_handle: str(d.tiktok_handle),
    facebook_url: str(d.facebook_url),
  };
  return Object.values(social).some((v) => v !== undefined) ? social : null;
});
</script>

<template>
  <div class="rounded-xl bg-gray-50 p-4">
    <p class="mb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">
      Preview — What coaches see
    </p>
    <ProfilePublicProfileCard :data="previewData" />
  </div>
</template>
