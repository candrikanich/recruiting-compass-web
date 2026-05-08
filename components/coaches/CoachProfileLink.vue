<script setup lang="ts">
import { usePlayerProfileStore } from "~/stores/playerProfile";
import { useTrackingLink } from "~/composables/useTrackingLink";

const props = defineProps<{ coachId: string }>();

const profileStore = usePlayerProfileStore();
const {
  link,
  loading,
  loadError,
  error,
  copied,
  trackingUrl,
  generateLink,
  copyLink,
} = useTrackingLink(computed(() => props.coachId));

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
</script>

<template>
  <div class="rounded-xl border border-gray-100 p-4 space-y-3">
    <h3 class="text-sm font-semibold text-gray-700">Send Recruiting Profile</h3>

    <div v-if="loading" class="text-sm text-gray-400">Loading…</div>

    <template v-else>
      <p v-if="loadError" class="text-xs text-red-500">{{ loadError }}</p>

      <!-- Has existing link -->
      <div v-else-if="link" class="space-y-3">
        <p
          v-if="!profileStore.profile?.is_published"
          class="text-xs text-amber-600"
        >
          ⚠️ Your profile is unpublished. Coaches who click this link will see a
          "not available" message.
        </p>
        <div class="flex gap-2">
          <code
            class="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 truncate"
          >
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
          <span
            >{{ link.view_count }} view{{
              link.view_count !== 1 ? "s" : ""
            }}</span
          >
          <span>Last viewed: {{ formatDate(link.last_viewed_at) }}</span>
        </div>
      </div>

      <!-- No link yet -->
      <div v-else class="space-y-2">
        <p class="text-xs text-gray-500">
          Generate a personalized profile link to share with this coach. You'll
          see when they view it.
        </p>
        <button
          class="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
          :disabled="loading"
          @click="generateLink"
        >
          Generate profile link
        </button>
        <p
          v-if="!profileStore.profile?.is_published"
          class="text-xs text-amber-600"
        >
          ⚠️ Your profile is not published. Coaches who click this link will see
          a "not available" message.
        </p>
      </div>

      <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
    </template>
  </div>
</template>
