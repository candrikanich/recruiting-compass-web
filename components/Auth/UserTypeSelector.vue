<template>
  <fieldset class="space-y-4">
    <legend class="text-slate-600 text-sm font-medium" id="user-type-legend">
      I'm a:
    </legend>
    <div
      role="radiogroup"
      aria-labelledby="user-type-legend"
      class="grid grid-cols-2 gap-3"
    >
      <!-- Player Option -->
      <label
        :for="`user-type-player-${uid}`"
        :class="[
          'relative px-4 py-3 rounded-lg border-2 transition-all font-medium cursor-pointer focus-within:ring-2 focus-within:ring-offset-2',
          selected === 'player'
            ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500 ring-offset-2'
            : 'border-slate-200 hover:border-blue-500 text-slate-700',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ]"
      >
        <input
          :id="`user-type-player-${uid}`"
          data-testid="user-type-player"
          type="radio"
          name="userType"
          value="player"
          :checked="selected === 'player'"
          :disabled="disabled"
          @change="selectType('player')"
          class="sr-only"
        />
        <span class="block text-center">I'm a Player</span>
      </label>

      <!-- Parent Option -->
      <label
        :for="`user-type-parent-${uid}`"
        :class="[
          'relative px-4 py-3 rounded-lg border-2 transition-all font-medium cursor-pointer focus-within:ring-2 focus-within:ring-offset-2',
          selected === 'parent'
            ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500 ring-offset-2'
            : 'border-slate-200 hover:border-blue-500 text-slate-700',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ]"
      >
        <input
          :id="`user-type-parent-${uid}`"
          data-testid="user-type-parent"
          type="radio"
          name="userType"
          value="parent"
          :checked="selected === 'parent'"
          :disabled="disabled"
          @change="selectType('parent')"
          class="sr-only"
        />
        <span class="block text-center">I'm a Parent</span>
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { useId } from "vue";

defineProps<{
  selected: "player" | "parent" | null;
  disabled: boolean;
}>();

const emit = defineEmits<{
  select: ["player" | "parent"];
}>();

// Generate unique ID for radio buttons
const uid = useId();

const selectType = (type: "player" | "parent") => {
  emit("select", type);
};
</script>
