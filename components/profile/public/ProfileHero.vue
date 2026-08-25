<!-- components/profile/public/ProfileHero.vue -->
<script setup lang="ts">
import { computed } from "vue";
import type { PublicProfileData } from "~/types/models";

const props = defineProps<{ data: PublicProfileData }>();

defineEmits<{ contact: []; interest: [] }>();

function formatHeight(inches: number | undefined): string | null {
  if (!inches) return null;
  const ft = Math.floor(inches / 12);
  const inn = inches % 12;
  return `${ft}'${inn}"`;
}

const heightLabel = computed(() =>
  formatHeight(props.data.athletic?.height_inches),
);

const physicals = computed(() => {
  const a = props.data.athletic;
  const parts: string[] = [];
  if (heightLabel.value) parts.push(heightLabel.value);
  if (a?.weight_lbs) parts.push(`${a.weight_lbs} lbs`);
  const posPieces: string[] = [];
  if (a?.primary_position) posPieces.push(a.primary_position);
  if (props.data.jerseyNumber != null)
    posPieces.push(`#${props.data.jerseyNumber}`);
  if (posPieces.length) parts.push(posPieces.join("/"));
  if (props.data.academics?.graduation_year) {
    parts.push(`Class of ${props.data.academics.graduation_year}`);
  }
  if (props.data.academics?.gpa != null) {
    parts.push(`GPA ${props.data.academics.gpa.toFixed(2)}`);
  }
  return parts;
});
</script>

<template>
  <header class="bg-brand-slate-900 px-6 py-10 text-white sm:px-10">
    <div
      class="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-start"
    >
      <img
        v-if="data.photoUrl"
        :src="data.photoUrl"
        :alt="`${data.playerName} profile photo`"
        class="h-24 w-24 shrink-0 rounded-full object-cover ring-2 ring-white/20"
      />
      <div
        v-else
        class="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-brand-slate-700 text-2xl font-semibold ring-2 ring-white/20"
        aria-hidden="true"
      >
        {{ data.playerName.charAt(0) }}
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
            {{ data.playerName }}
          </h1>
          <DSBadge
            v-if="data.athletic?.primary_sport"
            color="blue"
            variant="solid"
          >
            {{ data.athletic.primary_sport }}
          </DSBadge>
        </div>

        <p
          v-if="physicals.length"
          class="mt-2 text-sm text-brand-slate-300"
        >
          {{ physicals.join(" · ") }}
        </p>

        <p
          v-if="data.bio"
          class="mt-4 max-w-2xl text-sm leading-relaxed text-brand-slate-200"
        >
          {{ data.bio }}
        </p>

        <div class="mt-6 flex flex-wrap items-center gap-3">
          <DSButton color="blue" variant="solid" @click="$emit('contact')">
            Contact Player
          </DSButton>
          <DSButton color="slate" variant="outline" @click="$emit('interest')">
            Express Interest
          </DSButton>
          <span
            class="inline-flex items-center gap-1.5 rounded-full bg-brand-emerald-900/40 px-3 py-1 text-xs font-medium text-brand-emerald-300 ring-1 ring-brand-emerald-700/50"
          >
            Verified Coach Access
          </span>
        </div>
      </div>
    </div>
  </header>
</template>
