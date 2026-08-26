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
import { buildSocialLinks } from "~/utils/profile/socialLinks";
import SocialIcon from "~/components/profile/public/SocialIcon.vue";

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

// Figma pairs Academic Profile + Target Program & Values into one two-column
// row. When both are visible the pair renders together at the academics slot,
// and the standalone `values` entry is skipped so it isn't drawn twice.
const academicsVisible = computed(() =>
  visibleSections.value.some((s) => s.key === "academics"),
);
const valuesVisible = computed(() =>
  visibleSections.value.some((s) => s.key === "values"),
);

// Team History + Awards likewise pair into a two-column row to cut the
// full-width whitespace/scroll. Awards renders at the team_history slot when
// both are visible and is skipped standalone below.
const teamHistoryVisible = computed(() =>
  visibleSections.value.some((s) => s.key === "team_history"),
);
const awardsVisible = computed(() =>
  visibleSections.value.some((s) => s.key === "awards"),
);

const footerSocials = computed(() => buildSocialLinks(props.data.social));

const lastUpdated = computed(() => {
  if (!props.data.updatedAt) return null;
  const d = new Date(props.data.updatedAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

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
        <!-- Academics + Target render as a paired two-column row (Figma). When
             values is also visible it is drawn here and skipped below. -->
        <div
          v-else-if="section.key === 'academics'"
          class="grid grid-cols-1 gap-6"
          :class="{ 'md:grid-cols-2 md:items-start': valuesVisible }"
        >
          <AcademicPanel
            :academics="data.academics"
            :ncaa-id="data.athletic?.ncaa_id"
          />
          <TargetProgramValues
            v-if="valuesVisible"
            :looking-for="data.lookingFor"
            :values-tags="data.valuesTags"
          />
        </div>
        <TargetProgramValues
          v-else-if="section.key === 'values' && !academicsVisible"
          :looking-for="data.lookingFor"
          :values-tags="data.valuesTags"
        />
        <!-- Team History + Awards render as a paired two-column row. When
             awards is also visible it is drawn here and skipped below. -->
        <div
          v-else-if="section.key === 'team_history'"
          class="grid grid-cols-1 gap-6"
          :class="{ 'md:grid-cols-2 md:items-start': awardsVisible }"
        >
          <TeamHistoryPanel :entries="data.teamHistory" />
          <AwardsHonors v-if="awardsVisible" :awards="data.awards" />
        </div>
        <AwardsHonors
          v-else-if="section.key === 'awards' && !teamHistoryVisible"
          :awards="data.awards"
        />
      </template>
    </div>

    <footer class="border-t border-gray-100 bg-gray-50 px-6 py-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <a
          href="/"
          class="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          <UIcon
            name="i-heroicons-viewfinder-circle"
            class="h-4 w-4"
            aria-hidden="true"
          />
          Powered by The Recruiting Compass
        </a>
        <div v-if="footerSocials.length" class="flex items-center gap-3">
          <a
            v-for="link in footerSocials"
            :key="link.platform"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="link.platform"
            class="text-gray-400 hover:text-gray-600"
          >
            <SocialIcon :platform="link.platform" class="h-4 w-4" />
          </a>
        </div>
      </div>
      <p v-if="lastUpdated" class="mt-3 text-xs text-gray-400">
        Profile last updated: {{ lastUpdated }}
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
