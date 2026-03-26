<!-- components/profile/ProfileSetup.vue -->
<script setup lang="ts">
import { usePlayerProfile } from "~/composables/usePlayerProfile";

const { profile, loading, error, publicUrl, updateProfile, fetchProfile } = usePlayerProfile();

const HEADER_COLORS = [
  { key: "slate",   label: "Slate",   swatch: "bg-slate-700" },
  { key: "blue",    label: "Blue",    swatch: "bg-blue-700" },
  { key: "indigo",  label: "Indigo",  swatch: "bg-indigo-700" },
  { key: "violet",  label: "Violet",  swatch: "bg-violet-700" },
  { key: "rose",    label: "Rose",    swatch: "bg-rose-700" },
  { key: "amber",   label: "Amber",   swatch: "bg-amber-600" },
  { key: "emerald", label: "Emerald", swatch: "bg-emerald-700" },
  { key: "teal",    label: "Teal",    swatch: "bg-teal-700" },
] as const;

// Local draft — synced from store, saved on blur/toggle
const draft = reactive({
  bio: "",
  vanity_slug: "",
  show_academics: true,
  show_athletic: true,
  show_film: true,
  show_schools: true,
  is_published: false,
  header_color: "slate",
});

watch(
  () => profile.value,
  (p) => {
    if (!p) return;
    draft.bio = p.bio ?? "";
    draft.vanity_slug = p.vanity_slug ?? "";
    draft.show_academics = p.show_academics;
    draft.show_athletic = p.show_athletic;
    draft.show_film = p.show_film;
    draft.show_schools = p.show_schools;
    draft.is_published = p.is_published;
    draft.header_color = p.header_color ?? "slate";
  },
  { immediate: true }
);

const saveError = ref<string | null>(null);
const saving = ref(false);

async function save(field: Parameters<typeof updateProfile>[0]) {
  saving.value = true;
  saveError.value = null;
  try {
    await updateProfile(field);
    Object.assign(draft, field);
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : "Failed to save";
  } finally {
    saving.value = false;
  }
}

const slugError = ref<string | null>(null);

function validateSlug(slug: string): boolean {
  if (!slug) return true; // empty is valid (clears vanity slug)
  if (!/^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/.test(slug)) {
    slugError.value = "Only lowercase letters, numbers, and hyphens. Min 2 chars.";
    return false;
  }
  slugError.value = null;
  return true;
}

function onSlugBlur() {
  if (validateSlug(draft.vanity_slug)) {
    save({ vanity_slug: draft.vanity_slug || null });
  }
}

function copyLink() {
  if (publicUrl.value) navigator.clipboard.writeText(publicUrl.value);
}
</script>

<template>
  <div v-if="loading" class="text-gray-400 text-sm">Loading profile settings…</div>

  <div v-else-if="error" class="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
    Failed to load profile settings. Please refresh the page.
    <button class="ml-2 underline hover:no-underline" @click="fetchProfile()">Retry</button>
  </div>

  <div v-else-if="profile" class="space-y-6">

    <!-- Publish toggle -->
    <div class="flex items-center justify-between p-4 rounded-xl border"
         :class="draft.is_published ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'">
      <div>
        <p class="font-medium text-sm text-gray-900">
          {{ draft.is_published ? "Profile is live" : "Profile is unpublished" }}
        </p>
        <p class="text-xs text-gray-500 mt-0.5">
          {{ draft.is_published
            ? "Coaches can view this profile via your sharing links."
            : "Only you can see this. Publish to make it shareable." }}
        </p>
      </div>
      <button
        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
        :class="draft.is_published ? 'bg-green-500' : 'bg-gray-300'"
        @click="save({ is_published: !draft.is_published })"
      >
        <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="draft.is_published ? 'translate-x-6' : 'translate-x-1'" />
      </button>
    </div>

    <!-- Sharing links -->
    <div class="space-y-2">
      <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Your profile link</label>
      <div class="flex gap-2">
        <code class="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-700 truncate">
          {{ publicUrl }}
        </code>
        <button class="px-3 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                @click="copyLink">
          Copy
        </button>
      </div>
    </div>

    <!-- Vanity slug -->
    <div class="space-y-1">
      <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Custom URL (optional)</label>
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-400 shrink-0">recruitingcompass.com/p/</span>
        <input
          v-model="draft.vanity_slug"
          type="text"
          placeholder="yourname2026"
          class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          @blur="onSlugBlur"
        />
      </div>
      <p v-if="slugError" class="text-xs text-red-500">{{ slugError }}</p>
      <p class="text-xs text-gray-400">Changing your custom URL will break any links using the old one.</p>
    </div>

    <!-- Bio -->
    <div class="space-y-1">
      <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Bio / Statement</label>
      <textarea
        v-model="draft.bio"
        rows="3"
        maxlength="300"
        placeholder="A short statement about yourself (300 chars max)"
        class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
        @blur="save({ bio: draft.bio || null })"
      />
      <p class="text-xs text-gray-400 text-right">{{ draft.bio.length }}/300</p>
    </div>

    <!-- Header color -->
    <div class="space-y-2">
      <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Header color</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="color in HEADER_COLORS"
          :key="color.key"
          :title="color.label"
          class="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          :class="[color.swatch, draft.header_color === color.key ? 'ring-2 ring-offset-2 ring-slate-600 scale-110' : '']"
          @click="save({ header_color: color.key })"
        />
      </div>
    </div>

    <!-- Section toggles -->
    <div class="space-y-3">
      <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide">What to show coaches</label>
      <div class="space-y-2">
        <label v-for="section in [
          { key: 'show_academics', label: 'Academic stats (GPA, SAT/ACT, graduation year)' },
          { key: 'show_athletic', label: 'Athletic profile (sport, position, height/weight)' },
          { key: 'show_film', label: 'Film & video links' },
          { key: 'show_schools', label: 'Target schools list' },
        ]" :key="section.key" class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            :checked="(draft as any)[section.key]"
            class="h-4 w-4 rounded border-gray-300 text-slate-700"
            @change="save({ [section.key]: !((draft as any)[section.key]) })"
          />
          <span class="text-sm text-gray-700">{{ section.label }}</span>
        </label>
      </div>
    </div>

    <p v-if="saveError" class="text-xs text-red-500">{{ saveError }}</p>
  </div>
</template>
