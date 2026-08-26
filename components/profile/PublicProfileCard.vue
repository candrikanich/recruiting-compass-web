<!-- components/profile/PublicProfileCard.vue -->
<script setup lang="ts">
import { computed } from "vue";
import type { PublicProfileData } from "~/types/models";
import ProfileHero from "~/components/profile/public/ProfileHero.vue";
import MetricsGrid from "~/components/profile/public/MetricsGrid.vue";
import HighlightsReel from "~/components/profile/public/HighlightsReel.vue";
import AcademicPanel from "~/components/profile/public/AcademicPanel.vue";
import TargetProgramValues from "~/components/profile/public/TargetProgramValues.vue";
import TeamHistoryPanel from "~/components/profile/public/TeamHistoryPanel.vue";
import AwardsHonors from "~/components/profile/public/AwardsHonors.vue";

const props = defineProps<{ data: PublicProfileData }>();

defineEmits<{ contact: []; interest: [] }>();

// section_config (owner-ordered, owner-visible) drives what renders below the
// hero — a hidden section stays entirely off the page even though the API
// response still carries its data.
const visibleSections = computed(() =>
  props.data.sections.filter((s) => s.visible),
);
</script>

<template>
  <article
    class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
  >
    <ProfileHero
      :data="data"
      @contact="$emit('contact')"
      @interest="$emit('interest')"
    />

    <div class="space-y-6 px-6 py-6">
      <template v-for="section in visibleSections" :key="section.key">
        <MetricsGrid
          v-if="section.key === 'metrics'"
          :metrics="data.metrics ?? []"
          :athletic="data.athletic"
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
  </article>
</template>
