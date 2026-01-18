<template>
  <div class="video-player">
    <video
      ref="videoRef"
      :src="src"
      controls
      class="w-full rounded-lg bg-black"
      @error="handleError"
    >
      Your browser does not support the video tag.
    </video>
    <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  src: string
}

defineProps<Props>()

const error = ref('')
const videoRef = ref<HTMLVideoElement | null>(null)

const handleError = () => {
  error.value = 'Error loading video. Please check the file format or try a different video.'
}
</script>

<style scoped>
.video-player {
  width: 100%;
}

video {
  display: block;
  max-width: 100%;
  height: auto;
}
</style>
