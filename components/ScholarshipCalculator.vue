<template>
  <div class="rounded-lg bg-white p-6 shadow-sm">
    <div class="mb-6 flex items-center justify-between">
      <h2 class="text-2xl font-bold text-slate-900">Scholarship Calculator</h2>
      <button
        v-if="!showCalculator"
        @click="showCalculator = true"
        class="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
      >
        + Calculate
      </button>
      <button
        v-else
        @click="showCalculator = false"
        class="rounded-lg bg-slate-50 px-4 py-2 font-semibold text-slate-900 transition hover:bg-slate-100"
      >
        Hide
      </button>
    </div>

    <div v-if="showCalculator" class="space-y-6">
      <!-- Input Section -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <!-- Total Annual Cost -->
        <div>
          <label
            for="annualCost"
            class="mb-1 block text-sm font-medium text-slate-600"
          >
            Total Annual Cost ($)
          </label>
          <input
            id="annualCost"
            v-model.number="inputs.annualCost"
            type="number"
            min="0"
            step="100"
            placeholder="e.g., 60000"
            class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900"
          />
          <p class="mt-1 text-xs text-slate-600">Tuition + room/board + fees</p>
        </div>

        <!-- Scholarship Amount (Alternative to Percentage) -->
        <div>
          <label
            for="scholarshipAmount"
            class="mb-1 block text-sm font-medium text-slate-600"
          >
            Scholarship Amount ($) OR
          </label>
          <input
            id="scholarshipAmount"
            v-model.number="inputs.scholarshipAmount"
            type="number"
            min="0"
            step="100"
            placeholder="Enter scholarship amount"
            class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900"
          />
          <p class="mt-1 text-xs text-slate-600">
            Leave blank to use percentage
          </p>
        </div>

        <!-- Scholarship Percentage (Alternative to Amount) -->
        <div>
          <label
            for="scholarshipPercentage"
            class="mb-1 block text-sm font-medium text-slate-600"
          >
            Scholarship Percentage (%)
          </label>
          <input
            id="scholarshipPercentage"
            v-model.number="inputs.scholarshipPercentage"
            type="number"
            min="0"
            max="100"
            step="5"
            placeholder="e.g., 50"
            class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900"
          />
          <p class="mt-1 text-xs text-slate-600">
            Leave blank if using amount above
          </p>
        </div>

        <!-- Additional Aid/Grants -->
        <div>
          <label
            for="additionalAid"
            class="mb-1 block text-sm font-medium text-slate-600"
          >
            Additional Aid/Grants ($)
          </label>
          <input
            id="additionalAid"
            v-model.number="inputs.additionalAid"
            type="number"
            min="0"
            step="100"
            placeholder="e.g., 5000"
            class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900"
          />
          <p class="mt-1 text-xs text-slate-600">Non-scholarship aid</p>
        </div>

        <!-- Years to Calculate -->
        <div>
          <label
            for="years"
            class="mb-1 block text-sm font-medium text-slate-600"
          >
            Years to Calculate
          </label>
          <select
            id="years"
            v-model.number="inputs.years"
            class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900"
          >
            <option value="1">1 Year</option>
            <option value="2">2 Years</option>
            <option value="3">3 Years</option>
            <option value="4">4 Years</option>
            <option value="5">5 Years</option>
          </select>
        </div>
      </div>

      <!-- Calculations Display -->
      <div
        class="grid grid-cols-1 gap-4 border-t border-slate-300 pt-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <!-- Annual Scholarship -->
        <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p class="mb-1 text-sm font-medium text-blue-600">
            Annual Scholarship
          </p>
          <p class="text-2xl font-bold text-blue-900">
            {{ formatCurrency(annualScholarship) }}
          </p>
        </div>

        <!-- Annual Net Cost -->
        <div class="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <p class="mb-1 text-sm font-medium text-orange-600">
            Annual Net Cost
          </p>
          <p class="text-2xl font-bold text-orange-900">
            {{ formatCurrency(annualNetCost) }}
          </p>
        </div>

        <!-- Total Scholarship -->
        <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p class="mb-1 text-sm font-medium text-emerald-600">
            Total Scholarship ({{ inputs.years }}yr)
          </p>
          <p class="text-2xl font-bold text-emerald-900">
            {{ formatCurrency(totalScholarship) }}
          </p>
        </div>

        <!-- Total Net Cost -->
        <div class="rounded-lg border border-red-200 bg-red-50 p-4">
          <p class="mb-1 text-sm font-medium text-red-600">
            Total Net Cost ({{ inputs.years }}yr)
          </p>
          <p class="text-2xl font-bold text-red-600">
            {{ formatCurrency(totalNetCost) }}
          </p>
        </div>
      </div>

      <!-- Annual Breakdown Table -->
      <div class="mt-6">
        <h3 class="mb-3 font-semibold text-slate-900">
          Year-by-Year Breakdown
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b-2 border-slate-300">
                <th class="px-4 py-2 text-left font-semibold text-slate-900">
                  Year
                </th>
                <th class="px-4 py-2 text-right font-semibold text-slate-900">
                  Cost
                </th>
                <th class="px-4 py-2 text-right font-semibold text-slate-900">
                  Scholarship
                </th>
                <th class="px-4 py-2 text-right font-semibold text-slate-900">
                  Aid/Grants
                </th>
                <th class="px-4 py-2 text-right font-semibold text-slate-900">
                  Your Cost
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="year in inputs.years"
                :key="year"
                class="border-b border-slate-300"
              >
                <td class="px-4 py-2 font-medium text-slate-900">
                  Year {{ year }}
                </td>
                <td class="px-4 py-2 text-right text-slate-900">
                  {{ formatCurrency(inputs.annualCost) }}
                </td>
                <td class="px-4 py-2 text-right font-semibold text-emerald-600">
                  -{{ formatCurrency(annualScholarship) }}
                </td>
                <td class="px-4 py-2 text-right font-semibold text-blue-600">
                  -{{ formatCurrency(inputs.additionalAid) }}
                </td>
                <td class="px-4 py-2 text-right font-bold text-red-600">
                  {{ formatCurrency(annualNetCost) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Action Buttons -->
      <div v-if="onSaveValue" class="flex gap-3 border-t border-slate-300 pt-4">
        <button
          @click="saveToOffer"
          class="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
        >
          Save to Offer
        </button>
        <button
          @click="reset"
          class="flex-1 rounded-lg bg-slate-50 px-4 py-2 font-semibold text-slate-900 transition hover:bg-slate-100"
        >
          Reset
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

interface Props {
  schoolName?: string;
  initialAmount?: number;
  initialPercentage?: number;
  onSaveValue?: (amount: number, percentage: number) => void;
}

const props = withDefaults(defineProps<Props>(), {
  schoolName: undefined,
  initialAmount: undefined,
  initialPercentage: undefined,
  onSaveValue: undefined,
});

const showCalculator = ref(false);
const inputs = ref({
  annualCost: 60000,
  scholarshipAmount: props.initialAmount || 0,
  scholarshipPercentage: props.initialPercentage || 0,
  additionalAid: 0,
  years: 4,
});

const annualScholarship = computed(() => {
  if (inputs.value.scholarshipAmount > 0) {
    return inputs.value.scholarshipAmount;
  } else if (inputs.value.scholarshipPercentage > 0) {
    return (inputs.value.annualCost * inputs.value.scholarshipPercentage) / 100;
  }
  return 0;
});

const annualNetCost = computed(() => {
  return (
    inputs.value.annualCost -
    annualScholarship.value -
    inputs.value.additionalAid
  );
});

const totalScholarship = computed(() => {
  return annualScholarship.value * inputs.value.years;
});

const totalNetCost = computed(() => {
  return annualNetCost.value * inputs.value.years;
});

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const saveToOffer = () => {
  if (props.onSaveValue) {
    const percentage =
      inputs.value.scholarshipPercentage > 0
        ? inputs.value.scholarshipPercentage
        : Math.round(
            (annualScholarship.value / inputs.value.annualCost) * 100 * 100,
          ) / 100;

    props.onSaveValue(annualScholarship.value, percentage);
    showCalculator.value = false;
  }
};

const reset = () => {
  inputs.value.scholarshipAmount = props.initialAmount || 0;
  inputs.value.scholarshipPercentage = props.initialPercentage || 0;
};
</script>
