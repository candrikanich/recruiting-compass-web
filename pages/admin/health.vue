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

  <div class="mt-6 bg-white rounded-lg shadow-md p-6">
    <h2 class="text-xl font-bold text-slate-900 mb-4">Database</h2>

    <div v-if="dbHealthError" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <p class="text-red-800">{{ dbHealthError }}</p>
    </div>

    <div class="space-y-6">
      <section>
        <h3 class="text-sm font-semibold text-brand-slate-700 mb-2">Row counts</h3>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <AdminStatTile
            v-for="row in dbHealth?.rowCounts ?? []"
            :key="row.table"
            :label="row.table"
            :value="row.count ?? '—'"
          />
        </div>
      </section>

      <section>
        <h3 class="text-sm font-semibold text-brand-slate-700 mb-2">Storage buckets</h3>
        <AdminDataTable
          :columns="storageColumns"
          :rows="storageRows"
          :loading="dbHealthLoading"
        />
      </section>

      <section>
        <h3 class="text-sm font-semibold text-brand-slate-700 mb-2">Orphaned storage (dry run preview)</h3>
        <div v-if="dbHealth?.orphanedPreview" class="grid grid-cols-3 gap-3">
          <AdminStatTile label="Dead users" :value="dbHealth.orphanedPreview.deadUsers" />
          <AdminStatTile label="Orphaned objects" :value="dbHealth.orphanedPreview.objects" />
          <AdminStatTile label="Expired exports" :value="dbHealth.orphanedPreview.expiredExports" />
        </div>
        <p v-else class="text-sm text-brand-slate-500">Preview unavailable.</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useAdminHealthCheck } from "~/composables/useAdminHealthCheck";
import { useAdminDbHealth } from "~/composables/useAdminDbHealth";

definePageMeta({
  layout: "admin",
  middleware: ["auth", "admin"],
});

const { health, healthLoading, healthError, loadHealth } =
  useAdminHealthCheck();

const healthChecks = computed(() => health.value?.checks ?? []);
const healthOk = computed(() => health.value?.ok ?? false);

const {
  data: dbHealth,
  loading: dbHealthLoading,
  error: dbHealthError,
  fetchDbHealth,
} = useAdminDbHealth();

const storageColumns = [
  { key: "bucket", label: "Bucket" },
  { key: "objects", label: "Objects" },
];

const storageRows = computed(
  () =>
    (dbHealth.value?.storage ?? []).map((s) => ({
      bucket: s.bucket,
      objects: s.objects ?? "—",
    })) as Record<string, unknown>[],
);

onMounted(async () => {
  await Promise.all([loadHealth(), fetchDbHealth()]);
});
</script>
