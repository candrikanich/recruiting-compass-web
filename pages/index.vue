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
      class="relative z-10 flex min-h-screen flex-col items-center justify-center px-6"
    >
      <!-- Skip link target -->
      <SkipLink to="#cta-buttons" text="Skip to main content" />

      <!-- Hero Section -->
      <div class="mx-auto mb-12 max-w-4xl text-center">
        <!-- Logo -->
        <div class="mb-8 flex justify-center">
          <img
            src="/assets/logos/recruiting-compass-stacked.svg"
            alt="Recruiting Compass — college athletic recruiting tracker"
            class="h-96 w-auto drop-shadow-2xl"
          />
        </div>

        <h1 class="sr-only">Recruiting Compass</h1>

        <!-- CTA Buttons -->
        <div
          id="cta-buttons"
          class="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <NuxtLink
            to="/login"
            class="min-w-[200px] rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-xl transition-all hover:bg-blue-700 hover:shadow-2xl focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600"
          >
            Sign In
          </NuxtLink>
          <NuxtLink
            to="/signup"
            class="min-w-[200px] rounded-lg bg-white px-8 py-4 text-lg font-semibold text-slate-900 shadow-xl transition-all hover:bg-slate-800 hover:text-white hover:shadow-2xl focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600"
          >
            Create Account
          </NuxtLink>
        </div>

        <!-- Features -->
        <h2 class="sr-only">Features</h2>
        <div class="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div
            class="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xs transition-colors hover:bg-white/20"
          >
            <div class="mx-auto mb-3 h-12 w-12">
              <svg
                aria-hidden="true"
                class="h-12 w-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"
                />
              </svg>
            </div>
            <h3 class="mb-2 text-lg font-medium text-white">Track Schools</h3>
            <p class="text-sm text-white">
              Organize and manage your target colleges in one place
            </p>
          </div>

          <div
            class="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xs transition-colors hover:bg-white/20"
          >
            <div class="mx-auto mb-3 h-12 w-12">
              <svg
                aria-hidden="true"
                class="h-12 w-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                />
              </svg>
            </div>
            <h3 class="mb-2 text-lg font-medium text-white">
              Log Interactions
            </h3>
            <p class="text-sm text-white">
              Keep track of every conversation with coaches
            </p>
          </div>

          <div
            class="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xs transition-colors hover:bg-white/20"
          >
            <div class="mx-auto mb-3 h-12 w-12">
              <svg
                aria-hidden="true"
                class="h-12 w-12 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="4" y="14" width="4" height="8" rx="1" />
                <rect x="10" y="9" width="4" height="13" rx="1" />
                <rect x="16" y="4" width="4" height="18" rx="1" />
              </svg>
            </div>
            <h3 class="mb-2 text-lg font-medium text-white">
              Monitor Progress
            </h3>
            <p class="text-sm text-white">
              Visualize your recruiting journey with insights
            </p>
          </div>
        </div>
      </div>
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
</script>
