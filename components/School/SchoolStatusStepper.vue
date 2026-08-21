<template>
  <div :class="isNotPursuing ? 'opacity-60' : ''">
    <!-- Progress track -->
    <ol class="flex items-start" :aria-disabled="updating ? 'true' : 'false'">
      <li
        v-for="(node, index) in nodes"
        :key="node.value"
        class="flex items-start"
        :class="index === 0 ? '' : 'flex-1'"
      >
        <!-- Connector into this node -->
        <span
          v-if="index > 0"
          class="mt-4 h-0.5 flex-1 rounded-full"
          :class="node.connectorDone ? 'bg-blue-600' : 'bg-slate-200'"
          aria-hidden="true"
        />

        <div class="flex flex-col items-center gap-1.5" :class="index > 0 ? 'px-1' : 'pr-1'">
          <button
            type="button"
            :disabled="updating || isNotPursuing"
            :aria-label="node.ariaLabel"
            :aria-current="node.state === 'current' ? 'step' : undefined"
            class="flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 disabled:cursor-not-allowed"
            :class="nodeCircleClass(node.state)"
            @click="emit('select', node.value)"
          >
            <UIcon
              v-if="node.state === 'completed'"
              name="i-heroicons-check"
              class="h-4 w-4"
              aria-hidden="true"
            />
            <span v-else>{{ index + 1 }}</span>
          </button>
          <span
            class="text-center text-xs leading-tight"
            :class="node.state === 'current' ? 'font-semibold text-slate-900' : 'text-slate-500'"
          >
            {{ node.label }}
          </span>
        </div>
      </li>
    </ol>

    <!-- Off-ramp: not pursuing banner -->
    <div
      v-if="isNotPursuing"
      class="mt-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5"
    >
      <span class="text-sm font-medium text-red-700">Not pursuing</span>
      <button
        type="button"
        data-testid="reactivate-status"
        :disabled="updating"
        class="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-xs ring-1 ring-red-200 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
        @click="emit('select', 'researching')"
      >
        Reactivate
      </button>
    </div>

    <!-- Off-ramp: mark not pursuing -->
    <div v-else class="mt-4 flex justify-center">
      <button
        type="button"
        data-testid="mark-not-pursuing"
        :disabled="updating"
        class="text-xs font-medium text-slate-400 underline-offset-2 transition hover:text-red-600 hover:underline focus:outline-none focus:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="emit('select', 'not_pursuing')"
      >
        Mark not pursuing
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  SCHOOL_STATUS_OPTIONS,
  getSchoolStatusLabel,
  type SchoolStatusValue,
} from "~/utils/schoolStatusOptions";

const props = withDefaults(
  defineProps<{
    status: SchoolStatusValue;
    updating?: boolean;
  }>(),
  { updating: false },
);

const emit = defineEmits<{
  select: [value: SchoolStatusValue];
}>();

type NodeState = "completed" | "current" | "upcoming";

/** The 5 monotonic progress stages — `not_pursuing` is a terminal off-ramp, not a node. */
const PROGRESS_STAGES = SCHOOL_STATUS_OPTIONS.filter(
  (option) => option.value !== "not_pursuing",
);

const isNotPursuing = computed(() => props.status === "not_pursuing");

/** Index of the active stage in the progress track; -1 when off-ramped. */
const currentIndex = computed(() =>
  PROGRESS_STAGES.findIndex((stage) => stage.value === props.status),
);

const nodeLabel = (value: SchoolStatusValue): string =>
  value === "offer_received" ? "Offer" : getSchoolStatusLabel(value);

const nodes = computed(() =>
  PROGRESS_STAGES.map((stage, index) => {
    const state: NodeState =
      index < currentIndex.value
        ? "completed"
        : index === currentIndex.value
          ? "current"
          : "upcoming";
    const label = nodeLabel(stage.value);
    const stateWord =
      state === "current" ? "current stage" : `${state}`;
    return {
      value: stage.value,
      label,
      state,
      connectorDone: index <= currentIndex.value,
      ariaLabel: `Set status to ${getSchoolStatusLabel(stage.value)} (${stateWord})`,
    };
  }),
);

const nodeCircleClass = (state: NodeState): string => {
  if (state === "completed") {
    return "border-blue-600 bg-blue-600 text-white";
  }
  if (state === "current") {
    return "border-blue-600 bg-white text-blue-700 ring-2 ring-blue-200";
  }
  return "border-slate-300 bg-white text-slate-400";
};
</script>
