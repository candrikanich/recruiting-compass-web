<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Global Navigation -->

    <!-- Page Header -->
    <PageHeader title="Settings" description="Manage your profile, preferences, and account settings" />

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <!-- Profile Section -->
      <div class="mb-8">
        <h2
          class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3"
        >
          Profile & Player Info
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard
            to="/settings/location"
            icon="🏠"
            title="Home Location"
            description="Set your home address to calculate distances to schools"
            :status="hasHomeLocation ? 'complete' : 'incomplete'"
            variant="blue"
          />
          <SettingsCard
            to="/settings/player-details"
            icon="👤"
            title="Player Details"
            description="Graduation year, positions, stats, and athletic profile"
            :status="hasPlayerDetails ? 'complete' : 'incomplete'"
            variant="green"
          />
        </div>
      </div>

      <!-- Preferences Section -->
      <div class="mb-8">
        <h2
          class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3"
        >
          School Preferences
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard
            to="/settings/school-preferences"
            icon="🎯"
            title="School Preferences"
            description="Set criteria for finding your ideal schools"
            :status="hasSchoolPreferences ? 'complete' : 'incomplete'"
            variant="purple"
          />
        </div>
      </div>

      <!-- Dashboard Section -->
      <div class="mb-8">
        <h2
          class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3"
        >
          Dashboard
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard
            to="/settings/dashboard"
            icon="🎛️"
            title="Dashboard Customization"
            description="Show or hide dashboard widgets"
            variant="blue"
          />
        </div>
      </div>

      <!-- Communication Section -->
      <div class="mb-8">
        <h2
          class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3"
        >
          Communication & Social
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard
            to="/settings/notifications"
            icon="🔔"
            title="Notifications"
            description="Configure alerts for follow-ups, deadlines, and updates"
            variant="orange"
          />
          <SettingsCard
            to="/settings/communication-templates"
            icon="📝"
            title="Communication Templates"
            description="Email and message templates for coach outreach"
            variant="gray"
          />
          <SettingsCard
            to="/settings/social-sync"
            icon="📱"
            title="Social Media Sync"
            description="Configure automatic social media monitoring"
            variant="blue"
          />
        </div>
      </div>

      <!-- Family Section -->
      <div class="mb-8">
        <h2
          class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3"
        >
          Family
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard
            to="/settings/family-management"
            icon="👨‍👩‍👧‍👦"
            title="Family Management"
            description="Manage family members and share recruiting data"
            variant="red"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import Header from "~/components/Header.vue";
import SettingsCard from "~/components/Settings/SettingsCard.vue";

definePageMeta({
  middleware: "auth",
});

const {
  getHomeLocation,
  getPlayerDetails,
  getSchoolPreferences,
  loadAllPreferences,
} = usePreferenceManager();

const hasHomeLocation = computed(() => {
  const loc = getHomeLocation.value;
  return !!(loc?.latitude && loc?.longitude);
});

const hasPlayerDetails = computed(() => {
  const details = getPlayerDetails();
  return !!(details?.graduation_year || details?.positions?.length);
});

const hasSchoolPreferences = computed(() => {
  const prefs = getSchoolPreferences();
  return !!prefs?.preferences?.length;
});

// Load all preferences when the page mounts to ensure reactive updates
onMounted(async () => {
  await loadAllPreferences();
});
</script>
