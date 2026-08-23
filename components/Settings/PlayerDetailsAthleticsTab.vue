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
      </div>
    </div>

    <!-- Sport-Specific Details -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2
        class="text-base font-bold text-slate-900 mb-6 flex items-center gap-2"
      >
        <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-blue-600" />
        {{ sportLabel }}
      </h2>

      <!-- Sport attributes (registry-driven: bats/throws for baseball, shooting
           hand for basketball, etc. — gated by sport and, where set, position). -->
      <div v-if="attributes.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="a in attributes" :key="a.key">
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
            >{{ a.label }}</label
          >
          <select
            :value="attrValue(a.key)"
            :disabled="isParentRole"
            @change="
              setAttrValue(a.key, ($event.target as HTMLSelectElement).value)
            "
            :aria-label="a.label"
            class="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500 font-medium text-slate-700"
          >
            <option value="">—</option>
            <option v-for="opt in a.options" :key="opt" :value="opt">
              {{ a.optionLabels[opt] }}
            </option>
          </select>
        </div>
      </div>

      <!-- Positions -->
      <div
        :class="attributes.length ? 'mt-8 pt-8 border-t border-slate-100' : ''"
      >
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

        <!-- Priority order: index 0 = primary, 1 = secondary. This is what coach
             outreach, the recruiting packet, and your public profile show. -->
        <div v-if="orderedSelected.length" class="mt-6">
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1"
            >Position Priority</label
          >
          <p class="text-xs text-slate-500 mb-3 ml-1">
            Order matters — your first pick is what coaches see (they recruit
            for specific positions).
          </p>
          <ul class="space-y-2">
            <li
              v-for="(pos, i) in orderedSelected"
              :key="pos"
              class="flex items-center gap-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <span
                v-if="i < 2"
                :class="[
                  'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide',
                  i === 0
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-600',
                ]"
                >{{ i === 0 ? "Primary" : "Secondary" }}</span
              >
              <span
                v-else
                class="w-5 text-center text-xs font-bold text-slate-400"
                >{{ i + 1 }}</span
              >
              <span class="font-semibold text-slate-700 text-sm">{{
                pos
              }}</span>
              <span class="text-xs font-mono text-slate-400">{{
                abbrev(pos)
              }}</span>
              <div class="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  :disabled="i === 0 || isParentRole"
                  @click="reorder(i, 'up')"
                  class="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-white transition"
                  :aria-label="`Move ${pos} up`"
                >
                  <UIcon name="i-heroicons-chevron-up" class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  :disabled="i === orderedSelected.length - 1 || isParentRole"
                  @click="reorder(i, 'down')"
                  class="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-white transition"
                  :aria-label="`Move ${pos} down`"
                >
                  <UIcon name="i-heroicons-chevron-down" class="w-4 h-4" />
                </button>
              </div>
            </li>
          </ul>
        </div>
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
          <a
            href="https://web3.ncaa.org/ecwr3/"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 mt-1.5 ml-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Register at NCAA Eligibility Center
            <UIcon
              name="i-heroicons-arrow-top-right-on-square"
              class="w-3 h-3"
            />
          </a>
        </div>
        <!-- Recruiting services (registry-driven, gated by primary sport). -->
        <div v-for="svc in services" :key="svc.key">
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
            >{{ svc.label }}</label
          >
          <!-- Prep Baseball Report: pick the filing state; the profile slug is
               derived from the athlete's name, so the link builds itself. -->
          <template v-if="svc.linkKind === 'prepBaseball'">
            <select
              :value="prepBaseballState"
              :disabled="isParentRole"
              @change="
                setPrepBaseballState(($event.target as HTMLSelectElement).value)
              "
              aria-label="Prep Baseball Report state"
              class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="">State</option>
              <option
                v-for="opt in US_STATE_OPTIONS"
                :key="opt.code"
                :value="opt.code"
              >
                {{ opt.name }}
              </option>
            </select>
            <p v-if="prepBaseballPreviewUrl" class="mt-1.5 ml-1 text-xs">
              <span class="text-slate-500">Your profile link: </span>
              <a
                :href="prepBaseballPreviewUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:text-blue-700 break-all"
                >{{ prepBaseballPreviewUrl }}</a
              >
            </p>
          </template>
          <input
            v-else
            :value="serviceValue(svc.key)"
            :disabled="isParentRole"
            :type="svc.valueKind === 'url' ? 'url' : 'text'"
            :placeholder="svc.placeholder"
            @input="
              setServiceValue(svc.key, ($event.target as HTMLInputElement).value)
            "
            @blur="triggerSave"
            :aria-label="svc.label"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
          />
          <a
            :href="svc.signupUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 mt-1.5 ml-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Get your profile
            <UIcon
              name="i-heroicons-arrow-top-right-on-square"
              class="w-3 h-3"
            />
          </a>
        </div>
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
          v-for="link in videoLinks.links.value"
          :key="link.id"
          class="flex items-center gap-3"
        >
          <DesignSystemFormSegmentedControl
            label="Video platform"
            hide-label
            :block="false"
            size="sm"
            :model-value="link.platform"
            :disabled="isParentRole"
            :options="[
              { value: 'hudl', label: 'Hudl' },
              { value: 'youtube', label: 'YouTube' },
              { value: 'vimeo', label: 'Vimeo' },
              { value: 'other', label: 'Other' },
            ]"
            @update:model-value="
              (v) =>
                handleUpdate(link.id, {
                  platform: v as 'hudl' | 'youtube' | 'vimeo' | 'other',
                })
            "
          />
          <input
            :value="link.url"
            :disabled="isParentRole"
            type="url"
            placeholder="https://..."
            @blur="
              (e) =>
                handleUpdate(link.id, {
                  url: (e.target as HTMLInputElement).value,
                })
            "
            class="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
          />
          <input
            :value="link.title"
            :disabled="isParentRole"
            type="text"
            placeholder="Title (optional)"
            @blur="
              (e) =>
                handleUpdate(link.id, {
                  title: (e.target as HTMLInputElement).value,
                })
            "
            class="w-32 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
          />
          <button
            v-if="!isParentRole"
            @click="handleRemove(link.id)"
            type="button"
            class="p-2 text-slate-400 hover:text-red-500 transition rounded-lg hover:bg-red-50"
            title="Remove"
          >
            <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
          </button>
        </div>

        <!-- Add form: a link is only created once the URL is valid, so we
             never POST a blank placeholder row. -->
        <div
          v-if="!isParentRole && videoLinks.links.value.length < 5"
          class="flex items-center gap-3"
        >
          <DesignSystemFormSegmentedControl
            label="Video platform"
            hide-label
            :block="false"
            size="sm"
            :model-value="newLinkPlatform"
            :options="[
              { value: 'hudl', label: 'Hudl' },
              { value: 'youtube', label: 'YouTube' },
              { value: 'vimeo', label: 'Vimeo' },
              { value: 'other', label: 'Other' },
            ]"
            @update:model-value="
              (v) => (newLinkPlatform = v as 'hudl' | 'youtube' | 'vimeo' | 'other')
            "
          />
          <input
            v-model="newLinkUrl"
            type="url"
            placeholder="https://..."
            class="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition"
          />
          <input
            v-model="newLinkTitle"
            type="text"
            placeholder="Title (optional)"
            class="w-32 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition"
          />
          <button
            @click="handleAdd"
            type="button"
            :disabled="!isNewLinkUrlValid"
            class="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 py-2 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <UIcon name="i-heroicons-plus" class="w-4 h-4" />
            Add
          </button>
        </div>
        <p
          v-if="videoLinks.links.value.length >= 5"
          class="text-xs text-slate-500"
        >
          Maximum 5 video links.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PlayerDetails } from "~/types/models";
import { useVideoLinks } from "~/composables/useVideoLinks";
import { useAppToast } from "~/composables/useAppToast";
import { abbreviatePosition } from "~/utils/positions/canonical";
import { attributesForSport } from "~/utils/attributes/canonical";
import { servicesForSport } from "~/utils/services/canonical";
import {
  US_STATE_OPTIONS,
  normalizeStateCode,
  buildPrepBaseballUrl,
} from "~/utils/recruitingLinks";

const props = defineProps<{
  form: PlayerDetails;
  isParentRole: boolean;
  availablePositions: string[];
  playerName: string;
  homeState: string;
  triggerSave: () => void;
  togglePosition: (pos: string) => void;
  isPositionSelected: (pos: string) => boolean;
  movePosition: (index: number, direction: "up" | "down") => void;
}>();

const heightFeet = defineModel<number | undefined>("heightFeet");
const heightInches = defineModel<number | undefined>("heightInches");

// The athlete's primary position (positions[0], with the legacy scalar as a
// fallback) — used to apply an attribute's optional position gate.
const primaryPosition = computed(
  () => props.form.positions?.[0] ?? props.form.primary_position ?? "",
);

// Attributes offered for the sport, minus any whose position gate excludes the
// athlete's primary position. Empty for sports without laterality attributes.
const attributes = computed(() =>
  attributesForSport(props.form.primary_sport).filter(
    (a) => !a.positions || a.positions.includes(primaryPosition.value),
  ),
);

// Recruiting services offered for the sport (NCSA everywhere, Hudl for team
// sports, Perfect Game / Prep Baseball for baseball & softball).
const services = computed(() => servicesForSport(props.form.primary_sport));

// Dynamic-key access into the flat player-details record. Mutating props.form
// is the established pattern here (the parent owns the reactive object and
// autosaves it); attribute changes save immediately, service text saves on blur.
const formRecord = computed(
  () => props.form as unknown as Record<string, unknown>,
);
const attrValue = (key: string) =>
  (formRecord.value[key] as string | undefined) ?? "";
const setAttrValue = (key: string, value: string) => {
  formRecord.value[key] = value || undefined;
  props.triggerSave();
};
const serviceValue = (key: string) =>
  (formRecord.value[key] as string | undefined) ?? "";
const setServiceValue = (key: string, value: string) => {
  formRecord.value[key] = value;
};

// Prep Baseball Report: the athlete picks the state their profile is filed
// under; the slug comes from their name, so the link resolves automatically.
const prepBaseballState = computed(
  () => (formRecord.value.prep_baseball_state as string | undefined) ?? "",
);
const setPrepBaseballState = (value: string) => {
  formRecord.value.prep_baseball_state = value || undefined;
  props.triggerSave();
};
const prepBaseballPreviewUrl = computed(() =>
  buildPrepBaseballUrl(prepBaseballState.value, props.playerName),
);

const sportLabel = computed(() =>
  props.form.primary_sport
    ? `${props.form.primary_sport} Details`
    : "Sport Details",
);

// Selected positions in priority order — index 0 = primary, 1 = secondary.
const orderedSelected = computed(() => props.form.positions ?? []);

const abbrev = (pos: string) =>
  abbreviatePosition(props.form.primary_sport, pos);

const reorder = (index: number, direction: "up" | "down") => {
  props.movePosition(index, direction);
  props.triggerSave();
};

const videoLinks = useVideoLinks();
const { showToast } = useAppToast();

onMounted(() => {
  videoLinks.load();

  // Pre-seed the PBR state with the athlete's home state (a high-confidence
  // guess) when it's offered for this sport and not already set.
  const offersPrepBaseball = services.value.some(
    (s) => s.linkKind === "prepBaseball",
  );
  if (
    offersPrepBaseball &&
    !props.isParentRole &&
    !prepBaseballState.value
  ) {
    const code = normalizeStateCode(props.homeState);
    if (code) formRecord.value.prep_baseball_state = code;
  }
});

const newLinkPlatform = ref<"hudl" | "youtube" | "vimeo" | "other">("hudl");
const newLinkUrl = ref("");
const newLinkTitle = ref("");

const isNewLinkUrlValid = computed(() => {
  try {
    new URL(newLinkUrl.value);
    return true;
  } catch {
    return false;
  }
});

// Each field edit lands on that row alone — the cron-written
// health_status/last_health_check on other rows is never touched.
const handleAdd = async () => {
  if (!isNewLinkUrlValid.value) return;
  try {
    await videoLinks.add({
      platform: newLinkPlatform.value,
      url: newLinkUrl.value,
      title: newLinkTitle.value.trim() || undefined,
    });
    newLinkPlatform.value = "hudl";
    newLinkUrl.value = "";
    newLinkTitle.value = "";
  } catch (err) {
    showToast(
      err instanceof Error ? err.message : "Failed to add video link",
      "error",
    );
  }
};

const handleUpdate = async (
  id: string,
  patch: {
    platform?: "hudl" | "youtube" | "vimeo" | "other";
    url?: string;
    title?: string;
  },
) => {
  try {
    await videoLinks.update(id, patch);
  } catch (err) {
    showToast(
      err instanceof Error ? err.message : "Failed to update video link",
      "error",
    );
  }
};

const handleRemove = async (id: string) => {
  try {
    await videoLinks.remove(id);
  } catch (err) {
    showToast(
      err instanceof Error ? err.message : "Failed to remove video link",
      "error",
    );
  }
};
</script>
