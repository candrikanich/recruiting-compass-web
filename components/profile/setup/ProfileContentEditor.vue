<!-- components/profile/setup/ProfileContentEditor.vue -->
<script setup lang="ts">
import { ref } from "vue";
import type { ProfileAward } from "~/types/models";

const BIO_MAX = 300;
const LOOKING_FOR_MAX = 600;
const VALUES_MAX_TAGS = 12;
const VALUE_TAG_MAX_LENGTH = 60;

const props = defineProps<{
  bio: string;
  lookingFor: string;
  awards: ProfileAward[];
  valuesTags: string[];
}>();

const emit = defineEmits<{
  "update:bio": [value: string];
  "update:lookingFor": [value: string];
  "update:awards": [awards: ProfileAward[]];
  "update:valuesTags": [tags: string[]];
}>();

const newValueTag = ref("");

function onBioInput(event: Event) {
  emit("update:bio", (event.target as HTMLTextAreaElement).value);
}

function onLookingForInput(event: Event) {
  emit("update:lookingFor", (event.target as HTMLTextAreaElement).value);
}

function addAward() {
  emit("update:awards", [...props.awards, { title: "", year: null }]);
}

function removeAward(index: number) {
  emit(
    "update:awards",
    props.awards.filter((_, i) => i !== index),
  );
}

function updateAwardTitle(index: number, title: string) {
  emit(
    "update:awards",
    props.awards.map((award, i) => (i === index ? { ...award, title } : award)),
  );
}

function updateAwardYear(index: number, rawYear: string) {
  const year = rawYear.trim() === "" ? null : Number(rawYear);
  emit(
    "update:awards",
    props.awards.map((award, i) =>
      i === index ? { ...award, year: year === null || Number.isNaN(year) ? null : year } : award,
    ),
  );
}

function addValueTag() {
  const tag = newValueTag.value.trim().slice(0, VALUE_TAG_MAX_LENGTH);
  if (!tag) return;
  if (props.valuesTags.length >= VALUES_MAX_TAGS) return;
  if (props.valuesTags.includes(tag)) return;

  emit("update:valuesTags", [...props.valuesTags, tag]);
  newValueTag.value = "";
}

function removeValueTag(index: number) {
  emit(
    "update:valuesTags",
    props.valuesTags.filter((_, i) => i !== index),
  );
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <label class="mb-2 block text-sm font-medium text-brand-slate-700" for="profile-bio">Bio</label>
      <textarea
        id="profile-bio"
        data-test="bio-textarea"
        :value="bio"
        :maxlength="BIO_MAX"
        rows="4"
        placeholder="Tell coaches about yourself..."
        class="w-full resize-none rounded-xl border-2 border-brand-slate-300 bg-white px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-brand-blue-500"
        @input="onBioInput"
      />
      <p class="mt-1 text-xs text-brand-slate-500">{{ bio.length }}/{{ BIO_MAX }} characters</p>
    </div>

    <div>
      <label class="mb-2 block text-sm font-medium text-brand-slate-700" for="profile-looking-for">
        What I'm Looking For
      </label>
      <textarea
        id="profile-looking-for"
        data-test="looking-for-textarea"
        :value="lookingFor"
        :maxlength="LOOKING_FOR_MAX"
        rows="4"
        placeholder="Describe the program, culture, or opportunity you're looking for..."
        class="w-full resize-none rounded-xl border-2 border-brand-slate-300 bg-white px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-brand-blue-500"
        @input="onLookingForInput"
      />
      <p class="mt-1 text-xs text-brand-slate-500">{{ lookingFor.length }}/{{ LOOKING_FOR_MAX }} characters</p>
    </div>

    <div>
      <div class="mb-2 flex items-center justify-between">
        <h3 class="text-sm font-medium text-brand-slate-700">Awards</h3>
        <DesignSystemButton
          data-test="add-award"
          type="button"
          variant="outline"
          color="slate"
          size="sm"
          @click="addAward"
        >
          Add Award
        </DesignSystemButton>
      </div>

      <ul class="flex flex-col gap-3">
        <li
          v-for="(award, index) in awards"
          :key="index"
          class="flex items-end gap-3 rounded-lg border border-brand-slate-200 bg-white p-3"
        >
          <div class="min-w-0 flex-1">
            <label class="mb-1 block text-xs font-medium text-brand-slate-700" :for="`award-title-${index}`">
              Title
            </label>
            <input
              :id="`award-title-${index}`"
              type="text"
              :value="award.title"
              placeholder="e.g. All-Conference"
              class="w-full rounded-xl border-2 border-brand-slate-300 bg-white px-3 py-2"
              @input="(event: Event) => updateAwardTitle(index, (event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="w-28 shrink-0">
            <label class="mb-1 block text-xs font-medium text-brand-slate-700" :for="`award-year-${index}`">
              Year
            </label>
            <input
              :id="`award-year-${index}`"
              type="number"
              :value="award.year === null ? '' : award.year"
              class="w-full rounded-xl border-2 border-brand-slate-300 bg-white px-3 py-2"
              @input="(event: Event) => updateAwardYear(index, (event.target as HTMLInputElement).value)"
            />
          </div>
          <DesignSystemButton
            data-test="remove-award"
            type="button"
            variant="ghost"
            color="red"
            size="sm"
            aria-label="Remove award"
            @click="removeAward(index)"
          >
            Remove
          </DesignSystemButton>
        </li>
      </ul>
    </div>

    <div>
      <h3 class="mb-2 text-sm font-medium text-brand-slate-700">Values</h3>
      <div class="mb-2 flex flex-wrap gap-2">
        <span
          v-for="(tag, index) in valuesTags"
          :key="tag"
          class="inline-flex items-center gap-1 rounded-full bg-brand-blue-100 px-3 py-1 text-sm text-brand-blue-700"
        >
          {{ tag }}
          <button
            type="button"
            data-test="remove-value-tag"
            class="text-brand-blue-500 hover:text-brand-blue-700"
            :aria-label="`Remove ${tag}`"
            @click="removeValueTag(index)"
          >
            &times;
          </button>
        </span>
      </div>
      <label class="mb-1 block text-xs font-medium text-brand-slate-700" for="profile-values-input">
        Add a value
      </label>
      <input
        id="profile-values-input"
        data-test="values-input"
        type="text"
        :value="newValueTag"
        :maxlength="VALUE_TAG_MAX_LENGTH"
        :disabled="valuesTags.length >= VALUES_MAX_TAGS"
        placeholder="e.g. Academics"
        class="w-full rounded-xl border-2 border-brand-slate-300 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        @input="(event: Event) => (newValueTag = (event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="addValueTag"
      />
      <p class="mt-1 text-xs text-brand-slate-500">{{ valuesTags.length }}/{{ VALUES_MAX_TAGS }} tags</p>
    </div>
  </div>
</template>
