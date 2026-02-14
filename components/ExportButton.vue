<template>
  <div class="relative inline-block group">
    <button
      class="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
      @click="showMenu = !showMenu"
    >
      <svg
        class="w-4 h-4"
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
      class="absolute right-0 mt-2 w-40 bg-white border border-gray-300 rounded-lg shadow-lg z-10"
      @click="showMenu = false"
    >
      <button
        v-if="showCSV"
        @click="$emit('export:csv')"
        class="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 first:rounded-t-lg transition"
      >
        <span class="text-sm font-medium">📄 CSV</span>
      </button>
      <button
        v-if="showExcel"
        @click="$emit('export:excel')"
        class="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 transition"
      >
        <span class="text-sm font-medium">📊 Excel (.xlsx)</span>
      </button>
      <button
        v-if="showPDF"
        @click="$emit('export:pdf')"
        class="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 transition"
      >
        <span class="text-sm font-medium">📋 PDF</span>
      </button>
      <button
        v-if="showPrint"
        @click="$emit('export:print')"
        class="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 last:rounded-b-lg transition"
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
