<template>
  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-5">
      <div class="p-2 bg-slate-100 rounded-lg">
        <svg class="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>
      <h3 class="text-slate-900 font-semibold">Portfolio Health</h3>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-6 bg-slate-100 rounded animate-pulse" />
    </div>

    <!-- Portfolio stats -->
    <div v-else class="space-y-3">
      <!-- Reaches -->
      <div class="flex items-center justify-between">
        <span class="text-sm text-slate-600">Reaches</span>
        <span class="text-sm font-medium text-slate-900">{{ reaches ?? '—' }} schools</span>
      </div>
      <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          v-if="reaches"
          class="h-full bg-blue-500"
          :style="{ width: `${Math.min((reaches / 10) * 100, 100)}%` }"
        />
      </div>

      <!-- Matches -->
      <div class="flex items-center justify-between pt-2">
        <span class="text-sm text-slate-600">Matches</span>
        <span class="text-sm font-medium text-slate-900">{{ matches ?? '—' }} schools</span>
      </div>
      <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          v-if="matches"
          class="h-full bg-emerald-500"
          :style="{ width: `${Math.min((matches / 10) * 100, 100)}%` }"
        />
      </div>

      <!-- Safeties -->
      <div class="flex items-center justify-between pt-2">
        <span class="text-sm text-slate-600">Safeties</span>
        <span class="text-sm font-medium text-slate-900">{{ safeties ?? '—' }} schools</span>
      </div>
      <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          v-if="safeties"
          class="h-full bg-purple-500"
          :style="{ width: `${Math.min((safeties / 10) * 100, 100)}%` }"
        />
      </div>

      <!-- Info message -->
      <div class="mt-4 pt-3 border-t border-slate-100">
        <p class="text-xs text-slate-500">
          ℹ️ Comprehensive portfolio analysis with personalized recommendations coming in Phase 6
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  reaches?: number
  matches?: number
  safeties?: number
  unlikelies?: number
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false
})
</script>
