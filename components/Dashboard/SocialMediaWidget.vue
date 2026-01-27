<template>
  <div
    v-if="showSocial"
    class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
  >
    <div class="flex items-center gap-3 mb-5">
      <div class="p-2 bg-slate-100 rounded-lg">
        <ShareIcon class="w-5 h-5 text-slate-700" />
      </div>
      <h3 class="text-slate-900 font-semibold">Social Media</h3>
    </div>
    <div class="space-y-3">
      <div class="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
        <span class="text-2xl">🐦</span>
        <div class="flex-1">
          <div class="text-slate-700 font-medium">X (Twitter)</div>
          <div class="text-slate-500 text-sm">Monitor coach posts</div>
        </div>
      </div>
    </div>
    <NuxtLink
      to="/social"
      class="mt-4 block w-full py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 text-center"
    >
      Monitor Activity
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { ShareIcon } from "@heroicons/vue/24/outline";

interface Props {
  showSocial?: boolean;
}

withDefaults(defineProps<Props>(), {
  showSocial: true,
});
</script>
