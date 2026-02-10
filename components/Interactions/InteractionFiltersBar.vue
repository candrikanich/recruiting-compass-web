<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <!-- Type Filter -->
      <div>
        <label
          for="type-filter"
          class="block text-sm font-medium text-slate-700 mb-2"
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
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      <div>
        <label
          for="direction-filter"
          class="block text-sm font-medium text-slate-700 mb-2"
        >
          Direction
        </label>
        <select
          id="direction-filter"
          :value="selectedDirection"
          @change="
            $emit(
              'update:selectedDirection',
              ($event.target as HTMLSelectElement).value,
            )
          "
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Both</option>
          <option value="outbound">Sent by Us</option>
          <option value="inbound">Received</option>
        </select>
      </div>

      <!-- Date Range Filter -->
      <div>
        <label
          for="date-filter"
          class="block text-sm font-medium text-slate-700 mb-2"
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
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          class="block text-sm font-medium text-slate-700 mb-2"
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
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        class="px-3 py-1 text-sm text-slate-600 hover:text-slate-900 font-medium"
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
