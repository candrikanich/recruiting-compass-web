<!-- components/profile/PublicProfileCard.vue -->
<script setup lang="ts">
import { computed, ref } from "vue";
import type { PublicProfileData } from "~/types/models";
import ProfileHero from "~/components/profile/public/ProfileHero.vue";
import MetricsGrid from "~/components/profile/public/MetricsGrid.vue";
import HighlightsReel from "~/components/profile/public/HighlightsReel.vue";
import AcademicPanel from "~/components/profile/public/AcademicPanel.vue";
import TargetProgramValues from "~/components/profile/public/TargetProgramValues.vue";
import TeamHistoryPanel from "~/components/profile/public/TeamHistoryPanel.vue";
import AwardsHonors from "~/components/profile/public/AwardsHonors.vue";
import ContactPlayerModal from "~/components/profile/public/ContactPlayerModal.vue";

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
</script>

<template>
  <article
    class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
  >
    <ProfileHero
      :data="data"
      @contact="handleContact"
      @interest="$emit('interest')"
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
  </article>
</template>
