<template>
  <div>
    <SkipLink to="#main-content" text="Skip to main content" />
    <Header />
    <main id="main-content">
      <slot />
    </main>
    <SpeedInsights />
  </div>
</template>

<script setup lang="ts">
import { SpeedInsights } from "@vercel/speed-insights/nuxt";
</script>
