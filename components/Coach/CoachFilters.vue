<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <!-- Search -->
    <div>
      <label
        for="coaches-search"
        class="mb-1 block text-sm font-medium text-slate-700"
      >
        Search coaches
      </label>
      <div class="relative">
        <UIcon
          name="i-heroicons-magnifying-glass"
          class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
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
          class="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-9 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <p id="coaches-search-hint" class="mt-1 text-xs text-slate-500">
        Search by first/last name, email, phone number, Twitter handle,
        Instagram handle, or notes
      </p>
    </div>

    <!-- Role -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700">Role</label>
      <select
        :value="filterValues.get('role') || ''"
        @change="
          handleUpdate(
            'role',
            ($event.target as HTMLSelectElement).value || null,
          )
        "
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      >
        <option value="">-- All --</option>
        <option value="head">Head Coach</option>
        <option value="assistant">Assistant Coach</option>
        <option value="recruiting">Recruiting Coordinator</option>
      </select>
    </div>

    <!-- Last Contact -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700">
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
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      >
        <option value="">-- All --</option>
        <option value="7">Last 7 days</option>
        <option value="14">Last 14 days</option>
        <option value="30">Last 30 days</option>
        <option value="60">Last 60 days</option>
        <option value="90">Last 90 days</option>
      </select>
    </div>

    <!-- Sort -->
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700"
        >Sort By</label
      >
      <select
        :value="sortBy"
        @change="
          emit('update:sort', ($event.target as HTMLSelectElement).value)
        "
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      >
        <option value="name">Last Name (A-Z)</option>
        <option value="school">School (A-Z)</option>
        <option value="last-contacted">Last Contacted</option>
        <option value="role">Role</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
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
