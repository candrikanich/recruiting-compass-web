<script setup lang="ts">
import { useAuthFetch } from "~/composables/useAuthFetch";
import { usePlayerProfileStore } from "~/stores/playerProfile";

const props = defineProps<{ coachId: string }>();

const { $fetchAuth } = useAuthFetch();
const profileStore = usePlayerProfileStore();

// Ensure profile is loaded so we can show the URL and unpublished warning
if (!profileStore.profile && !profileStore.loading) {
  profileStore.fetchProfile();
}

const link = ref<{
  ref_token: string;
  view_count: number;
  last_viewed_at: string | null;
} | null>(null);

const loading = ref(false);
const copied = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  loading.value = true;
  try {
    const data = await $fetchAuth<typeof link.value>(
      `/api/player/profile/tracking-links/${props.coachId}`
    );
    link.value = data;
  } catch {
    // No link yet — that's fine
  } finally {
    loading.value = false;
  }
});

async function generateLink() {
  loading.value = true;
  error.value = null;
  try {
    const data = await $fetchAuth<typeof link.value>(
      `/api/player/profile/tracking-links/${props.coachId}`,
      { method: "POST" }
    );
    link.value = data;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to generate link";
  } finally {
    loading.value = false;
  }
}

const trackingUrl = computed(() => {
  if (!link.value || !profileStore.profileUrl) return null;
  const base = import.meta.client ? `${window.location.origin}${profileStore.profileUrl}` : profileStore.profileUrl;
  return `${base}?ref=${link.value.ref_token}`;
});

async function copyLink() {
  if (!trackingUrl.value) return;
  await navigator.clipboard.writeText(trackingUrl.value);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
</script>

<template>
  <div class="rounded-xl border border-gray-100 p-4 space-y-3">
    <h3 class="text-sm font-semibold text-gray-700">Send Recruiting Profile</h3>

    <div v-if="loading" class="text-sm text-gray-400">Loading…</div>

    <template v-else>
      <!-- Has existing link -->
      <div v-if="link" class="space-y-3">
        <p v-if="!profileStore.profile?.is_published" class="text-xs text-amber-600">
          ⚠️ Your profile is unpublished. Coaches who click this link will see a "not available" message.
        </p>
        <div class="flex gap-2">
          <code class="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 truncate">
            {{ trackingUrl }}
          </code>
          <button
            class="px-3 py-2 text-xs bg-gray-800 text-white rounded-lg hover:bg-gray-700 whitespace-nowrap"
            @click="copyLink"
          >
            {{ copied ? "Copied!" : "Copy link" }}
          </button>
        </div>
        <div class="flex gap-4 text-xs text-gray-400">
          <span>{{ link.view_count }} view{{ link.view_count !== 1 ? "s" : "" }}</span>
          <span>Last viewed: {{ formatDate(link.last_viewed_at) }}</span>
        </div>
      </div>

      <!-- No link yet -->
      <div v-else class="space-y-2">
        <p class="text-xs text-gray-500">
          Generate a personalized profile link to share with this coach. You'll see when they view it.
        </p>
        <button
          class="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
          :disabled="loading"
          @click="generateLink"
        >
          Generate profile link
        </button>
        <p v-if="!profileStore.profile?.is_published" class="text-xs text-amber-600">
          ⚠️ Your profile is not published. Coaches who click this link will see a "not available" message.
        </p>
      </div>

      <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
    </template>
  </div>
</template>
