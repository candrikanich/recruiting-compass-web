<!-- pages/p/[slug].vue -->
<script setup lang="ts">
import type { PublicProfileData } from "~/types/models";

// No auth middleware — this page is publicly accessible
definePageMeta({ layout: "default" });

const route = useRoute();
const slug = route.params.slug as string;
// Named refToken (not "ref") to avoid shadowing Vue's ref() function
const refToken = (route.query.ref as string) ?? null;

const {
  data: profile,
  error,
  status,
} = await useFetch<PublicProfileData>(`/api/public/profile/${slug}`, {
  key: `profile-${slug}`,
});

// Fire-and-forget view recording — only fires when profile loaded successfully
if (import.meta.client && profile.value) {
  const viewUrl = refToken
    ? `/api/public/profile/${slug}/view?ref=${refToken}`
    : `/api/public/profile/${slug}/view`;
  $fetch(viewUrl, { method: "POST" }).catch(() => {
    /* silent */
  });
}

const notFound = computed(
  () => status.value === "error" && (error.value as any)?.statusCode === 404,
);
const unavailable = computed(
  () => status.value === "error" && (error.value as any)?.statusCode === 410,
);

useSeoMeta({
  title: computed(() =>
    profile.value
      ? `${profile.value.playerName} — Recruiting Profile`
      : "Player Profile",
  ),
  description: computed(
    () =>
      profile.value?.bio ??
      "Recruiting profile powered by The Recruiting Compass",
  ),
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="flex items-center justify-center min-h-screen"
    >
      <div class="text-gray-400">Loading profile…</div>
    </div>

    <!-- Not found -->
    <div
      v-else-if="notFound"
      class="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4"
    >
      <h1 class="text-2xl font-semibold text-gray-800">Profile not found</h1>
      <p class="text-gray-500">
        This link may be incorrect or the profile has been removed.
      </p>
    </div>

    <!-- Unavailable (unpublished or cancelled) -->
    <div
      v-else-if="unavailable"
      class="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4"
    >
      <h1 class="text-2xl font-semibold text-gray-800">
        Profile not available
      </h1>
      <p class="text-gray-500">
        This player's profile is not currently available. Check back later.
      </p>
    </div>

    <!-- Profile card -->
    <div v-else-if="profile" class="max-w-2xl mx-auto py-8 px-4">
      <ProfilePublicProfileCard :profile="profile" />
    </div>

    <!-- Generic error fallback (500 or unexpected status) -->
    <div
      v-else
      class="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4"
    >
      <h1 class="text-2xl font-semibold text-gray-800">Something went wrong</h1>
      <p class="text-gray-500">
        Unable to load this profile. Please try again later.
      </p>
    </div>
  </div>
</template>
