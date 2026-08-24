<template>
  <div class="rounded-lg bg-white p-6 shadow-md">
    <h1 class="mb-6 text-2xl font-bold text-slate-900">System Health</h1>
    <div v-if="healthLoading" class="py-12 text-center text-slate-600">
      Checking...
    </div>
    <div
      v-else-if="healthError"
      class="rounded-lg border border-red-200 bg-red-50 p-4"
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
            ? 'border-green-200 bg-green-50/50'
            : 'border-red-200 bg-red-50/50'
        "
      >
        <span
          class="inline-block h-3 w-3 shrink-0 rounded-full"
          :class="check.status === 'ok' ? 'bg-green-500' : 'bg-red-500'"
          aria-hidden="true"
        />
        <span class="font-medium text-slate-900">{{ check.name }}</span>
        <span v-if="check.message" class="text-sm text-slate-600">
          {{ check.message }}
        </span>
      </div>
      <p class="mt-4 text-sm text-slate-500">
        Overall:
        {{ healthOk ? "All critical checks passed" : "Some checks failed" }}
      </p>
    </div>
  </div>

  <div class="mt-6 rounded-lg bg-white p-6 shadow-md">
    <h2 class="mb-4 text-xl font-bold text-slate-900">Database</h2>

    <div
      v-if="dbHealthError"
      class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4"
    >
      <p class="text-red-800">{{ dbHealthError }}</p>
    </div>

    <div class="space-y-6">
      <section>
        <h3 class="mb-2 text-sm font-semibold text-brand-slate-700">
          Row counts
        </h3>
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
        <h3 class="mb-2 text-sm font-semibold text-brand-slate-700">
          Storage buckets
        </h3>
        <AdminDataTable
          :columns="storageColumns"
          :rows="storageRows"
          :loading="dbHealthLoading"
        />
      </section>

      <section>
        <h3 class="mb-2 text-sm font-semibold text-brand-slate-700">
          Orphaned storage (dry run preview)
        </h3>
        <div v-if="dbHealth?.orphanedPreview" class="grid grid-cols-3 gap-3">
          <AdminStatTile
            label="Dead users"
            :value="dbHealth.orphanedPreview.deadUsers"
          />
          <AdminStatTile
            label="Orphaned objects"
            :value="dbHealth.orphanedPreview.objects"
          />
          <AdminStatTile
            label="Expired exports"
            :value="dbHealth.orphanedPreview.expiredExports"
          />
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
