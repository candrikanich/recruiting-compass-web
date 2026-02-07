<template>
  <fieldset class="space-y-4">
    <legend class="text-slate-600 text-sm font-medium">I'm a:</legend>
    <div class="grid grid-cols-2 gap-3">
      <button
        id="user-type-player"
        data-testid="user-type-player"
        type="button"
        @click="selectType('player')"
        :disabled="disabled"
        :aria-pressed="selected === 'player'"
        :class="[
          'px-4 py-3 rounded-lg border-2 transition-all font-medium focus:ring-2 focus:ring-offset-2 focus:outline-2 focus:outline-offset-2',
          selected === 'player'
            ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500 ring-offset-2 outline-blue-600'
            : 'border-slate-200 hover:border-blue-500 text-slate-700 focus:ring-blue-500 focus:outline-blue-600',
        ]"
      >
        I'm a Player
      </button>
      <button
        id="user-type-parent"
        data-testid="user-type-parent"
        type="button"
        @click="selectType('parent')"
        :disabled="disabled"
        :aria-pressed="selected === 'parent'"
        :class="[
          'px-4 py-3 rounded-lg border-2 transition-all font-medium focus:ring-2 focus:ring-offset-2 focus:outline-2 focus:outline-offset-2',
          selected === 'parent'
            ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500 ring-offset-2 outline-blue-600'
            : 'border-slate-200 hover:border-blue-500 text-slate-700 focus:ring-blue-500 focus:outline-blue-600',
        ]"
      >
        I'm a Parent
      </button>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
defineProps<{
  selected: "player" | "parent" | null;
  disabled: boolean;
}>();

const emit = defineEmits<{
  select: ["player" | "parent"];
}>();

const selectType = (type: "player" | "parent") => {
  emit("select", type);
};
</script>

<style scoped>
button[data-testid^="user-type-"]:disabled {
  @apply opacity-50 cursor-not-allowed;
}
</style>
