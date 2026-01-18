<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Common-Toast />
    <FeedbackButton />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from '~/stores/user'

const userStore = useUserStore()

onMounted(async () => {
  // Initialize user on app mount
  await userStore.initializeUser()
})
</script>
