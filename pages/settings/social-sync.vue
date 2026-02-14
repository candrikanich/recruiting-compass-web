<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink
          to="/settings"
          class="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back to Settings
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-slate-900">Social Media Sync</h1>
        <p class="text-slate-600">
          Configure automatic social media monitoring
        </p>
      </div>
    </div>

    <main class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <!-- Sync Status Card -->
      <div
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
      >
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Sync Status</h2>

        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-sm text-gray-600">Last Manual Sync</p>
            <p class="text-lg font-semibold text-gray-900">
              {{ lastSyncDisplay }}
            </p>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-sm text-gray-600">Total Posts</p>
            <p class="text-lg font-semibold text-gray-900">{{ totalPosts }}</p>
          </div>
        </div>

        <button
          @click="syncNow"
          :disabled="syncing"
          class="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          <span v-if="syncing">Syncing...</span>
          <span v-else>Sync Now</span>
        </button>

        <div
          v-if="syncMessage"
          :class="[
            'mt-4 p-4 rounded-lg',
            syncSuccess
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800',
          ]"
        >
          {{ syncMessage }}
        </div>
      </div>

      <!-- Auto Sync Settings -->
      <div
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
      >
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Automatic Sync</h2>

        <div class="mb-4">
          <label class="flex items-center gap-3 cursor-pointer">
            <input
              v-model="autoSyncEnabled"
              type="checkbox"
              class="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span class="text-gray-700 font-medium">Enable automatic sync</span>
          </label>
          <p class="text-sm text-gray-500 mt-1 ml-8">
            When enabled, posts from your schools and coaches will be
            automatically synced every 6 hours
          </p>
        </div>

        <div v-if="autoSyncEnabled" class="mt-4 p-4 bg-blue-50 rounded-lg">
          <p class="text-sm text-blue-800">
            <strong>Next scheduled sync:</strong> Automatic sync runs via GitHub
            Actions every 6 hours. Configure schedules in your GitHub repository
            settings.
          </p>
        </div>
      </div>

      <!-- Tracked Accounts -->
      <div
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
      >
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          Tracked Accounts
        </h2>

        <div v-if="loading" class="text-center py-4">
          <p class="text-gray-600">Loading accounts...</p>
        </div>

        <div
          v-else-if="trackedAccounts.length === 0"
          class="text-center py-8 text-gray-500"
        >
          <p>No social accounts tracked yet.</p>
          <p class="text-sm mt-2">
            Add Twitter or Instagram handles to schools and coaches to start
            tracking.
          </p>
        </div>

        <div v-else class="space-y-4">
          <!-- Twitter Accounts -->
          <div v-if="twitterAccounts.length > 0">
            <h3 class="text-sm font-semibold text-gray-700 mb-2">
              Twitter/X Accounts ({{ twitterAccounts.length }})
            </h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="account in twitterAccounts"
                :key="account.handle"
                class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                @{{ account.handle }}
                <span class="text-blue-600 text-xs ml-1"
                  >({{ account.source }})</span
                >
              </span>
            </div>
          </div>

          <!-- Instagram Accounts -->
          <div v-if="instagramAccounts.length > 0" class="mt-4">
            <h3 class="text-sm font-semibold text-gray-700 mb-2">
              Instagram Accounts ({{ instagramAccounts.length }})
            </h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="account in instagramAccounts"
                :key="account.handle"
                class="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm"
              >
                @{{ account.handle }}
                <span class="text-pink-600 text-xs ml-1"
                  >({{ account.source }})</span
                >
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Notification Settings -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          Notification Settings
        </h2>

        <div class="space-y-4">
          <label class="flex items-center gap-3 cursor-pointer">
            <input
              v-model="notifyOnRecruitingPosts"
              type="checkbox"
              class="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <div>
              <span class="text-gray-700 font-medium"
                >Recruiting post alerts</span
              >
              <p class="text-sm text-gray-500">
                Get notified when new recruiting-related posts are found
              </p>
            </div>
          </label>

          <label class="flex items-center gap-3 cursor-pointer">
            <input
              v-model="notifyOnMentions"
              type="checkbox"
              class="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <div>
              <span class="text-gray-700 font-medium">Position mentions</span>
              <p class="text-sm text-gray-500">
                Alert when posts mention your tracked positions (e.g., "looking
                for a SS")
              </p>
            </div>
          </label>
        </div>

        <button
          @click="saveSettings"
          :disabled="saving"
          class="mt-6 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {{ saving ? "Saving..." : "Save Settings" }}
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";
import { useSchools } from "~/composables/useSchools";
import { useCoaches } from "~/composables/useCoaches";
import { useSocialMedia } from "~/composables/useSocialMedia";

definePageMeta({
  middleware: "auth",
});

const supabase = useSupabase();
const userStore = useUserStore();
const { schools, fetchSchools } = useSchools();
const { coaches, fetchCoaches } = useCoaches();
const { posts, fetchPosts } = useSocialMedia();

const loading = ref(true);
const syncing = ref(false);
const saving = ref(false);
const syncMessage = ref("");
const syncSuccess = ref(true);

// Settings
const autoSyncEnabled = ref(true);
const notifyOnRecruitingPosts = ref(false);
const notifyOnMentions = ref(false);
const lastSyncTime = ref<string | null>(null);

interface TrackedAccount {
  handle: string;
  platform: "twitter" | "instagram";
  source: string;
}

const trackedAccounts = ref<TrackedAccount[]>([]);

const twitterAccounts = computed(() =>
  trackedAccounts.value.filter((a) => a.platform === "twitter"),
);
const instagramAccounts = computed(() =>
  trackedAccounts.value.filter((a) => a.platform === "instagram"),
);
const totalPosts = computed(() => posts.value.length);

const lastSyncDisplay = computed(() => {
  if (!lastSyncTime.value) return "Never";
  const date = new Date(lastSyncTime.value);
  return date.toLocaleString();
});

const loadTrackedAccounts = async () => {
  const accounts: TrackedAccount[] = [];

  // From schools
  schools.value.forEach((school) => {
    if (school.twitter_handle) {
      accounts.push({
        handle: school.twitter_handle,
        platform: "twitter",
        source: school.name,
      });
    }
    if (school.instagram_handle) {
      accounts.push({
        handle: school.instagram_handle,
        platform: "instagram",
        source: school.name,
      });
    }
  });

  // From coaches
  coaches.value.forEach((coach) => {
    if (coach.twitter_handle) {
      accounts.push({
        handle: coach.twitter_handle,
        platform: "twitter",
        source: `${coach.first_name} ${coach.last_name}`,
      });
    }
    if (coach.instagram_handle) {
      accounts.push({
        handle: coach.instagram_handle,
        platform: "instagram",
        source: `${coach.first_name} ${coach.last_name}`,
      });
    }
  });

  trackedAccounts.value = accounts;
};

const loadSettings = async () => {
  if (!userStore.user) return;

  try {
    const response = await supabase
      .from("user_preferences")
      .select("social_sync_settings")
      .eq("user_id", userStore.user.id)
      .single();
    const { data } = response as {
      data: { social_sync_settings: any } | null;
      error: any;
    };

    if (data?.social_sync_settings) {
      autoSyncEnabled.value = data.social_sync_settings.autoSyncEnabled ?? true;
      notifyOnRecruitingPosts.value =
        data.social_sync_settings.notifyOnRecruitingPosts ?? false;
      notifyOnMentions.value =
        data.social_sync_settings.notifyOnMentions ?? false;
      lastSyncTime.value = data.social_sync_settings.lastSyncTime ?? null;
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
};

const saveSettings = async () => {
  if (!userStore.user) return;

  saving.value = true;
  try {
    const response = await (supabase.from("user_preferences") as any)
      .update({
        social_sync_settings: {
          autoSyncEnabled: autoSyncEnabled.value,
          notifyOnRecruitingPosts: notifyOnRecruitingPosts.value,
          notifyOnMentions: notifyOnMentions.value,
          lastSyncTime: lastSyncTime.value,
        },
      })
      .eq("user_id", userStore.user.id);
    const { error } = response as { error: any };

    if (error) throw error;

    syncMessage.value = "Settings saved!";
    syncSuccess.value = true;
    setTimeout(() => {
      syncMessage.value = "";
    }, 3000);
  } catch (e) {
    console.error("Failed to save settings:", e);
    syncMessage.value = "Failed to save settings";
    syncSuccess.value = false;
  } finally {
    saving.value = false;
  }
};

const syncNow = async () => {
  try {
    syncing.value = true;
    syncMessage.value = "";

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await $fetch("/api/social/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    syncSuccess.value = true;
    syncMessage.value = response.message || "Sync completed";
    lastSyncTime.value = new Date().toISOString();

    // Save last sync time
    await saveSettings();

    // Refresh posts
    await fetchPosts();

    setTimeout(() => {
      syncMessage.value = "";
    }, 5000);
  } catch (err) {
    syncSuccess.value = false;
    syncMessage.value = err instanceof Error ? err.message : "Sync failed";
  } finally {
    syncing.value = false;
  }
};

onMounted(async () => {
  loading.value = true;
  try {
    await fetchSchools();

    // Fetch coaches for all schools
    for (const school of schools.value) {
      await fetchCoaches(school.id);
    }

    await loadTrackedAccounts();
    await loadSettings();
    await fetchPosts();
  } catch (err) {
    console.error("Error loading data:", err);
  } finally {
    loading.value = false;
  }
});
</script>
