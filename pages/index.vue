<template>
  <div class="relative min-h-screen overflow-hidden bg-emerald-600">
    <MultiSportFieldBackground />

    <!-- Decorative pattern overlay -->
    <div
      aria-hidden="true"
      class="absolute inset-0 opacity-5"
      :style="{
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 20px,
          rgba(255, 255, 255, 0.3) 20px,
          rgba(255, 255, 255, 0.3) 22px
        )`,
      }"
    ></div>

    <!-- Content -->
    <main
      class="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12"
    >
      <!-- Skip link target -->
      <SkipLink to="#cta-buttons" text="Skip to main content" />

      <!-- Hero Section -->
      <div class="mx-auto mb-8 max-w-2xl text-center">
        <!-- Logo -->
        <div class="mb-6 flex justify-center">
          <img
            src="/assets/logos/recruiting-compass-stacked.svg"
            alt="Recruiting Compass — college athletic recruiting tracker"
            class="h-64 w-auto drop-shadow-2xl sm:h-80"
          />
        </div>

        <h1 class="sr-only">Recruiting Compass</h1>

        <!-- Headline -->
        <h2
          class="mb-3 text-2xl font-semibold text-white sm:text-3xl"
        >
          Your College Recruiting Command Center
        </h2>

        <!-- Subheadline -->
        <p class="mx-auto mb-8 max-w-lg text-base text-white/90">
          Navigate college recruiting from finding schools to signing day.
          For 19 sports. No recruiting service required.
        </p>

        <!-- CTA Buttons -->
        <div
          id="cta-buttons"
          class="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <NuxtLink
            to="/signup"
            class="min-w-[200px] rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-xl transition-all hover:bg-blue-700 hover:shadow-2xl focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600"
          >
            Get Started Free
          </NuxtLink>
          <NuxtLink
            to="/login"
            class="min-w-[200px] rounded-lg bg-white px-8 py-4 text-lg font-semibold text-slate-900 shadow-xl transition-all hover:bg-slate-800 hover:text-white hover:shadow-2xl focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600"
          >
            Sign In
          </NuxtLink>
        </div>

        <!-- Stats Badge -->
        <div
          class="mx-auto mb-10 flex max-w-md items-center justify-between rounded-xl border border-white/20 bg-white/10 px-6 py-3 backdrop-blur-xs"
          role="list"
          aria-label="Product highlights"
        >
          <div role="listitem" class="flex flex-col items-center">
            <span class="text-xl font-bold text-white sm:text-2xl">19</span>
            <span class="text-xs font-medium text-white/75">Sports</span>
          </div>
          <div
            aria-hidden="true"
            class="h-7 w-px bg-white/25"
          ></div>
          <div role="listitem" class="flex flex-col items-center">
            <span class="text-xl font-bold text-white sm:text-2xl">33+</span>
            <span class="text-xs font-medium text-white/75">Templates</span>
          </div>
          <div
            aria-hidden="true"
            class="h-7 w-px bg-white/25"
          ></div>
          <div role="listitem" class="flex flex-col items-center">
            <span class="text-xl font-bold text-white sm:text-2xl">22</span>
            <span class="text-xs font-medium text-white/75">NCAA Calendars</span>
          </div>
        </div>

        <!-- Feature Cards -->
        <h2 class="sr-only">Features</h2>
        <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xs transition-colors hover:bg-white/20"
          >
            <div class="mx-auto mb-3 h-12 w-12 text-white" v-html="feature.icon"></div>
            <h3 class="mb-2 text-lg font-medium text-white">
              {{ feature.title }}
            </h3>
            <p class="text-sm leading-relaxed text-white/85">
              {{ feature.description }}
            </p>
          </div>
        </div>

        <!-- Tagline -->
        <p class="mt-8 text-sm font-medium text-white/60">
          Free for student athletes and families.
        </p>
      </div>

      <SiteFooter variant="light" />
    </main>

    <!-- Decorative elements -->
    <div
      aria-hidden="true"
      class="absolute top-10 left-10 h-16 w-16 animate-pulse rounded-full bg-white opacity-10 motion-reduce:animate-none"
    ></div>
    <div
      aria-hidden="true"
      class="absolute top-32 right-20 h-12 w-12 animate-pulse rounded-full bg-white opacity-10 motion-reduce:animate-none"
      style="animation-delay: 100ms"
    ></div>
    <div
      aria-hidden="true"
      class="absolute bottom-20 left-1/4 h-20 w-20 animate-pulse rounded-full bg-white opacity-10 motion-reduce:animate-none"
      style="animation-delay: 200ms"
    ></div>
    <div
      aria-hidden="true"
      class="absolute right-1/3 bottom-32 h-14 w-14 animate-pulse rounded-full bg-white opacity-10 motion-reduce:animate-none"
      style="animation-delay: 300ms"
    ></div>
  </div>
</template>

<script setup lang="ts">
import MultiSportFieldBackground from "~/components/Auth/MultiSportFieldBackground.vue";

definePageMeta({
  layout: "public",
});

const features = [
  {
    title: "Track Schools & Coaches",
    description:
      "A 5-stage pipeline for your college list and a full coach CRM with response tracking and follow-up reminders.",
    icon: `<svg aria-hidden="true" class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21" />
    </svg>`,
  },
  {
    title: "Smart Outreach",
    description:
      "33+ templates with NCAA contact-window compliance. Your stats auto-fill into every message.",
    icon: `<svg aria-hidden="true" class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>`,
  },
  {
    title: "Calendars & Timeline",
    description:
      "22 NCAA recruiting calendars and a 4-year roadmap with milestones so you always know what to do next.",
    icon: `<svg aria-hidden="true" class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>`,
  },
];
</script>
