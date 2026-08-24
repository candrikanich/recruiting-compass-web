<template>
  <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
    <!-- Pros -->
    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <h3 class="mb-4 flex items-center gap-2 font-semibold text-slate-900">
        <div
          class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100"
        >
          <UIcon
            name="i-heroicons-check"
            class="h-4 w-4 text-emerald-600"
            aria-hidden="true"
          />
        </div>
        Pros
      </h3>
      <div class="mb-4 space-y-2">
        <div
          v-for="(pro, index) in pros"
          :key="`pro-${index}`"
          class="flex items-center justify-between rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700"
        >
          <span>{{ pro }}</span>
          <button
            @click="emit('remove-pro', index)"
            :aria-label="`Remove pro: ${pro}`"
            class="text-emerald-400 transition hover:text-red-500"
          >
            <UIcon
              name="i-heroicons-x-mark"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </button>
        </div>
        <div v-if="!pros.length" class="text-sm text-slate-400">
          No pros added yet
        </div>
      </div>
      <div class="flex gap-2">
        <input
          v-model="newProInput"
          type="text"
          placeholder="Add a pro..."
          class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          @keyup.enter="handleAddPro"
        />
        <button
          @click="handleAddPro"
          :disabled="!newProInput.trim()"
          aria-label="Add pro"
          class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          +
        </button>
      </div>
    </div>

    <!-- Cons -->
    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <h3 class="mb-4 flex items-center gap-2 font-semibold text-slate-900">
        <div
          class="flex h-6 w-6 items-center justify-center rounded-full bg-red-100"
        >
          <UIcon
            name="i-heroicons-x-mark"
            class="h-4 w-4 text-red-600"
            aria-hidden="true"
          />
        </div>
        Cons
      </h3>
      <div class="mb-4 space-y-2">
        <div
          v-for="(con, index) in cons"
          :key="`con-${index}`"
          class="flex items-center justify-between rounded-lg bg-red-50 p-2 text-sm text-red-700"
        >
          <span>{{ con }}</span>
          <button
            @click="emit('remove-con', index)"
            :aria-label="`Remove con: ${con}`"
            class="text-red-400 transition hover:text-red-600"
          >
            <UIcon
              name="i-heroicons-x-mark"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </button>
        </div>
        <div v-if="!cons.length" class="text-sm text-slate-400">
          No cons added yet
        </div>
      </div>
      <div class="flex gap-2">
        <input
          v-model="newConInput"
          type="text"
          placeholder="Add a con..."
          class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          @keyup.enter="handleAddCon"
        />
        <button
          @click="handleAddCon"
          :disabled="!newConInput.trim()"
          aria-label="Add con"
          class="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          +
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
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
