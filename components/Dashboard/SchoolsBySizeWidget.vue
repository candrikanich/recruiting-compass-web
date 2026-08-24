<template>
  <div
    v-if="schoolCount > 0"
    class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
  >
    <div class="mb-5 flex items-center gap-3">
      <div class="rounded-lg bg-slate-100 p-2">
        <UIcon
          name="i-heroicons-building-library"
          class="h-5 w-5 text-slate-700"
        />
      </div>
      <h3 class="font-semibold text-slate-900">Schools by Size</h3>
    </div>
    <div class="space-y-3">
      <div
        v-for="size in ['Very Small', 'Small', 'Medium', 'Large', 'Very Large']"
        :key="size"
      >
        <div v-if="breakdown[size] > 0">
          <div class="mb-1.5 flex items-center justify-between">
            <span class="text-slate-700">{{ size }}</span>
            <span class="font-medium text-slate-900">{{
              breakdown[size]
            }}</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-slate-100">
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
