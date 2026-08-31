<!-- components/profile/ProfileSetup.vue -->
<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { usePlayerProfile } from "~/composables/usePlayerProfile";
import {
  resolveSections,
  deriveLegacyVisibility,
} from "~/utils/profile/sectionConfig";
import type {
  CommitmentStatus,
  PlayerDetails,
  PlayerProfile,
  ProfileAward,
  ProfileSection,
} from "~/types/models";
import ShareProfilePanel from "~/components/profile/setup/ShareProfilePanel.vue";
import ProfileAppearanceEditor from "~/components/profile/setup/ProfileAppearanceEditor.vue";
import ProfileContentEditor from "~/components/profile/setup/ProfileContentEditor.vue";
import SectionConfigEditor from "~/components/profile/setup/SectionConfigEditor.vue";
import CommitmentStatusControl from "~/components/profile/setup/CommitmentStatusControl.vue";
import ProfileMiniPreview from "~/components/profile/setup/ProfileMiniPreview.vue";

const props = defineProps<{
  details: PlayerDetails;
  schools: { id: string; name: string }[];
}>();

const { profile, loading, error, publicUrl, updateProfile, fetchProfile } =
  usePlayerProfile();

// Local draft — synced from store, saved as each control changes so the
// live preview updates immediately while persistence flows through
// updateProfile(). Never mutate the Pinia store directly.
const draft = reactive({
  bio: "",
  vanity_slug: "",
  is_published: false,
  header_color: "slate",
  banner_url: null as string | null,
  looking_for: "",
  commitment_status: "uncommitted" as CommitmentStatus,
  committed_school_id: null as string | null,
  awards: [] as ProfileAward[],
  values_tags: [] as string[],
  section_config: [] as ProfileSection[],
  show_metrics: true,
  show_athletic: true,
  show_film: true,
  show_academics: true,
  show_schools: true,
});

watch(
  () => profile.value,
  (p) => {
    if (!p) return;
    draft.bio = p.bio ?? "";
    draft.vanity_slug = p.vanity_slug ?? "";
    draft.is_published = p.is_published;
    draft.header_color = p.header_color ?? "slate";
    draft.banner_url = p.banner_url ?? null;
    draft.looking_for = p.looking_for ?? "";
    draft.commitment_status = p.commitment_status ?? "uncommitted";
    draft.committed_school_id = p.committed_school_id ?? null;
    draft.awards = p.awards ?? [];
    draft.values_tags = p.values_tags ?? [];
    draft.section_config = resolveSections({
      section_config: p.section_config ?? [],
      show_metrics: p.show_metrics,
      show_film: p.show_film,
      show_academics: p.show_academics,
    });
    draft.show_metrics = p.show_metrics;
    draft.show_athletic = p.show_athletic;
    draft.show_film = p.show_film;
    draft.show_academics = p.show_academics;
    draft.show_schools = p.show_schools;
  },
  { immediate: true },
);

const saveError = ref<string | null>(null);
const saving = ref(false);

async function save(field: Partial<PlayerProfile>) {
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

// Text fields persist without merging the result back into `draft` — the
// server stores an empty bio/lookingFor as null, but ProfileContentEditor's
// props are plain (non-nullable) strings, so draft.bio/looking_for must stay
// "" locally rather than round-tripping to null.
async function persistText(field: Partial<PlayerProfile>) {
  saving.value = true;
  saveError.value = null;
  try {
    await updateProfile(field);
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : "Failed to save";
  } finally {
    saving.value = false;
  }
}

const debouncedSaveBio = useDebounceFn((bio: string) => {
  persistText({ bio: bio || null });
}, 500);

const debouncedSaveLookingFor = useDebounceFn((lookingFor: string) => {
  persistText({ looking_for: lookingFor || null });
}, 500);

function onBioUpdate(value: string) {
  draft.bio = value;
  debouncedSaveBio(value);
}

function onLookingForUpdate(value: string) {
  draft.looking_for = value;
  debouncedSaveLookingFor(value);
}

const slugError = ref<string | null>(null);

function validateSlug(slug: string): boolean {
  if (!slug) return true; // empty is valid (clears vanity slug)
  if (!/^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/.test(slug)) {
    slugError.value =
      "Only lowercase letters, numbers, and hyphens. Min 2 chars.";
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

// Mirrors the server's reconcileVisibility: a section_config edit also
// derives show_metrics/show_film/show_academics so the local draft (and the
// live preview reading it) agrees with what the server will store, without
// waiting for a reload.
function onSectionConfigUpdate(sections: ProfileSection[]) {
  save({ section_config: sections, ...deriveLegacyVisibility(sections) });
}
</script>

<template>
  <div v-if="loading" class="text-sm text-brand-slate-400">
    Loading profile settings…
  </div>

  <div
    v-else-if="error"
    class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500"
  >
    Failed to load profile settings. Please refresh the page.
    <button class="ml-2 underline hover:no-underline" @click="fetchProfile()">
      Retry
    </button>
  </div>

  <div v-else-if="profile" class="flex flex-col gap-6">
    <!-- Workspace header bar (Figma 5:225): brand left, live-status + toggle right -->
    <header
      class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-slate-200 bg-white px-5 py-3"
    >
      <div class="flex items-center gap-2 text-brand-slate-900">
        <UIcon
          name="i-heroicons-viewfinder-circle"
          class="h-6 w-6"
          aria-hidden="true"
        />
        <span class="font-semibold tracking-tight"
          >RecruitingCompass Workspace</span
        >
      </div>
      <div
        class="flex items-center gap-2.5 rounded-full px-3 py-1.5"
        :class="
          draft.is_published ? 'bg-brand-emerald-50' : 'bg-brand-slate-50'
        "
      >
        <span
          class="h-2 w-2 rounded-full"
          :class="
            draft.is_published ? 'bg-brand-emerald-500' : 'bg-brand-slate-300'
          "
          aria-hidden="true"
        />
        <span
          class="text-sm font-medium"
          :class="
            draft.is_published
              ? 'text-brand-emerald-700'
              : 'text-brand-slate-500'
          "
        >
          {{
            draft.is_published
              ? "Your profile is live & public"
              : "Profile is unpublished"
          }}
        </span>
        <button
          data-test="publish-toggle"
          type="button"
          :aria-pressed="draft.is_published"
          aria-label="Toggle profile visibility"
          class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
          :class="
            draft.is_published ? 'bg-brand-emerald-500' : 'bg-brand-slate-300'
          "
          @click="save({ is_published: !draft.is_published })"
        >
          <span
            class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
            :class="draft.is_published ? 'translate-x-5' : 'translate-x-1'"
          />
        </button>
      </div>
    </header>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="flex flex-col gap-6">
        <ShareProfilePanel :url="publicUrl ?? ''">
          <!-- Custom URL lives with the share link — they configure the same URL -->
          <div class="mt-4 space-y-1 border-t border-brand-slate-100 pt-4">
            <label
              class="text-xs font-semibold tracking-wide text-brand-slate-400 uppercase"
              >Custom URL (optional)</label
            >
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-sm text-brand-slate-400"
                >recruitingcompass.com/p/</span
              >
              <input
                v-model="draft.vanity_slug"
                type="text"
                placeholder="yourname2026"
                class="flex-1 rounded-lg border border-brand-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-slate-400 focus:outline-none"
                @blur="onSlugBlur"
              />
            </div>
            <p v-if="slugError" class="text-xs text-red-500">{{ slugError }}</p>
            <p class="text-xs text-brand-slate-400">
              Changing your custom URL will break any links using the old one.
            </p>
          </div>
        </ShareProfilePanel>

        <!-- 1. Appearance -->
        <section class="space-y-3">
          <h3 class="text-sm font-semibold text-brand-slate-900">
            1. Appearance Settings
          </h3>
          <div
            class="rounded-2xl border border-brand-slate-200 bg-white p-6 shadow-xs"
          >
            <ProfileAppearanceEditor
              :header-color="draft.header_color"
              :banner-url="draft.banner_url"
              @update:header-color="(color) => save({ header_color: color })"
              @update:banner-url="(url) => save({ banner_url: url })"
            />
          </div>
        </section>

        <!-- 2. Content -->
        <section class="space-y-3">
          <h3 class="text-sm font-semibold text-brand-slate-900">
            2. Profile Content
          </h3>
          <div
            class="rounded-2xl border border-brand-slate-200 bg-white p-6 shadow-xs"
          >
            <ProfileContentEditor
              :bio="draft.bio"
              :looking-for="draft.looking_for"
              :awards="draft.awards"
              :values-tags="draft.values_tags"
              @update:bio="onBioUpdate"
              @update:looking-for="onLookingForUpdate"
              @update:awards="(awards) => save({ awards })"
              @update:values-tags="(tags) => save({ values_tags: tags })"
            />
          </div>
        </section>

        <!-- 3. Section Configuration -->
        <section class="space-y-3">
          <h3 class="text-sm font-semibold text-brand-slate-900">
            3. Section Configuration
          </h3>
          <div
            class="rounded-2xl border border-brand-slate-200 bg-white p-6 shadow-xs"
          >
            <SectionConfigEditor
              :model-value="draft.section_config"
              @update:model-value="onSectionConfigUpdate"
            />
          </div>
        </section>

        <!-- 4. Recruitment Status -->
        <section class="space-y-3">
          <h3 class="text-sm font-semibold text-brand-slate-900">
            4. Recruitment Status
          </h3>
          <div
            class="rounded-2xl border border-brand-slate-200 bg-white p-6 shadow-xs"
          >
            <CommitmentStatusControl
              :status="draft.commitment_status"
              :committed-school-id="draft.committed_school_id"
              :schools="props.schools"
              @update:status="(status) => save({ commitment_status: status })"
              @update:committed-school-id="
                (schoolId) => save({ committed_school_id: schoolId })
              "
            />
          </div>
        </section>

        <p v-if="saveError" class="text-xs text-red-500">{{ saveError }}</p>
      </div>

      <aside class="lg:sticky lg:top-6 lg:self-start">
        <ProfileMiniPreview
          :draft="draft"
          :details="props.details"
          :url="publicUrl ?? ''"
        />
      </aside>
    </div>
  </div>
</template>
