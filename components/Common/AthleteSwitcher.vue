<template>
  <div v-if="showSwitcher" class="bg-slate-50 border-b border-slate-200 py-3">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-3">
        <UserCircleIcon class="w-5 h-5 text-slate-500" />
        <span class="text-sm font-medium text-slate-700">Viewing:</span>
        <select
          v-model="selectedId"
          class="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
          @change="handleSwitch"
        >
          <option v-for="athlete in linkedAthletes" :key="athlete.user_id" :value="athlete.user_id">
            {{ athlete.full_name || athlete.email }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { UserCircleIcon } from '@heroicons/vue/24/outline'
import { useParentContext } from '~/composables/useParentContext'

const { isParent, linkedAthletes, currentAthleteId, switchAthlete } = useParentContext()

// Only show switcher if parent with multiple athletes
const showSwitcher = computed(() => isParent.value && linkedAthletes.value.length > 1)

const selectedId = ref(currentAthleteId.value || '')

// Update selectedId when currentAthleteId changes (from initialization or route param)
watch(currentAthleteId, (newId) => {
  if (newId) {
    selectedId.value = newId
  }
})

const handleSwitch = async () => {
  if (selectedId.value && selectedId.value !== currentAthleteId.value) {
    await switchAthlete(selectedId.value)
  }
}
</script>
