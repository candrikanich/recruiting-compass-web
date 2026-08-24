<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div class="border-b border-slate-200 bg-white">
      <div class="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        <NuxtLink
          to="/settings"
          class="mb-3 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
          Back to Settings
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-slate-900">My Profile</h1>
        <p class="text-slate-600">
          Manage your identity, security, and account settings
        </p>
      </div>
    </div>

    <main class="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <ProfilePhotoSection />
      <ProfilePersonalInfoSection />
      <ProfileEmailSection />
      <ProfilePasswordSection />
      <ProfileAthleteSection v-if="isAthlete" />
      <ProfileDataPrivacySection />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useUserStore } from "~/stores/user";
import ProfilePhotoSection from "~/components/Settings/Profile/ProfilePhotoSection.vue";
import ProfilePersonalInfoSection from "~/components/Settings/Profile/ProfilePersonalInfoSection.vue";
import ProfileEmailSection from "~/components/Settings/Profile/ProfileEmailSection.vue";
import ProfilePasswordSection from "~/components/Settings/Profile/ProfilePasswordSection.vue";
import ProfileAthleteSection from "~/components/Settings/Profile/ProfileAthleteSection.vue";
import ProfileDataPrivacySection from "~/components/Settings/Profile/ProfileDataPrivacySection.vue";

definePageMeta({ middleware: "auth" });

const store = useUserStore();
const isAthlete = computed(() => store.isAthlete);
</script>
