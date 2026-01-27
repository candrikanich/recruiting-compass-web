<template>
  <div
    class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
  >
    <h3 class="text-slate-900 font-semibold mb-4">Recruiting Packet</h3>
    <div class="space-y-2">
      <button
        @click="emit('generate-packet')"
        :disabled="recruitingPacketLoading"
        class="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
        :class="recruitingPacketLoading
          ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
          : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow-md'"
      >
        <svg
          v-if="!recruitingPacketLoading"
          class="w-4 h-4 mr-2"
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
          class="w-4 h-4 mr-2 animate-spin"
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

      <button
        @click="emit('email-packet')"
        :disabled="!hasGeneratedPacket || recruitingPacketLoading"
        class="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
        :class="!hasGeneratedPacket || recruitingPacketLoading
          ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
          : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-sm hover:shadow-md'"
      >
        <svg
          class="w-4 h-4 mr-2"
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
        Email to Coach
      </button>
    </div>
    <div
      v-if="recruitingPacketError"
      class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
    >
      {{ recruitingPacketError }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  recruitingPacketLoading?: boolean;
  recruitingPacketError?: string | null;
  hasGeneratedPacket?: boolean;
}

withDefaults(defineProps<Props>(), {
  recruitingPacketLoading: false,
  recruitingPacketError: null,
  hasGeneratedPacket: false,
});

const emit = defineEmits<{
  "generate-packet": [];
  "email-packet": [];
}>();
</script>
