<template>
  <div class="min-h-screen bg-slate-50 py-8">
    <div class="mx-auto max-w-4xl px-4">
      <div class="rounded-lg border border-slate-200 bg-white p-6 shadow-xs">
        <h1 class="mb-4 text-2xl font-bold text-slate-900">
          Migrate School Sizes
        </h1>
        <p class="mb-6 text-slate-600">
          This migration will convert all string
          <code>student_size</code> values to numeric values in the schools
          table.
        </p>

        <div v-if="!migrationStarted" class="space-y-4">
          <button
            @click="runMigration"
            :disabled="loading"
            class="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {{ loading ? "Running Migration..." : "Run Migration" }}
          </button>
        </div>

        <div v-if="result" class="mt-6 space-y-4">
          <div
            :class="[
              'rounded-lg p-4',
              result.success
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800',
            ]"
          >
            <h3 class="mb-2 font-semibold">
              {{
                result.success ? "✓ Migration Completed" : "⚠ Migration Failed"
              }}
            </h3>
            <div class="space-y-1 text-sm">
              <p><strong>Total Schools:</strong> {{ result.totalSchools }}</p>
              <p><strong>Migrated:</strong> {{ result.migratedCount }}</p>
              <p><strong>Skipped:</strong> {{ result.skippedCount }}</p>
              <p
                v-if="result.errorCount > 0"
                class="font-semibold text-red-700"
              >
                <strong>Errors:</strong> {{ result.errorCount }}
              </p>
            </div>
          </div>

          <div v-if="result.errors.length > 0" class="mt-4">
            <h4 class="mb-2 font-semibold text-slate-900">Error Details:</h4>
            <div class="space-y-2">
              <div
                v-for="(error, index) in result.errors"
                :key="index"
                class="rounded-sm bg-red-50 p-3 text-sm text-red-800"
              >
                <p><strong>School ID:</strong> {{ error.schoolId }}</p>
                <p><strong>Error:</strong> {{ error.error }}</p>
              </div>
            </div>
          </div>

          <button
            @click="resetMigration"
            class="rounded-lg bg-slate-600 px-4 py-2 font-medium text-white transition hover:bg-slate-700"
          >
            Run Again
          </button>
        </div>

        <div v-if="error" class="mt-6 rounded-lg bg-red-50 p-4 text-red-800">
          <h3 class="mb-2 font-semibold">Error</h3>
          <p class="text-sm">{{ error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

definePageMeta({
  layout: "admin",
  middleware: ["auth", "admin"],
});

interface MigrationResult {
  success: boolean;
  totalSchools: number;
  migratedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Array<{ schoolId: string; error: string }>;
}

const loading = ref(false);
const migrationStarted = ref(false);
const result = ref<MigrationResult | null>(null);
const error = ref<string | null>(null);

const runMigration = async () => {
  loading.value = true;
  migrationStarted.value = true;
  error.value = null;
  result.value = null;

  try {
    const response = await $fetch<MigrationResult>(
      "/api/admin/migrate-school-sizes",
      {
        method: "POST",
      },
    );

    result.value = response;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Migration failed";
  } finally {
    loading.value = false;
  }
};

const resetMigration = () => {
  migrationStarted.value = false;
  result.value = null;
  error.value = null;
};
</script>
