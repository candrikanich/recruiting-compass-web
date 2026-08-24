<template>
  <div class="group relative inline-block">
    <button
      class="flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
      @click="showMenu = !showMenu"
    >
      <svg
        class="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      Export
    </button>

    <!-- Dropdown Menu -->
    <div
      v-if="showMenu"
      class="absolute right-0 z-10 mt-2 w-40 rounded-lg border border-gray-300 bg-white shadow-lg"
      @click="showMenu = false"
    >
      <button
        v-if="showCSV"
        @click="$emit('export:csv')"
        class="w-full px-4 py-2 text-left text-gray-700 transition first:rounded-t-lg hover:bg-gray-100"
      >
        <span class="text-sm font-medium">📄 CSV</span>
      </button>
      <button
        v-if="showExcel"
        @click="$emit('export:excel')"
        class="w-full px-4 py-2 text-left text-gray-700 transition hover:bg-gray-100"
      >
        <span class="text-sm font-medium">📊 Excel (.xlsx)</span>
      </button>
      <button
        v-if="showPDF"
        @click="$emit('export:pdf')"
        class="w-full px-4 py-2 text-left text-gray-700 transition hover:bg-gray-100"
      >
        <span class="text-sm font-medium">📋 PDF</span>
      </button>
      <button
        v-if="showPrint"
        @click="$emit('export:print')"
        class="w-full px-4 py-2 text-left text-gray-700 transition last:rounded-b-lg hover:bg-gray-100"
      >
        <span class="text-sm font-medium">🖨️ Print</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

interface Props {
  showCSV?: boolean;
  showExcel?: boolean;
  showPDF?: boolean;
  showPrint?: boolean;
}

withDefaults(defineProps<Props>(), {
  showCSV: true,
  showExcel: true,
  showPDF: false,
  showPrint: false,
});

const showMenu = ref(false);

defineEmits<{
  "export:csv": [];
  "export:excel": [];
  "export:pdf": [];
  "export:print": [];
}>();
</script>
