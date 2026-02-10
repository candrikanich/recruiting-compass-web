<script setup lang="ts">
import { extractFilename } from "~/utils/formatters";

interface Props {
  attachments: string[];
}

defineProps<Props>();
</script>

<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-bold mb-4">
      Attachments ({{ attachments.length }})
    </h2>
    <div class="grid grid-cols-2 gap-4">
      <a
        v-for="(url, idx) in attachments"
        :key="idx"
        :href="url"
        target="_blank"
        rel="noopener noreferrer"
        class="p-4 border rounded-lg hover:bg-gray-50 transition"
      >
        <p class="text-sm font-medium text-blue-600 break-all">
          📎 {{ extractFilename(url) }}
        </p>
      </a>
    </div>
  </div>
</template>
