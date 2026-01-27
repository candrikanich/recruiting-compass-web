<template>
  <div
    v-if="schoolCount > 0"
    class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
  >
    <div class="flex items-center gap-3 mb-5">
      <div class="p-2 bg-slate-100 rounded-lg">
        <BuildingLibraryIcon class="w-5 h-5 text-slate-700" />
      </div>
      <h3 class="text-slate-900 font-semibold">Schools by Size</h3>
    </div>
    <div class="space-y-3">
      <div
        v-for="size in [
          'Very Small',
          'Small',
          'Medium',
          'Large',
          'Very Large',
        ]"
        :key="size"
      >
        <div v-if="breakdown[size] > 0">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-slate-700">{{ size }}</span>
            <span class="text-slate-900 font-medium">{{
              breakdown[size]
            }}</span>
          </div>
          <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              :class="getSizeBarColor(size)"
              class="h-full transition-all duration-500"
              :style="{
                width: `${(breakdown[size] / schoolCount) * 100}%`,
              }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { BuildingLibraryIcon } from "@heroicons/vue/24/outline";

interface Props {
  breakdown: Record<string, number>;
  count: number;
}

const props = defineProps<Props>();

const schoolCount = computed(() => props.count);
const breakdown = computed(() => props.breakdown);

const getSizeBarColor = (size: string): string => {
  const colors: Record<string, string> = {
    "Very Small": "bg-blue-500",
    Small: "bg-blue-400",
    Medium: "bg-blue-300",
    Large: "bg-orange-400",
    "Very Large": "bg-orange-500",
  };
  return colors[size] || "bg-slate-300";
};
</script>
