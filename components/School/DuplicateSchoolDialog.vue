<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-50">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <svg
                class="h-5 w-5 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4v2m0 0v2m0-6V9m0 0V7m0 0h2m0 0h2m0 0h-2m0 0h-2"
                />
              </svg>
              <h2 class="text-lg font-semibold text-gray-900">
                Duplicate School Detected
              </h2>
            </div>
            <button
              @click="$emit('cancel')"
              class="text-gray-400 hover:text-gray-600"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Warning Message -->
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p class="text-sm text-amber-800">
              A school already exists that matches your entry. Proceed only if
              you're certain this is a different program.
            </p>
          </div>

          <!-- Duplicate School Info -->
          <div class="space-y-3 mb-4">
            <!-- Match Type Badge -->
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-gray-600 uppercase"
                >Match Type</span
              >
              <span
                class="inline-block px-2 py-1 rounded text-xs font-medium"
                :class="getMatchBadgeClass(matchType)"
              >
                {{ getMatchTypeLabel(matchType) }}
              </span>
            </div>

            <!-- Existing School Card -->
            <div class="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div class="space-y-2">
                <div>
                  <p class="text-xs text-gray-600 uppercase font-semibold">
                    Existing School
                  </p>
                  <p class="text-sm font-medium text-gray-900">
                    {{ duplicate.name }}
                  </p>
                </div>

                <div v-if="duplicate.division" class="text-xs text-gray-700">
                  <span class="font-medium">Division:</span>
                  {{ duplicate.division }}
                  <span v-if="duplicate.conference" class="ml-1"
                    >• {{ duplicate.conference }}</span
                  >
                </div>

                <div v-if="duplicate.location" class="text-xs text-gray-700">
                  <span class="font-medium">Location:</span>
                  {{ duplicate.location }}
                </div>

                <div
                  v-if="matchType === 'domain' && duplicate.website"
                  class="text-xs text-gray-700"
                >
                  <span class="font-medium">Website:</span>
                  <a
                    :href="duplicate.website"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 hover:underline"
                    >{{ formatDomain(duplicate.website) }}</a
                  >
                </div>

                <div
                  v-if="matchType === 'ncaa_id' && duplicate.ncaa_id"
                  class="text-xs text-gray-700"
                >
                  <span class="font-medium">NCAA ID:</span>
                  {{ duplicate.ncaa_id }}
                </div>

                <div
                  v-if="matchType === 'name'"
                  class="text-xs text-gray-600 italic"
                >
                  School names match exactly (case-insensitive)
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              @click="$emit('cancel')"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="$emit('confirm')"
              class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium transition"
            >
              Proceed Anyway
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { School } from "~/types/models";

interface Props {
  isOpen: boolean;
  duplicate: School;
  matchType: "name" | "domain" | "ncaa_id" | null;
}

defineEmits<{
  confirm: [];
  cancel: [];
}>();

withDefaults(defineProps<Props>(), {
  matchType: null,
});

const formatDomain = (url: string | null | undefined): string => {
  if (!url) return "";
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return domain;
  } catch {
    return url;
  }
};

const getMatchTypeLabel = (
  matchType: "name" | "domain" | "ncaa_id" | null,
): string => {
  const labels: Record<string, string> = {
    name: "Name Match",
    domain: "Website Domain",
    ncaa_id: "NCAA ID",
  };
  return labels[matchType || ""] || "Unknown";
};

const getMatchBadgeClass = (
  matchType: "name" | "domain" | "ncaa_id" | null,
): string => {
  const baseClass = "inline-block px-2 py-1 rounded text-xs font-medium";
  const classes: Record<string, string> = {
    name: `${baseClass} bg-red-100 text-red-800`,
    domain: `${baseClass} bg-yellow-100 text-yellow-800`,
    ncaa_id: `${baseClass} bg-orange-100 text-orange-800`,
  };
  return classes[matchType || ""] || baseClass;
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
