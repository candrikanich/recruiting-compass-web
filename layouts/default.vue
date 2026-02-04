<template>
  <div>
    <Header />
    <main>
      <slot />
    </main>
    <SpeedInsights />
  </div>
</template>

<script setup lang="ts">
import { SpeedInsights } from "@vercel/speed-insights/nuxt";
</script>
