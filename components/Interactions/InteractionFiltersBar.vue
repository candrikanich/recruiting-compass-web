<template>
  <div class="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
    <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Type Filter -->
      <div>
        <label
          for="type-filter"
          class="mb-2 block text-sm font-medium text-slate-700"
        >
          Type
        </label>
        <select
          id="type-filter"
          :value="selectedType"
          @change="
            $emit(
              'update:selectedType',
              ($event.target as HTMLSelectElement).value,
            )
          "
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="email">Email</option>
          <option value="phone_call">Phone Call</option>
          <option value="text">Text Message</option>
          <option value="in_person_visit">In-Person Visit</option>
          <option value="virtual_meeting">Virtual Meeting</option>
          <option value="dm">Direct Message</option>
          <option value="tweet">Tweet</option>
        </select>
      </div>

      <!-- Direction Filter -->
      <DesignSystemFormSegmentedControl
        label="Direction"
        size="sm"
        :model-value="selectedDirection"
        :options="[
          { value: '', label: 'Both' },
          { value: 'outbound', label: 'Sent by Us' },
          { value: 'inbound', label: 'Received' },
        ]"
        @update:model-value="$emit('update:selectedDirection', $event)"
      />

      <!-- Date Range Filter -->
      <div>
        <label
          for="date-filter"
          class="mb-2 block text-sm font-medium text-slate-700"
        >
          Date Range
        </label>
        <select
          id="date-filter"
          :value="selectedDateRange"
          @change="
            $emit(
              'update:selectedDateRange',
              ($event.target as HTMLSelectElement).value,
            )
          "
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Time</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="180">Last 6 Months</option>
        </select>
      </div>

      <!-- Sentiment Filter -->
      <div>
        <label
          for="sentiment-filter"
          class="mb-2 block text-sm font-medium text-slate-700"
        >
          Sentiment
        </label>
        <select
          id="sentiment-filter"
          :value="selectedSentiment"
          @change="
            $emit(
              'update:selectedSentiment',
              ($event.target as HTMLSelectElement).value,
            )
          "
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Sentiments</option>
          <option value="very_positive">Very Positive</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
      </div>
    </div>

    <!-- Clear Filters Button -->
    <div>
      <button
        @click="$emit('clear')"
        class="px-3 py-1 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        Clear Filters
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  selectedType: string;
  selectedDirection: string;
  selectedDateRange: string;
  selectedSentiment: string;
}>();

defineEmits<{
  "update:selectedType": [value: string];
  "update:selectedDirection": [value: string];
  "update:selectedDateRange": [value: string];
  "update:selectedSentiment": [value: string];
  clear: [];
}>();
</script>
