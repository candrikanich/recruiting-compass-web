<!-- components/profile/PublicProfileCard.vue -->
<script setup lang="ts">
import type { PublicProfileData } from "~/types/models";

withDefaults(
  defineProps<{ profile: PublicProfileData }>(),
  {}
);

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
  <article class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

    <!-- Header -->
    <header class="bg-gradient-to-br from-slate-800 to-slate-700 px-6 py-8 text-white">
      <h1 class="text-3xl font-bold tracking-tight">{{ profile.playerName }}</h1>
      <p v-if="profile.athletic?.primary_sport" class="mt-1 text-slate-300 text-sm">
        {{ profile.athletic.primary_sport }}
        <span v-if="profile.athletic.primary_position"> · {{ profile.athletic.primary_position }}</span>
      </p>
      <p v-if="profile.bio" class="mt-3 text-slate-200 text-sm leading-relaxed">{{ profile.bio }}</p>
    </header>

    <div class="divide-y divide-gray-100">

      <!-- Athletic Stats -->
      <section v-if="profile.athletic" class="px-6 py-5">
        <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Athletic Profile</h2>
        <dl class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div v-if="profile.athletic.height_inches" class="flex justify-between">
            <dt class="text-gray-500">Height</dt>
            <dd class="font-medium text-gray-900">{{ formatHeight(profile.athletic.height_inches) }}</dd>
          </div>
          <div v-if="profile.athletic.weight_lbs" class="flex justify-between">
            <dt class="text-gray-500">Weight</dt>
            <dd class="font-medium text-gray-900">{{ profile.athletic.weight_lbs }} lbs</dd>
          </div>
        </dl>
      </section>

      <!-- Academic Stats -->
      <section v-if="profile.academics" class="px-6 py-5">
        <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Academics</h2>
        <dl class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div v-if="profile.academics.gpa" class="flex justify-between">
            <dt class="text-gray-500">GPA</dt>
            <dd class="font-medium text-gray-900">{{ formatGPA(profile.academics.gpa) }}</dd>
          </div>
          <div v-if="profile.academics.graduation_year" class="flex justify-between">
            <dt class="text-gray-500">Grad Year</dt>
            <dd class="font-medium text-gray-900">{{ profile.academics.graduation_year }}</dd>
          </div>
          <div v-if="profile.academics.sat_score" class="flex justify-between">
            <dt class="text-gray-500">SAT</dt>
            <dd class="font-medium text-gray-900">{{ profile.academics.sat_score }}</dd>
          </div>
          <div v-if="profile.academics.act_score" class="flex justify-between">
            <dt class="text-gray-500">ACT</dt>
            <dd class="font-medium text-gray-900">{{ profile.academics.act_score }}</dd>
          </div>
          <div v-if="profile.academics.high_school" class="col-span-2 flex justify-between">
            <dt class="text-gray-500">High School</dt>
            <dd class="font-medium text-gray-900">{{ profile.academics.high_school }}</dd>
          </div>
        </dl>
        <div v-if="profile.academics.core_courses?.length" class="mt-3">
          <p class="text-xs text-gray-400 mb-1">Core Courses</p>
          <p class="text-sm text-gray-700">{{ profile.academics.core_courses.join(", ") }}</p>
        </div>
      </section>

      <!-- Film Links -->
      <section v-if="profile.film?.length" class="px-6 py-5">
        <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Film</h2>
        <ul class="space-y-2">
          <li v-for="link in profile.film" :key="link.url">
            <a
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <span class="capitalize">{{ link.platform }}</span>
              <span v-if="link.title" class="text-gray-500">— {{ link.title }}</span>
            </a>
          </li>
        </ul>
      </section>

      <!-- Target Schools -->
      <section v-if="profile.schools?.length" class="px-6 py-5">
        <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Target Schools</h2>
        <ul class="space-y-1">
          <li v-for="school in profile.schools" :key="school.id" class="text-sm text-gray-700">
            {{ school.name }}
          </li>
        </ul>
      </section>

    </div>

    <!-- Footer -->
    <footer class="px-6 py-4 bg-gray-50 text-center">
      <p class="text-xs text-gray-400">
        Recruiting profile powered by
        <a href="/" class="text-gray-500 hover:text-gray-700">The Recruiting Compass</a>
      </p>
    </footer>
  </article>
</template>
