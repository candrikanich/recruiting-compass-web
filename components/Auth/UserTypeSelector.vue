<template>
  <fieldset>
    <legend class="sr-only" id="user-type-legend">Select your role</legend>
    <div class="mb-5">
      <p class="text-xl font-bold text-slate-800">Select Your Role</p>
      <p class="mt-1 text-sm text-slate-500">
        Choose the account type that best fits your needs
      </p>
    </div>
    <div role="radiogroup" aria-labelledby="user-type-legend" class="space-y-3">
      <!-- Parent Option -->
      <label
        :for="`user-type-parent-${uid}`"
        data-testid="user-type-parent"
        :class="[
          'flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2',
          selected === 'parent'
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-slate-200 bg-white hover:border-emerald-400',
          disabled ? 'cursor-not-allowed opacity-50' : '',
        ]"
      >
        <input
          :id="`user-type-parent-${uid}`"
          type="radio"
          name="userType"
          value="parent"
          :checked="selected === 'parent'"
          :disabled="disabled"
          @change="selectType('parent')"
          class="sr-only"
        />
        <div
          :class="[
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            selected === 'parent' ? 'bg-emerald-500' : 'bg-emerald-100',
          ]"
        >
          <UIcon
            name="i-heroicons-user-circle"
            :class="[
              'h-7 w-7',
              selected === 'parent' ? 'text-white' : 'text-emerald-600',
            ]"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p
            :class="[
              'text-base font-semibold',
              selected === 'parent' ? 'text-emerald-800' : 'text-slate-800',
            ]"
          >
            Parent
          </p>
          <p
            :class="[
              'mt-0.5 text-sm',
              selected === 'parent' ? 'text-emerald-600' : 'text-slate-500',
            ]"
          >
            Manage your family's recruiting profile
          </p>
        </div>
        <div
          :class="[
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
            selected === 'parent'
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-slate-300',
          ]"
        >
          <div
            v-if="selected === 'parent'"
            class="h-2 w-2 rounded-full bg-white"
          />
        </div>
      </label>

      <!-- Player Option -->
      <label
        :for="`user-type-player-${uid}`"
        data-testid="user-type-player"
        :class="[
          'flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2',
          selected === 'player'
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-slate-200 bg-white hover:border-emerald-400',
          disabled ? 'cursor-not-allowed opacity-50' : '',
        ]"
      >
        <input
          :id="`user-type-player-${uid}`"
          type="radio"
          name="userType"
          value="player"
          :checked="selected === 'player'"
          :disabled="disabled"
          @change="selectType('player')"
          class="sr-only"
        />
        <div
          :class="[
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            selected === 'player' ? 'bg-emerald-500' : 'bg-emerald-100',
          ]"
        >
          <UIcon
            name="i-heroicons-trophy"
            :class="[
              'h-7 w-7',
              selected === 'player' ? 'text-white' : 'text-emerald-600',
            ]"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p
            :class="[
              'text-base font-semibold',
              selected === 'player' ? 'text-emerald-800' : 'text-slate-800',
            ]"
          >
            Player
          </p>
          <p
            :class="[
              'mt-0.5 text-sm',
              selected === 'player' ? 'text-emerald-600' : 'text-slate-500',
            ]"
          >
            Track your athletic performance and recruiting journey
          </p>
        </div>
        <div
          :class="[
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
            selected === 'player'
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-slate-300',
          ]"
        >
          <div
            v-if="selected === 'player'"
            class="h-2 w-2 rounded-full bg-white"
          />
        </div>
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

const uid = useId();

const selectType = (type: "player" | "parent") => {
  emit("select", type);
};
</script>
