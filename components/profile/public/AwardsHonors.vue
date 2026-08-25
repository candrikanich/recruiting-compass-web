<!-- components/profile/public/AwardsHonors.vue -->
<script setup lang="ts">
import type { ProfileAward } from "~/types/models";

defineProps<{ awards: ProfileAward[] }>();
</script>

<template>
  <section v-if="awards.length">
    <h2 class="mb-3 text-sm font-semibold text-brand-slate-900">
      Awards &amp; Honors
    </h2>
    <div class="flex flex-wrap gap-1.5">
      <DSBadge
        v-for="(award, idx) in awards"
        :key="`${award.title}-${idx}`"
        color="orange"
        variant="light"
      >
        {{ award.title }}<span v-if="award.year"> · {{ award.year }}</span>
      </DSBadge>
    </div>
  </section>
</template>
