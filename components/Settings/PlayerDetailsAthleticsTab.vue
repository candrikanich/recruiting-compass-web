<template>
  <div class="space-y-6">
    <!-- Physical Stats -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2
        class="text-base font-bold text-slate-900 mb-6 flex items-center gap-2"
      >
        <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-blue-600" />
        Physical Profile
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Height/Weight Row -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label
              class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
              >Height</label
            >
            <div class="flex gap-2">
              <select
                v-model="heightFeet"
                :disabled="isParentRole"
                @change="triggerSave"
                class="flex-1 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500 font-medium text-slate-700"
              >
                <option v-for="ft in [4, 5, 6, 7]" :key="ft" :value="ft">
                  {{ ft }}'
                </option>
              </select>
              <select
                v-model="heightInches"
                :disabled="isParentRole"
                @change="triggerSave"
                class="flex-1 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500 font-medium text-slate-700"
              >
                <option v-for="i in 12" :key="i - 1" :value="i - 1">
                  {{ i - 1 }}"
                </option>
              </select>
            </div>
          </div>
          <div>
            <label
              class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
              >Weight (lbs)</label
            >
            <input
              v-model.number="form.weight_lbs"
              :disabled="isParentRole"
              type="number"
              @blur="triggerSave"
              placeholder="185"
              class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition font-medium text-slate-700"
            />
          </div>
        </div>

        <!-- Bats/Throws (Sport Specific) -->
        <div v-if="isBaseballOrSoftball" class="grid grid-cols-2 gap-4">
          <div>
            <label
              class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
              >Bats</label
            >
            <div class="flex p-1 bg-slate-100 rounded-xl">
              <button
                v-for="opt in batsOptions"
                :key="opt.value"
                type="button"
                @click="
                  form.bats = opt.value;
                  triggerSave();
                "
                :class="[
                  'flex-1 py-1.5 text-xs font-bold rounded-lg transition-all',
                  form.bats === opt.value
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                ]"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div>
            <label
              class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
              >Throws</label
            >
            <div class="flex p-1 bg-slate-100 rounded-xl">
              <button
                v-for="opt in throwsOptions"
                :key="opt.value"
                type="button"
                @click="
                  form.throws = opt.value;
                  triggerSave();
                "
                :class="[
                  'flex-1 py-1.5 text-xs font-bold rounded-lg transition-all',
                  form.throws === opt.value
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                ]"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Positions -->
      <div class="mt-8 pt-8 border-t border-slate-100">
        <label
          class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1"
          >Positions You Play</label
        >
        <div v-if="availablePositions.length > 0" class="flex flex-wrap gap-2">
          <button
            v-for="pos in availablePositions"
            :key="pos"
            type="button"
            :disabled="isParentRole"
            @click="
              togglePosition(pos);
              triggerSave();
            "
            :class="[
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-2',
              isPositionSelected(pos)
                ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105 z-10'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300',
            ]"
          >
            {{ pos }}
          </button>
        </div>
        <p v-else class="text-sm text-slate-400 italic">
          Select a sport on the Basics tab to see positions.
        </p>
      </div>
    </div>

    <!-- External IDs -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2 class="text-base font-bold text-slate-900 mb-6">
        Recruiting Database IDs
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
            >NCAA ID</label
          >
          <input
            v-model="form.ncaa_id"
            @blur="triggerSave"
            placeholder="ID Number"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
          />
        </div>
        <template v-if="isBaseballOrSoftball">
          <div>
            <label
              class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
              >Perfect Game ID</label
            >
            <input
              v-model="form.perfect_game_id"
              @blur="triggerSave"
              placeholder="ID Number"
              class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>
          <div>
            <label
              class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
              >Prep Baseball ID</label
            >
            <input
              v-model="form.prep_baseball_id"
              @blur="triggerSave"
              placeholder="ID Number"
              class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- Video Links -->
    <div
      class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div class="p-5 border-b border-slate-100 bg-slate-50/50">
        <h2 class="text-base font-bold text-slate-900">Video Links</h2>
        <p class="text-xs text-slate-500 font-medium">
          Hudl, YouTube, or Vimeo highlight reels for recruiters.
        </p>
      </div>
      <div class="p-6 space-y-4">
        <div
          v-for="(link, idx) in form.video_links"
          :key="idx"
          class="flex items-center gap-3"
        >
          <select
            :value="(form.video_links ?? [])[idx].platform"
            :disabled="isParentRole"
            @change="
              (e) => {
                form.video_links = (form.video_links ?? []).map((l, i) =>
                  i === idx
                    ? {
                        ...l,
                        platform: (e.target as HTMLSelectElement).value as
                          'hudl' | 'youtube' | 'vimeo',
                      }
                    : l,
                );
                triggerSave();
              }
            "
            class="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
          >
            <option value="hudl">Hudl</option>
            <option value="youtube">YouTube</option>
            <option value="vimeo">Vimeo</option>
          </select>
          <input
            :value="(form.video_links ?? [])[idx].url"
            :disabled="isParentRole"
            type="url"
            placeholder="https://..."
            @blur="
              (e) => {
                form.video_links = (form.video_links ?? []).map((l, i) =>
                  i === idx
                    ? { ...l, url: (e.target as HTMLInputElement).value }
                    : l,
                );
                triggerSave();
              }
            "
            class="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
          />
          <input
            :value="(form.video_links ?? [])[idx].title"
            :disabled="isParentRole"
            type="text"
            placeholder="Title (optional)"
            @blur="
              (e) => {
                form.video_links = (form.video_links ?? []).map((l, i) =>
                  i === idx
                    ? {
                        ...l,
                        title: (e.target as HTMLInputElement).value,
                      }
                    : l,
                );
                triggerSave();
              }
            "
            class="w-32 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
          />
          <button
            v-if="!isParentRole"
            @click="removeVideoLink(idx)"
            type="button"
            class="p-2 text-slate-400 hover:text-red-500 transition rounded-lg hover:bg-red-50"
            title="Remove"
          >
            <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
          </button>
        </div>

        <button
          v-if="!isParentRole && (form.video_links ?? []).length < 5"
          @click="addVideoLink"
          type="button"
          class="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 py-2"
        >
          <UIcon name="i-heroicons-plus" class="w-4 h-4" />
          Add Video Link
        </button>
        <p
          v-if="(form.video_links ?? []).length >= 5"
          class="text-xs text-slate-500"
        >
          Maximum 5 video links.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PlayerDetails } from "~/types/models";

defineProps<{
  form: PlayerDetails;
  isParentRole: boolean;
  isBaseballOrSoftball: boolean;
  availablePositions: string[];
  triggerSave: () => void;
  togglePosition: (pos: string) => void;
  isPositionSelected: (pos: string) => boolean;
  addVideoLink: () => void;
  removeVideoLink: (idx: number) => void;
  batsOptions: readonly { value: "R" | "L" | "S"; label: string }[];
  throwsOptions: readonly { value: "R" | "L"; label: string }[];
}>();

const heightFeet = defineModel<number | undefined>("heightFeet");
const heightInches = defineModel<number | undefined>("heightInches");
</script>
