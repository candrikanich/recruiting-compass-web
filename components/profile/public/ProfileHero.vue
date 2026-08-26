<!-- components/profile/public/ProfileHero.vue -->
<script setup lang="ts">
import { computed } from "vue";
import type { PublicProfileData } from "~/types/models";
import { buildSocialLinks } from "~/utils/profile/socialLinks";

const props = withDefaults(
  defineProps<{ data: PublicProfileData; interestSent?: boolean }>(),
  { interestSent: false },
);

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

const socialLinks = computed(() => buildSocialLinks(props.data.social));
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
        class="h-32 w-32 shrink-0 rounded-2xl object-cover ring-2 ring-white/20 sm:h-36 sm:w-36"
      />
      <div
        v-else
        class="flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl bg-brand-slate-700 text-3xl font-semibold ring-2 ring-white/20 sm:h-36 sm:w-36"
        aria-hidden="true"
      >
        {{ data.playerName.charAt(0) }}
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
            {{ data.playerName }}
          </h1>
          <DesignSystemBadge
            v-if="data.athletic?.primary_sport"
            color="blue"
            variant="solid"
          >
            {{ data.athletic.primary_sport }}
          </DesignSystemBadge>
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

        <div
          v-if="socialLinks.length"
          class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brand-slate-300"
        >
          <template v-for="(link, i) in socialLinks" :key="link.platform">
            <span v-if="i > 0" aria-hidden="true" class="text-brand-slate-500"
              >·</span
            >
            <a
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 hover:text-white"
            >
              <UIcon :name="link.icon" class="h-4 w-4" aria-hidden="true" />
              {{ link.handle }}
            </a>
          </template>
        </div>

      </div>

      <div
        class="flex shrink-0 flex-col gap-3 sm:w-44"
      >
        <DesignSystemButton
          color="blue"
          variant="solid"
          full-width
          @click="$emit('contact')"
        >
          Contact Player
        </DesignSystemButton>
        <DesignSystemButton
          color="slate"
          variant="outline"
          full-width
          :disabled="interestSent"
          @click="$emit('interest')"
        >
          {{ interestSent ? "Interest Sent" : "Express Interest" }}
        </DesignSystemButton>
      </div>
    </div>
  </header>
</template>
