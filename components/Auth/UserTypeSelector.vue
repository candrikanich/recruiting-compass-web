<template>
  <fieldset>
    <legend class="sr-only" id="user-type-legend">Select your role</legend>
    <div class="mb-5">
      <p class="text-xl font-bold text-slate-800">Select Your Role</p>
      <p class="text-sm text-slate-500 mt-1">
        Choose the account type that best fits your needs
      </p>
    </div>
    <div role="radiogroup" aria-labelledby="user-type-legend" class="space-y-3">
      <!-- Parent Option -->
      <label
        :for="`user-type-parent-${uid}`"
        data-testid="user-type-parent"
        :class="[
          'flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500',
          selected === 'parent'
            ? 'bg-emerald-50 border-emerald-500'
            : 'border-slate-200 hover:border-emerald-400 bg-white',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
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
            'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
            selected === 'parent' ? 'bg-emerald-500' : 'bg-emerald-100',
          ]"
        >
          <UserCircleIcon
            :class="[
              'w-7 h-7',
              selected === 'parent' ? 'text-white' : 'text-emerald-600',
            ]"
          />
        </div>
        <div class="flex-1 min-w-0">
          <p
            :class="[
              'font-semibold text-base',
              selected === 'parent' ? 'text-emerald-800' : 'text-slate-800',
            ]"
          >
            Parent
          </p>
          <p
            :class="[
              'text-sm mt-0.5',
              selected === 'parent' ? 'text-emerald-600' : 'text-slate-500',
            ]"
          >
            Manage your family's recruiting profile
          </p>
        </div>
        <div
          :class="[
            'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center',
            selected === 'parent'
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-slate-300',
          ]"
        >
          <div
            v-if="selected === 'parent'"
            class="w-2 h-2 rounded-full bg-white"
          />
        </div>
      </label>

      <!-- Player Option -->
      <label
        :for="`user-type-player-${uid}`"
        data-testid="user-type-player"
        :class="[
          'flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500',
          selected === 'player'
            ? 'bg-emerald-50 border-emerald-500'
            : 'border-slate-200 hover:border-emerald-400 bg-white',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
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
            'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
            selected === 'player' ? 'bg-emerald-500' : 'bg-emerald-100',
          ]"
        >
          <TrophyIcon
            :class="[
              'w-7 h-7',
              selected === 'player' ? 'text-white' : 'text-emerald-600',
            ]"
          />
        </div>
        <div class="flex-1 min-w-0">
          <p
            :class="[
              'font-semibold text-base',
              selected === 'player' ? 'text-emerald-800' : 'text-slate-800',
            ]"
          >
            Player
          </p>
          <p
            :class="[
              'text-sm mt-0.5',
              selected === 'player' ? 'text-emerald-600' : 'text-slate-500',
            ]"
          >
            Track your athletic performance and recruiting journey
          </p>
        </div>
        <div
          :class="[
            'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center',
            selected === 'player'
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-slate-300',
          ]"
        >
          <div
            v-if="selected === 'player'"
            class="w-2 h-2 rounded-full bg-white"
          />
        </div>
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { useId } from "vue";
import { UserCircleIcon, TrophyIcon } from "@heroicons/vue/24/outline";

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
