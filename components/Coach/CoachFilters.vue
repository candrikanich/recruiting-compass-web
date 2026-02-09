<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
    <!-- Search -->
    <div>
      <label
        for="coaches-search"
        class="block text-sm font-medium text-slate-700 mb-1"
      >
        Search coaches
      </label>
      <div class="relative">
        <MagnifyingGlassIcon
          class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id="coaches-search"
          type="text"
          :value="filterValues.get('search') || ''"
          @input="
            handleUpdate('search', ($event.target as HTMLInputElement).value)
          "
          aria-describedby="coaches-search-hint"
          placeholder="Name, email, phone..."
          class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <p id="coaches-search-hint" class="mt-1 text-xs text-slate-500">
        Search by first/last name, email, phone number, Twitter handle,
        Instagram handle, or notes
      </p>
    </div>

    <!-- Role -->
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Role</label>
      <select
        :value="filterValues.get('role') || ''"
        @change="
          handleUpdate(
            'role',
            ($event.target as HTMLSelectElement).value || null,
          )
        "
        class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">-- All --</option>
        <option value="head">Head Coach</option>
        <option value="assistant">Assistant Coach</option>
        <option value="recruiting">Recruiting Coordinator</option>
      </select>
    </div>

    <!-- Last Contact -->
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">
        Last Contact
      </label>
      <select
        :value="filterValues.get('lastContact') || ''"
        @change="
          handleUpdate(
            'lastContact',
            ($event.target as HTMLSelectElement).value || null,
          )
        "
        class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">-- All --</option>
        <option value="7">Last 7 days</option>
        <option value="14">Last 14 days</option>
        <option value="30">Last 30 days</option>
        <option value="60">Last 60 days</option>
        <option value="90">Last 90 days</option>
      </select>
    </div>

    <!-- Responsiveness -->
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">
        Responsiveness
      </label>
      <select
        :value="filterValues.get('responsiveness') || ''"
        @change="
          handleUpdate(
            'responsiveness',
            ($event.target as HTMLSelectElement).value || null,
          )
        "
        class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">-- All --</option>
        <option value="high">High (75%+)</option>
        <option value="medium">Medium (50-74%)</option>
        <option value="low">Low (&lt;50%)</option>
      </select>
    </div>

    <!-- Sort -->
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1"
        >Sort By</label
      >
      <select
        :value="sortBy"
        @change="
          emit('update:sort', ($event.target as HTMLSelectElement).value)
        "
        class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="name">Last Name (A-Z)</option>
        <option value="school">School (A-Z)</option>
        <option value="last-contacted">Last Contacted</option>
        <option value="responsiveness">Responsiveness</option>
        <option value="role">Role</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";

interface Props {
  filterValues: Map<string, string | null>;
  sortBy: string;
}

interface Emits {
  (e: "update:filter", field: string, value: string | null): void;
  (e: "update:sort", value: string): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const handleUpdate = (field: string, value: string | null) => {
  emit("update:filter", field, value || null);
};
</script>
