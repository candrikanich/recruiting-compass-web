<template>
  <div class="min-h-screen bg-slate-50 py-8">
    <div class="max-w-4xl mx-auto px-4">
      <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h1 class="text-2xl font-bold text-slate-900 mb-4">
          Migrate School Sizes
        </h1>
        <p class="text-slate-600 mb-6">
          This migration will convert all string
          <code>student_size</code> values to numeric values in the schools
          table.
        </p>

        <div v-if="!migrationStarted" class="space-y-4">
          <button
            @click="runMigration"
            :disabled="loading"
            class="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {{ loading ? "Running Migration..." : "Run Migration" }}
          </button>
        </div>

        <div v-if="result" class="mt-6 space-y-4">
          <div
            :class="[
              'p-4 rounded-lg',
              result.success
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800',
            ]"
          >
            <h3 class="font-semibold mb-2">
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
                class="text-red-700 font-semibold"
              >
                <strong>Errors:</strong> {{ result.errorCount }}
              </p>
            </div>
          </div>

          <div v-if="result.errors.length > 0" class="mt-4">
            <h4 class="font-semibold text-slate-900 mb-2">Error Details:</h4>
            <div class="space-y-2">
              <div
                v-for="(error, index) in result.errors"
                :key="index"
                class="p-3 bg-red-50 text-red-800 rounded text-sm"
              >
                <p><strong>School ID:</strong> {{ error.schoolId }}</p>
                <p><strong>Error:</strong> {{ error.error }}</p>
              </div>
            </div>
          </div>

          <button
            @click="resetMigration"
            class="px-4 py-2 bg-slate-600 text-white font-medium rounded-lg hover:bg-slate-700 transition"
          >
            Run Again
          </button>
        </div>

        <div v-if="error" class="mt-6 p-4 bg-red-50 text-red-800 rounded-lg">
          <h3 class="font-semibold mb-2">Error</h3>
          <p class="text-sm">{{ error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

definePageMeta({
  middleware: ["auth"],
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
    const response = (await $fetch("/api/admin/migrate-school-sizes", {
      method: "POST",
    })) as MigrationResult;

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
