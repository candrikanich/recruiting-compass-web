<!-- components/profile/public/AwardsHonors.vue -->
<script setup lang="ts">
import type { ProfileAward } from "~/types/models";
import SectionHeader from "~/components/profile/public/SectionHeader.vue";

defineProps<{ awards: ProfileAward[] }>();
</script>

<template>
  <section v-if="awards.length">
    <SectionHeader icon="i-heroicons-trophy" title="Awards & Athletic Honors" />
    <div class="flex flex-wrap gap-2">
      <span
        v-for="(award, idx) in awards"
        :key="`${award.title}-${idx}`"
        class="inline-flex items-center gap-1.5 rounded-full bg-brand-orange-100 px-3 py-1.5 text-sm font-medium text-brand-orange-800"
      >
        <UIcon
          name="i-heroicons-trophy"
          class="h-3.5 w-3.5 shrink-0 text-brand-orange-600"
          aria-hidden="true"
        />
        {{ award.title }}<span v-if="award.year"> · {{ award.year }}</span>
      </span>
    </div>
  </section>
</template>
