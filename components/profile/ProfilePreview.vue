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
        }
      : null,
  film: props.settings.show_film ? filmLinks.value : null,
  schools: props.settings.show_schools ? props.schools : null,
  social: previewSocial.value,
}));

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
  <div class="bg-gray-50 rounded-xl p-4">
    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
      Preview — What coaches see
    </p>
    <ProfilePublicProfileCard :profile="previewData" />
  </div>
</template>
