<!-- components/profile/PublicProfileCard.vue -->
<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import type { PublicProfileData } from "~/types/models";
import ProfileHero from "~/components/profile/public/ProfileHero.vue";
import MetricsGrid from "~/components/profile/public/MetricsGrid.vue";
import HighlightsReel from "~/components/profile/public/HighlightsReel.vue";
import AcademicPanel from "~/components/profile/public/AcademicPanel.vue";
import TargetProgramValues from "~/components/profile/public/TargetProgramValues.vue";
import TeamHistoryPanel from "~/components/profile/public/TeamHistoryPanel.vue";
import AwardsHonors from "~/components/profile/public/AwardsHonors.vue";
import ContactPlayerModal from "~/components/profile/public/ContactPlayerModal.vue";
import ExpressInterestPopover from "~/components/profile/public/ExpressInterestPopover.vue";

// `slug` is optional because the owner-side live preview (ProfileLivePreview)
// renders this card before the profile has a real public URL.
const props = defineProps<{ data: PublicProfileData; slug?: string }>();

const emit = defineEmits<{ contact: []; interest: [] }>();

// section_config (owner-ordered, owner-visible) drives what renders below the
// hero — a hidden section stays entirely off the page even though the API
// response still carries its data.
const visibleSections = computed(() =>
  props.data.sections.filter((s) => s.visible),
);

// The public page deliberately hides the player's target schools (Phase 2
// decision) — the modal always falls back to its free-text school field.
const showContactModal = ref(false);

function handleContact() {
  emit("contact");
  // No real slug to submit against (e.g. owner live preview) — don't open a
  // form that can't actually send.
  if (!props.slug) return;
  showContactModal.value = true;
}

function closeContactModal() {
  showContactModal.value = false;
}

// Express Interest mirrors the Contact flow above, plus a persisted "sent"
// state so the hero button reflects a prior submission across reloads.
const showInterestPopover = ref(false);
const interestSent = ref(false);

function interestSentKey(slug: string): string {
  return `interest-sent:${slug}`;
}

onMounted(() => {
  if (!props.slug) return;
  try {
    interestSent.value =
      window.localStorage.getItem(interestSentKey(props.slug)) === "true";
  } catch {
    // Storage unavailable (private mode, SSR hydration edge case) — the
    // server remains the source of truth, so just skip the UX shortcut.
  }
});

// Programs offered to the popover derive from the athlete's public sport +
// positions — null-safe since `athletic` is null when that section is
// hidden, in which case the popover falls back to its free-text input.
const interestPrograms = computed(() => {
  const a = props.data.athletic;
  const values = [a?.primary_sport, ...(a?.positions ?? [])].filter(
    (v): v is string => !!v,
  );
  return [...new Set(values)];
});

function handleInterest() {
  emit("interest");
  if (!props.slug) return;
  showInterestPopover.value = true;
}

function closeInterestPopover() {
  showInterestPopover.value = false;
}

function onInterestSubmitted() {
  interestSent.value = true;
  if (!props.slug) return;
  try {
    window.localStorage.setItem(interestSentKey(props.slug), "true");
  } catch {
    // Best-effort persistence only — a failed write just means the button
    // re-enables on the next visit; it doesn't block the confirmation UX.
  }
}
</script>

<template>
  <article
    class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
  >
    <ProfileHero
      :data="data"
      :interest-sent="interestSent"
      @contact="handleContact"
      @interest="handleInterest"
    />

    <div class="space-y-6 px-6 py-6">
      <template v-for="section in visibleSections" :key="section.key">
        <MetricsGrid
          v-if="section.key === 'metrics'"
          :metrics="data.metrics ?? []"
          :athletic="data.athletic"
          :player-name="data.playerName"
        />
        <HighlightsReel v-else-if="section.key === 'film'" :film="data.film" />
        <AcademicPanel
          v-else-if="section.key === 'academics'"
          :academics="data.academics"
          :ncaa-id="data.athletic?.ncaa_id"
        />
        <TargetProgramValues
          v-else-if="section.key === 'values'"
          :looking-for="data.lookingFor"
          :values-tags="data.valuesTags"
        />
        <TeamHistoryPanel
          v-else-if="section.key === 'team_history'"
          :entries="data.teamHistory"
        />
        <AwardsHonors v-else-if="section.key === 'awards'" :awards="data.awards" />
      </template>
    </div>

    <footer class="bg-gray-50 px-6 py-4 text-center">
      <p class="text-xs text-gray-400">
        Powered by
        <a href="/" class="text-gray-500 hover:text-gray-700"
          >The Recruiting Compass</a
        >
      </p>
    </footer>

    <ContactPlayerModal
      v-if="showContactModal && slug"
      :slug="slug"
      :player-name="data.playerName"
      @close="closeContactModal"
    />

    <ExpressInterestPopover
      v-if="showInterestPopover && slug"
      :slug="slug"
      :player-name="data.playerName"
      :programs="interestPrograms"
      @close="closeInterestPopover"
      @submitted="onInterestSubmitted"
    />
  </article>
</template>
