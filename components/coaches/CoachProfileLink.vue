<script setup lang="ts">
import { usePlayerProfileStore } from "~/stores/playerProfile";
import { useTrackingLink } from "~/composables/useTrackingLink";
import { useInteractions } from "~/composables/useInteractions";
import { formatPositionsShort } from "~/utils/positions/canonical";
import { toSmsHref } from "~/utils/phone";
import {
  sendProfileSubject,
  sendProfileEmailBody,
  sendProfileTextBody,
  sendProfileChannel,
} from "~/utils/sendProfile";
import type { PublicProfileData } from "~/types/models";

const props = defineProps<{
  coachId: string;
  coachEmail?: string | null;
  coachPhone?: string | null;
  coachLastName?: string | null;
  schoolId?: string | null;
}>();

const profileStore = usePlayerProfileStore();
const { createInteraction } = useInteractions();
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

// Athlete display data for the coach-facing boilerplate. Sourced from the same
// public-profile view a coach would see; fields the athlete hid come back null
// and are simply omitted (graceful, matching iOS).
const playerName = ref("");
const graduationYear = ref<number | undefined>(undefined);
const positionsShort = ref("");
const sending = ref(false);

const channel = computed(() =>
  sendProfileChannel(props.coachEmail, props.coachPhone),
);
const canSend = computed(
  () => profileStore.isPublished && channel.value !== "none",
);

onMounted(async () => {
  if (!profileStore.profile) {
    await profileStore.fetchProfile();
  }
  const slug = profileStore.profileUrl?.replace(/^\/p\//, "");
  if (!slug) return;
  try {
    const data = await $fetch<PublicProfileData>(
      `/api/public/profile/${slug}`,
    );
    playerName.value = data.playerName ?? "";
    graduationYear.value = data.academics?.graduation_year;
    positionsShort.value = formatPositionsShort(
      data.athletic?.primary_sport,
      data.athletic?.positions,
      data.athletic?.primary_position,
    );
  } catch {
    // Non-fatal: boilerplate still works with just the name/link.
  }
});

async function handleSend(kind: "email" | "text"): Promise<void> {
  if (sending.value) return;
  sending.value = true;
  try {
    if (!link.value) await generateLink();
    const url = trackingUrl.value;
    if (!url) return;

    const subject = sendProfileSubject(
      playerName.value,
      graduationYear.value,
      positionsShort.value,
    );

    if (kind === "email" && props.coachEmail) {
      const body = sendProfileEmailBody(
        playerName.value,
        props.coachLastName ?? "",
        url,
      );
      window.location.href = `mailto:${props.coachEmail}?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(body)}`;
    } else if (kind === "text" && props.coachPhone) {
      const body = sendProfileTextBody(
        playerName.value,
        graduationYear.value,
        url,
      );
      window.location.href = toSmsHref(props.coachPhone, body);
    }

    await logSend(kind, subject, url);
  } finally {
    sending.value = false;
  }
}

// Best-effort: web has no native composer to confirm the send, and
// createInteraction is player-role + family gated — a parent-sent profile
// simply won't log. Never block the mailto/sms hand-off on it.
async function logSend(
  kind: "email" | "text",
  subject: string,
  url: string,
): Promise<void> {
  try {
    await createInteraction({
      school_id: props.schoolId ?? undefined,
      coach_id: props.coachId,
      type: kind,
      direction: "outbound",
      subject,
      content: url,
      occurred_at: new Date().toISOString(),
    });
  } catch {
    // swallow — logging is best-effort
  }
}

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

      <!-- Send via email / text with boilerplate (generates a link on demand) -->
      <div v-if="canSend" class="flex gap-2 pt-1">
        <button
          v-if="channel === 'email' || channel === 'both'"
          class="px-3 py-2 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50"
          :disabled="sending"
          @click="handleSend('email')"
        >
          Email profile
        </button>
        <button
          v-if="channel === 'text' || channel === 'both'"
          class="px-3 py-2 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50"
          :disabled="sending"
          @click="handleSend('text')"
        >
          Text profile
        </button>
      </div>

      <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
    </template>
  </div>
</template>
