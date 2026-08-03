<template>
  <div>
    <SkipLink to="#main-content" text="Skip to main content" />
    <Header />
    <main id="main-content">
      <ErrorBoundary>
        <slot />
      </ErrorBoundary>
    </main>
    <SpeedInsights v-if="isVercel" />
  </div>
</template>

<script setup lang="ts">
import { SpeedInsights } from "@vercel/speed-insights/nuxt";
const { public: publicConfig } = useRuntimeConfig();
const isVercel = publicConfig.isVercel;
</script>
