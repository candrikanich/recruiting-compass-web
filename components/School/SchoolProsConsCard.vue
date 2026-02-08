<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Pros -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <div
          class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center"
        >
          <CheckIcon class="w-4 h-4 text-emerald-600" />
        </div>
        Pros
      </h3>
      <div class="space-y-2 mb-4">
        <div
          v-for="(pro, index) in pros"
          :key="`pro-${index}`"
          class="flex items-center justify-between p-2 bg-emerald-50 rounded-lg text-emerald-700 text-sm"
        >
          <span>{{ pro }}</span>
          <button
            @click="emit('remove-pro', index)"
            class="text-emerald-400 hover:text-red-500 transition"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>
        <div v-if="!pros.length" class="text-slate-400 text-sm">
          No pros added yet
        </div>
      </div>
      <div class="flex gap-2">
        <input
          v-model="newProInput"
          type="text"
          placeholder="Add a pro..."
          class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          @keyup.enter="handleAddPro"
        />
        <button
          @click="handleAddPro"
          :disabled="!newProInput.trim()"
          class="px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
        >
          +
        </button>
      </div>
    </div>

    <!-- Cons -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <div
          class="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center"
        >
          <XMarkIcon class="w-4 h-4 text-red-600" />
        </div>
        Cons
      </h3>
      <div class="space-y-2 mb-4">
        <div
          v-for="(con, index) in cons"
          :key="`con-${index}`"
          class="flex items-center justify-between p-2 bg-red-50 rounded-lg text-red-700 text-sm"
        >
          <span>{{ con }}</span>
          <button
            @click="emit('remove-con', index)"
            class="text-red-400 hover:text-red-600 transition"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>
        <div v-if="!cons.length" class="text-slate-400 text-sm">
          No cons added yet
        </div>
      </div>
      <div class="flex gap-2">
        <input
          v-model="newConInput"
          type="text"
          placeholder="Add a con..."
          class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          @keyup.enter="handleAddCon"
        />
        <button
          @click="handleAddCon"
          :disabled="!newConInput.trim()"
          class="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50"
        >
          +
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { CheckIcon, XMarkIcon } from "@heroicons/vue/24/outline";

defineProps<{
  pros: string[];
  cons: string[];
}>();

const emit = defineEmits<{
  "add-pro": [value: string];
  "add-con": [value: string];
  "remove-pro": [index: number];
  "remove-con": [index: number];
}>();

const newProInput = ref("");
const newConInput = ref("");

const handleAddPro = () => {
  if (!newProInput.value.trim()) return;
  emit("add-pro", newProInput.value);
  newProInput.value = "";
};

const handleAddCon = () => {
  if (!newConInput.value.trim()) return;
  emit("add-con", newConInput.value);
  newConInput.value = "";
};
</script>
