<!-- components/profile/public/ProfileHero.vue -->
<script setup lang="ts">
import { computed } from "vue";
import type { PublicProfileData } from "~/types/models";
import { buildSocialLinks } from "~/utils/profile/socialLinks";
import { formatPositionsShort } from "~/utils/positions/canonical";
import SocialIcon from "~/components/profile/public/SocialIcon.vue";

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
  // Coach-facing position shorthand, e.g. "3B/2B".
  const posShort = formatPositionsShort(
    a?.primary_sport,
    a?.positions,
    a?.primary_position,
  );
  if (posShort) parts.push(posShort);
  if (props.data.academics?.graduation_year) {
    parts.push(`Class of ${props.data.academics.graduation_year}`);
  }
  if (props.data.academics?.gpa != null) {
    parts.push(`${props.data.academics.gpa.toFixed(2)} GPA`);
  }
  return parts;
});

const socialLinks = computed(() => buildSocialLinks(props.data.social));
</script>

<template>
  <header class="bg-brand-slate-900 text-white">
    <!-- Coach-header strip (Figma node 5:7): brand left, verified badge right -->
    <div
      class="flex items-center justify-between border-b border-white/10 px-6 py-3 sm:px-10"
    >
      <div class="flex items-center gap-2">
        <UIcon
          name="i-heroicons-viewfinder-circle"
          class="h-5 w-5"
          aria-hidden="true"
        />
        <span class="text-sm font-semibold tracking-tight">RecruitingCompass</span>
      </div>
      <span
        class="inline-flex items-center gap-1.5 rounded-full bg-brand-emerald-900/40 px-3 py-1 text-xs font-medium text-brand-emerald-300 ring-1 ring-brand-emerald-700/50"
      >
        <span
          class="h-1.5 w-1.5 rounded-full bg-brand-emerald-400"
          aria-hidden="true"
        />
        Verified Coach Access
      </span>
    </div>

    <!-- Hero body -->
    <div class="px-6 py-8 sm:px-10 sm:py-10">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-start">
        <img
          v-if="data.photoUrl"
          :src="data.photoUrl"
          :alt="`${data.playerName} profile photo`"
          class="h-28 w-28 shrink-0 rounded-full object-cover ring-2 ring-white/20 sm:h-32 sm:w-32"
        />
        <div
          v-else
          class="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-brand-slate-700 text-3xl font-semibold ring-2 ring-white/20 sm:h-32 sm:w-32"
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

          <p v-if="physicals.length" class="mt-2 text-sm text-brand-slate-300">
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
            class="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brand-slate-300"
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
                <SocialIcon :platform="link.platform" class="h-4 w-4" />
                {{ link.handle }}
              </a>
            </template>
          </div>
        </div>

        <!-- Actions: Contact (secondary, outline-on-dark) over Express (primary) -->
        <div class="flex shrink-0 flex-col gap-3 sm:w-48">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 focus:ring-2 focus:ring-white/40 focus:outline-none"
            @click="$emit('contact')"
          >
            <UIcon name="i-heroicons-envelope" class="h-4 w-4" aria-hidden="true" />
            Contact Player
          </button>
          <button
            type="button"
            :disabled="interestSent"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-blue-700 focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 focus:ring-offset-brand-slate-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            @click="$emit('interest')"
          >
            <UIcon name="i-heroicons-star" class="h-4 w-4" aria-hidden="true" />
            {{ interestSent ? "Interest Sent" : "Express Interest" }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
