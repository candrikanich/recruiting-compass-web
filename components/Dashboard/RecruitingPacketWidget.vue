<template>
  <div
    class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
  >
    <h3 class="mb-4 font-semibold text-slate-900">Recruiting Packet</h3>
    <div class="space-y-2">
      <button
        @click="emit('generate-packet')"
        :disabled="recruitingPacketLoading"
        class="inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
        :class="
          recruitingPacketLoading
            ? 'cursor-not-allowed bg-slate-100 text-slate-500'
            : 'bg-linear-to-r from-blue-600 to-blue-700 text-white shadow-xs hover:from-blue-700 hover:to-blue-800 hover:shadow-md'
        "
      >
        <svg
          v-if="!recruitingPacketLoading"
          class="mr-2 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 19l9 2-9-18-9 18 9-2m0 0v-8m0 8l-4-2m4 2l4-2"
          />
        </svg>
        <svg
          v-else
          class="mr-2 h-4 w-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {{ recruitingPacketLoading ? "Generating..." : "Generate Packet" }}
      </button>

      <NuxtLink
        to="/coaches"
        class="inline-flex w-full items-center justify-center rounded-lg bg-linear-to-r from-green-600 to-green-700 px-4 py-2 text-sm font-medium text-white shadow-xs transition-all duration-200 hover:from-green-700 hover:to-green-800 hover:shadow-md"
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
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        Share with a coach
      </NuxtLink>
    </div>
    <div
      v-if="recruitingPacketError"
      class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
    >
      {{ recruitingPacketError }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  recruitingPacketLoading?: boolean;
  recruitingPacketError?: string | null;
}

withDefaults(defineProps<Props>(), {
  recruitingPacketLoading: false,
  recruitingPacketError: null,
});

const emit = defineEmits<{
  "generate-packet": [];
}>();
</script>
