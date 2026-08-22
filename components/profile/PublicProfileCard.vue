<!-- components/profile/PublicProfileCard.vue -->
<script setup lang="ts">
import { computed } from "vue";
import type { PublicProfileData } from "~/types/models";
import { formatPositionsShort } from "~/utils/positions/canonical";
import { buildPrepBaseballUrl } from "~/utils/recruitingLinks";
import {
  openTwitter,
  openInstagram,
  openTikTok,
  openFacebook,
} from "~/utils/socialMediaHandlers";

const props = withDefaults(defineProps<{ profile: PublicProfileData }>(), {});

const socialLinks = computed(() => {
  const s = props.profile.social;
  if (!s) return [];
  const links: Array<{ label: string; display: string; open: () => void }> = [];
  if (s.twitter_handle) {
    const h = s.twitter_handle;
    links.push({ label: "Twitter", display: h, open: () => openTwitter(h) });
  }
  if (s.instagram_handle) {
    const h = s.instagram_handle;
    links.push({ label: "Instagram", display: h, open: () => openInstagram(h) });
  }
  if (s.tiktok_handle) {
    const h = s.tiktok_handle;
    links.push({ label: "TikTok", display: h, open: () => openTikTok(h) });
  }
  if (s.facebook_url) {
    const u = s.facebook_url;
    links.push({ label: "Facebook", display: u, open: () => openFacebook(u) });
  }
  return links;
});

// Coach-facing primary/secondary from the athlete's ENTERED, ordered
// positions[] (abbreviated "3B/SS"); the stale primary_position string is only
// a fallback for pre-ordering accounts.
const primaryPositionLabel = computed(() =>
  formatPositionsShort(
    props.profile.athletic?.primary_sport,
    props.profile.athletic?.positions,
    props.profile.athletic?.primary_position,
  ),
);

const prepBaseballUrl = computed(() =>
  buildPrepBaseballUrl(
    props.profile.athletic?.prep_baseball_state,
    props.profile.athletic?.prep_baseball_id,
  ),
);

const HEADER_GRADIENTS: Record<string, string> = {
  slate: "bg-gradient-to-br from-slate-800 to-slate-700",
  blue: "bg-gradient-to-br from-blue-800 to-blue-700",
  indigo: "bg-gradient-to-br from-indigo-800 to-indigo-700",
  violet: "bg-gradient-to-br from-violet-800 to-violet-700",
  rose: "bg-gradient-to-br from-rose-800 to-rose-700",
  amber: "bg-gradient-to-br from-amber-700 to-amber-600",
  emerald: "bg-gradient-to-br from-emerald-800 to-emerald-700",
  teal: "bg-gradient-to-br from-teal-800 to-teal-700",
};

function formatHeight(inches: number | undefined): string {
  if (!inches) return "—";
  const ft = Math.floor(inches / 12);
  const inn = inches % 12;
  return `${ft}'${inn}"`;
}

function formatGPA(gpa: number | undefined): string {
  return gpa?.toFixed(2) ?? "—";
}
</script>

<template>
  <article
    class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
  >
    <!-- Header -->
    <header
      class="px-6 py-8 text-white"
      :class="HEADER_GRADIENTS[profile.headerColor] ?? HEADER_GRADIENTS.slate"
    >
      <div class="flex items-center gap-5">
        <img
          v-if="profile.photoUrl"
          :src="profile.photoUrl"
          :alt="`${profile.playerName} profile photo`"
          class="w-20 h-20 rounded-full object-cover ring-2 ring-white/20 shrink-0"
        />
        <div>
          <h1 class="text-3xl font-bold tracking-tight">
            {{ profile.playerName }}
          </h1>
          <p
            v-if="profile.athletic?.primary_sport"
            class="mt-1 text-slate-300 text-sm"
          >
            {{ profile.athletic.primary_sport }}
            <span v-if="primaryPositionLabel">
              · {{ primaryPositionLabel }}</span
            >
          </p>
          <p
            v-if="profile.bio"
            class="mt-3 text-slate-200 text-sm leading-relaxed"
          >
            {{ profile.bio }}
          </p>
        </div>
      </div>
    </header>

    <div class="divide-y divide-gray-100">
      <!-- Athletic Stats -->
      <section
        v-if="
          profile.athletic &&
          (profile.athletic.primary_sport ||
            profile.athletic.positions?.length ||
            profile.athletic.height_inches ||
            profile.athletic.weight_lbs)
        "
        class="px-6 py-5"
      >
        <h2
          class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3"
        >
          Athletic Profile
        </h2>
        <div v-if="profile.athletic.positions?.length" class="mb-3">
          <p class="text-xs text-gray-400 mb-1.5">Positions</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="pos in profile.athletic.positions"
              :key="pos"
              class="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium"
              >{{ pos }}</span
            >
          </div>
        </div>
        <dl class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div
            v-if="profile.athletic.height_inches"
            class="flex justify-between"
          >
            <dt class="text-gray-500">Height</dt>
            <dd class="font-medium text-gray-900">
              {{ formatHeight(profile.athletic.height_inches) }}
            </dd>
          </div>
          <div v-if="profile.athletic.weight_lbs" class="flex justify-between">
            <dt class="text-gray-500">Weight</dt>
            <dd class="font-medium text-gray-900">
              {{ profile.athletic.weight_lbs }} lbs
            </dd>
          </div>
        </dl>
      </section>

      <!-- Film Links -->
      <section v-if="profile.film?.length" class="px-6 py-5">
        <h2
          class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3"
        >
          Film
        </h2>
        <ul class="space-y-2">
          <li v-for="link in profile.film" :key="link.url">
            <a
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <span class="capitalize">{{ link.platform }}</span>
              <span v-if="link.title" class="text-gray-500"
                >— {{ link.title }}</span
              >
            </a>
          </li>
        </ul>
      </section>

      <!-- Academic Stats -->
      <section
        v-if="
          profile.academics &&
          (profile.academics.gpa ||
            profile.academics.graduation_year ||
            profile.academics.sat_score ||
            profile.academics.act_score ||
            profile.academics.high_school)
        "
        class="px-6 py-5"
      >
        <h2
          class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3"
        >
          Academics
        </h2>
        <dl class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div v-if="profile.academics.gpa" class="flex justify-between">
            <dt class="text-gray-500">GPA</dt>
            <dd class="font-medium text-gray-900">
              {{ formatGPA(profile.academics.gpa) }}
            </dd>
          </div>
          <div
            v-if="profile.academics.graduation_year"
            class="flex justify-between"
          >
            <dt class="text-gray-500">Grad Year</dt>
            <dd class="font-medium text-gray-900">
              {{ profile.academics.graduation_year }}
            </dd>
          </div>
          <div v-if="profile.academics.sat_score" class="flex justify-between">
            <dt class="text-gray-500">SAT</dt>
            <dd class="font-medium text-gray-900">
              {{ profile.academics.sat_score }}
            </dd>
          </div>
          <div v-if="profile.academics.act_score" class="flex justify-between">
            <dt class="text-gray-500">ACT</dt>
            <dd class="font-medium text-gray-900">
              {{ profile.academics.act_score }}
            </dd>
          </div>
          <div
            v-if="profile.academics.high_school"
            class="col-span-2 flex justify-between"
          >
            <dt class="text-gray-500">High School</dt>
            <dd class="font-medium text-gray-900">
              {{ profile.academics.high_school }}
            </dd>
          </div>
        </dl>
        <div v-if="profile.academics.core_courses?.length" class="mt-3">
          <p class="text-xs text-gray-400 mb-1">Core Courses</p>
          <p class="text-sm text-gray-700">
            {{ profile.academics.core_courses.join(", ") }}
          </p>
        </div>
      </section>

      <!-- Social -->
      <section v-if="socialLinks.length" class="px-6 py-5">
        <h2
          class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3"
        >
          Social
        </h2>
        <dl class="space-y-1.5 text-sm">
          <div
            v-for="item in socialLinks"
            :key="item.label"
            class="flex justify-between"
          >
            <dt class="text-gray-500">{{ item.label }}</dt>
            <dd class="font-medium">
              <button
                type="button"
                class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                :aria-label="`Open ${item.label} profile ${item.display}`"
                @click="item.open"
              >
                {{ item.display }}
                <svg
                  class="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M14 5h5m0 0v5m0-5L10 14M9 5H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4"
                  />
                </svg>
              </button>
            </dd>
          </div>
        </dl>
      </section>

      <!-- Recruiting Database IDs -->
      <section
        v-if="
          profile.athletic &&
          (profile.athletic.ncaa_id ||
            profile.athletic.perfect_game_id ||
            prepBaseballUrl)
        "
        class="px-6 py-5"
      >
        <h2
          class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3"
        >
          Recruiting IDs
        </h2>
        <dl class="space-y-1.5 text-sm">
          <div v-if="profile.athletic.ncaa_id" class="flex justify-between">
            <dt class="text-gray-500">NCAA ID</dt>
            <dd class="font-mono font-medium text-gray-900">
              {{ profile.athletic.ncaa_id }}
            </dd>
          </div>
          <div
            v-if="profile.athletic.perfect_game_id"
            class="flex justify-between"
          >
            <dt class="text-gray-500">Perfect Game</dt>
            <dd class="font-medium">
              <a
                :href="`https://www.perfectgame.org/Players/Playerprofile.aspx?ID=${profile.athletic.perfect_game_id}`"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:text-blue-800 hover:underline font-mono"
                >{{ profile.athletic.perfect_game_id }}</a
              >
            </dd>
          </div>
          <div v-if="prepBaseballUrl" class="flex justify-between">
            <dt class="text-gray-500">Prep Baseball</dt>
            <dd class="font-medium">
              <a
                :href="prepBaseballUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:text-blue-800 hover:underline font-mono"
                >View profile</a
              >
            </dd>
          </div>
        </dl>
      </section>
    </div>

    <!-- Footer -->
    <footer class="px-6 py-4 bg-gray-50 text-center">
      <p class="text-xs text-gray-400">
        Recruiting profile powered by
        <a href="/" class="text-gray-500 hover:text-gray-700"
          >The Recruiting Compass</a
        >
      </p>
    </footer>
  </article>
</template>
