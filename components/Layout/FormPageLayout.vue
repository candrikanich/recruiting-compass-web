<script setup lang="ts">
interface Props {
  backTo: string;
  backText: string;
  title: string;
  description: string;
  headerColor?: "blue" | "indigo" | "green";
}

const props = withDefaults(defineProps<Props>(), {
  headerColor: "blue",
});

const headerGradientClass = computed(() => {
  const gradients = {
    blue: "bg-gradient-to-r from-blue-600 to-blue-700",
    indigo: "bg-gradient-to-r from-indigo-600 to-indigo-700",
    green: "bg-gradient-to-r from-green-600 to-green-700",
  };
  return gradients[props.headerColor];
});
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <div class="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div class="mb-6">
        <NuxtLink
          :to="backTo"
          class="inline-flex items-center text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <svg
            class="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {{ backText }}
        </NuxtLink>
      </div>

      <div class="overflow-hidden rounded-2xl bg-white shadow-xl">
        <div :class="[headerGradientClass, 'px-8 py-6 text-white']">
          <h1 class="text-2xl font-bold">
            {{ title }}
          </h1>
          <p class="mt-2 text-sm text-white/90">
            {{ description }}
          </p>
        </div>

        <div class="p-8">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
