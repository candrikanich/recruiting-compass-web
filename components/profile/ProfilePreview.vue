<!-- components/profile/ProfilePreview.vue -->
<script setup lang="ts">
import type { PlayerProfile, PublicProfileData, VideoLink } from "~/types/models";

const props = defineProps<{
  settings: PlayerProfile;
  playerName: string;
  details: Record<string, unknown> | null;
  schools: Array<{ id: string; name: string }>;
}>();

const previewData = computed<PublicProfileData>(() => ({
  playerName: props.playerName,
  bio: props.settings.bio ?? null,
  academics: props.settings.show_academics && props.details
    ? {
        gpa: props.details.gpa as number | undefined,
        sat_score: props.details.sat_score as number | undefined,
        act_score: props.details.act_score as number | undefined,
        graduation_year: props.details.graduation_year as number | undefined,
        high_school: (props.details.school_name ?? props.details.high_school) as string | undefined,
        core_courses: props.details.core_courses as string[] | undefined,
      }
    : null,
  athletic: props.settings.show_athletic && props.details
    ? {
        primary_sport: props.details.primary_sport as string | undefined,
        primary_position: props.details.primary_position as string | undefined,
        height_inches: props.details.height_inches as number | undefined,
        weight_lbs: props.details.weight_lbs as number | undefined,
      }
    : null,
  film: props.settings.show_film && props.details?.video_links
    ? (props.details.video_links as VideoLink[])
    : null,
  schools: props.settings.show_schools ? props.schools : null,
}));
</script>

<template>
  <div class="bg-gray-50 rounded-xl p-4">
    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Preview — What coaches see</p>
    <PublicProfileCard :profile="previewData" />
  </div>
</template>
