<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h1 class="text-2xl font-bold text-slate-900 mb-6">System Health</h1>
    <div v-if="healthLoading" class="text-center py-12 text-slate-600">
      Checking...
    </div>
    <div
      v-else-if="healthError"
      class="bg-red-50 border border-red-200 rounded-lg p-4"
    >
      <p class="text-red-800">{{ healthError }}</p>
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="check in healthChecks"
        :key="check.name"
        class="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
        :class="
          check.status === 'ok'
            ? 'bg-green-50/50 border-green-200'
            : 'bg-red-50/50 border-red-200'
        "
      >
        <span
          class="inline-block w-3 h-3 rounded-full shrink-0"
          :class="check.status === 'ok' ? 'bg-green-500' : 'bg-red-500'"
          aria-hidden="true"
        />
        <span class="font-medium text-slate-900">{{ check.name }}</span>
        <span v-if="check.message" class="text-slate-600 text-sm">
          {{ check.message }}
        </span>
      </div>
      <p class="mt-4 text-sm text-slate-500">
        Overall:
        {{ healthOk ? "All critical checks passed" : "Some checks failed" }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useAdminHealthCheck } from "~/composables/useAdminHealthCheck";

definePageMeta({
  layout: "admin",
  middleware: ["auth", "admin"],
});

const { health, healthLoading, healthError, loadHealth } =
  useAdminHealthCheck();

const healthChecks = computed(() => health.value?.checks ?? []);
const healthOk = computed(() => health.value?.ok ?? false);

onMounted(async () => {
  await loadHealth();
});
</script>
