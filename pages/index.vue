<template>
  <div class="min-h-screen relative overflow-hidden bg-emerald-600">
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
      class="relative z-10 min-h-screen flex flex-col items-center justify-center px-6"
    >
      <!-- Skip link target -->
      <a
        href="#cta-buttons"
        class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-slate-900 focus:rounded-lg focus:shadow-lg"
      >
        Skip to main content
      </a>

      <!-- Hero Section -->
      <div class="text-center max-w-4xl mx-auto mb-12">
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
          class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <NuxtLink
            to="/login"
            class="min-w-[200px] px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg shadow-xl hover:shadow-2xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600 transition-all text-lg"
          >
            Sign In
          </NuxtLink>
          <NuxtLink
            to="/signup"
            class="min-w-[200px] px-8 py-4 bg-white text-slate-900 font-semibold rounded-lg shadow-xl hover:shadow-2xl hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600 transition-all text-lg"
          >
            Create Account
          </NuxtLink>
        </div>

        <!-- Features -->
        <h2 class="sr-only">Features</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div
            class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-colors"
          >
            <div class="w-12 h-12 mx-auto mb-3">
              <svg
                aria-hidden="true"
                class="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="1.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.436 60.436 0 00-.491-6.347m-15.482 0a51.66 51.66 0 00-.492 6.347m15.481-6.347A51.66 51.66 0 0118.66 8.5m-15.481 0a51.66 51.66 0 011.779-3.647M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 class="text-white text-lg font-medium mb-2">Track Schools</h3>
            <p class="text-white text-sm">
              Organize and manage your target colleges in one place
            </p>
          </div>

          <div
            class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-colors"
          >
            <div class="w-12 h-12 mx-auto mb-3">
              <svg
                aria-hidden="true"
                class="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="1.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 class="text-white text-lg font-medium mb-2">
              Log Interactions
            </h3>
            <p class="text-white text-sm">
              Keep track of every conversation with coaches
            </p>
          </div>

          <div
            class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-colors"
          >
            <div class="w-12 h-12 mx-auto mb-3">
              <svg
                aria-hidden="true"
                class="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="1.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            </div>
            <h3 class="text-white text-lg font-medium mb-2">
              Monitor Progress
            </h3>
            <p class="text-white text-sm">
              Visualize your recruiting journey with insights
            </p>
          </div>
        </div>
      </div>
    </main>

    <!-- Decorative elements -->
    <div
      aria-hidden="true"
      class="absolute top-10 left-10 w-16 h-16 bg-white rounded-full opacity-10 animate-pulse motion-reduce:animate-none"
    ></div>
    <div
      aria-hidden="true"
      class="absolute top-32 right-20 w-12 h-12 bg-white rounded-full opacity-10 animate-pulse motion-reduce:animate-none"
      style="animation-delay: 100ms"
    ></div>
    <div
      aria-hidden="true"
      class="absolute bottom-20 left-1/4 w-20 h-20 bg-white rounded-full opacity-10 animate-pulse motion-reduce:animate-none"
      style="animation-delay: 200ms"
    ></div>
    <div
      aria-hidden="true"
      class="absolute bottom-32 right-1/3 w-14 h-14 bg-white rounded-full opacity-10 animate-pulse motion-reduce:animate-none"
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
