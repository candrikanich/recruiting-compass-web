<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-coach-title"
        @keydown.escape="handleClose"
      >
        <div
          class="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between border-b border-slate-200 p-6"
          >
            <h2
              id="assign-coach-title"
              class="text-xl font-bold text-slate-900"
            >
              Assign to a coach
            </h2>
            <button
              aria-label="Close assign coach dialog"
              class="text-2xl text-slate-500 transition hover:text-slate-900"
              @click="handleClose"
            >
              &times;
            </button>
          </div>

          <div class="space-y-6 p-6">
            <!-- School resolver -->
            <div v-if="!props.presetSchoolId">
              <label
                for="school-select"
                class="mb-1 block text-sm font-medium text-slate-500"
              >
                School
              </label>
              <select
                id="school-select"
                v-model="schoolId"
                data-test="school-select"
                class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-brand-blue-500/20"
              >
                <option value="">Select a school&hellip;</option>
                <option
                  v-for="school in schools"
                  :key="school.id"
                  :value="school.id"
                >
                  {{ school.name }}
                </option>
              </select>
            </div>

            <!-- Coach step -->
            <div v-if="schoolId" class="space-y-3">
              <div v-if="existingCoaches.length > 0">
                <label
                  for="coach-select"
                  class="mb-1 block text-sm font-medium text-slate-500"
                >
                  Existing coaches at this school
                </label>
                <select
                  id="coach-select"
                  v-model="selectedCoachId"
                  data-test="existing-coach-select"
                  class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-brand-blue-500/20"
                  @change="creatingNew = false"
                >
                  <option value="">Select an existing coach&hellip;</option>
                  <option
                    v-for="coach in existingCoaches"
                    :key="coach.id"
                    :value="coach.id"
                  >
                    {{ coach.first_name }} {{ coach.last_name }}
                  </option>
                </select>
              </div>

              <button
                type="button"
                data-test="create-new-coach"
                class="text-sm font-medium text-brand-blue-600 hover:text-brand-blue-700"
                @click="startCreateNew"
              >
                + Create new coach
              </button>

              <div v-if="creatingNew" class="grid grid-cols-2 gap-4">
                <div>
                  <label
                    for="new-first-name"
                    class="mb-1 block text-sm font-medium text-slate-500"
                  >
                    First Name
                  </label>
                  <input
                    id="new-first-name"
                    v-model="newCoach.first_name"
                    type="text"
                    data-test="new-coach-first-name"
                    class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-brand-blue-500/20"
                  />
                </div>
                <div>
                  <label
                    for="new-last-name"
                    class="mb-1 block text-sm font-medium text-slate-500"
                  >
                    Last Name
                  </label>
                  <input
                    id="new-last-name"
                    v-model="newCoach.last_name"
                    type="text"
                    data-test="new-coach-last-name"
                    class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-brand-blue-500/20"
                  />
                </div>
                <div class="col-span-2">
                  <label
                    for="new-email"
                    class="mb-1 block text-sm font-medium text-slate-500"
                  >
                    Email
                  </label>
                  <input
                    id="new-email"
                    v-model="newCoach.email"
                    type="email"
                    data-test="new-coach-email"
                    class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-brand-blue-500/20"
                  />
                </div>
                <div class="col-span-2">
                  <label
                    for="new-role"
                    class="mb-1 block text-sm font-medium text-slate-500"
                  >
                    Role
                  </label>
                  <select
                    id="new-role"
                    v-model="newCoach.role"
                    data-test="new-coach-role"
                    class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-brand-blue-500/20"
                  >
                    <option value="head">Head Coach</option>
                    <option value="assistant">Assistant Coach</option>
                    <option value="recruiting">Recruiting Coordinator</option>
                  </select>
                </div>
              </div>
            </div>

            <DesignSystemErrorState v-if="submitError" :error="submitError" />

            <!-- Actions -->
            <div class="flex gap-4 border-t border-slate-200 pt-4">
              <DesignSystemButton
                data-test="confirm-assign"
                :disabled="!canConfirm"
                :loading="submitting"
                full-width
                @click="handleConfirm"
              >
                {{ submitting ? "Assigning..." : "Assign & Log Interaction" }}
              </DesignSystemButton>
              <DesignSystemButton
                variant="outline"
                color="slate"
                full-width
                @click="handleClose"
              >
                Cancel
              </DesignSystemButton>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useCoachStore } from "~/stores/coaches";
import { useSchoolStore } from "~/stores/schools";
import { useInteractions } from "~/composables/useInteractions";
import {
  useProfileContacts,
  type ProfileLead,
} from "~/composables/useProfileContacts";
import { useFamilyContext } from "~/composables/useFamilyContext";
import { createClientLogger } from "~/utils/logger";
import type { Coach } from "~/types/models";

const logger = createClientLogger("AssignCoachModal");

const props = withDefaults(
  defineProps<{ lead: ProfileLead; presetSchoolId?: string }>(),
  { presetSchoolId: undefined },
);

const emit = defineEmits<{ resolved: []; close: [] }>();

const coachStore = useCoachStore();
const schoolStore = useSchoolStore();
const { createInteraction } = useInteractions();
const { resolveLead } = useProfileContacts();
const { activeFamilyId } = useFamilyContext();

const schools = computed(() => schoolStore.schools);

function splitName(full: string): { first: string; last: string } {
  const trimmed = full.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) {
    return { first: trimmed, last: "" };
  }
  return {
    first: trimmed.slice(0, lastSpace).trim(),
    last: trimmed.slice(lastSpace + 1).trim(),
  };
}

const schoolId = ref(props.presetSchoolId ?? "");
const selectedCoachId = ref("");
const creatingNew = ref(false);
const submitting = ref(false);
const submitError = ref<string | null>(null);

const { first: prefilledFirst, last: prefilledLast } = splitName(
  props.lead.coach_name,
);

const newCoach = ref({
  first_name: prefilledFirst,
  last_name: prefilledLast,
  email: props.lead.coach_email ?? "",
  role: "head" as Coach["role"],
});

const existingCoaches = computed(() =>
  coachStore.coaches.filter((c: Coach) => c.school_id === schoolId.value),
);

function startCreateNew() {
  creatingNew.value = true;
  selectedCoachId.value = "";
}

const canConfirm = computed(() => {
  if (!schoolId.value) return false;
  if (creatingNew.value) {
    return (
      newCoach.value.first_name.trim().length > 0 &&
      newCoach.value.last_name.trim().length > 0
    );
  }
  return selectedCoachId.value.length > 0;
});

onMounted(async () => {
  if (!schoolId.value && activeFamilyId.value) {
    await schoolStore.fetchSchools(activeFamilyId.value);
    const match = (schools.value as { id: string; name: string }[]).find(
      (s) =>
        props.lead.school_name &&
        s.name.toLowerCase() === props.lead.school_name.toLowerCase(),
    );
    if (match) schoolId.value = match.id;
  }
});

watch(
  schoolId,
  async (id) => {
    if (id) await coachStore.fetchCoaches(id);
  },
  { immediate: true },
);

async function handleConfirm() {
  if (!canConfirm.value || !schoolId.value) return;

  submitting.value = true;
  submitError.value = null;

  try {
    let coachId = selectedCoachId.value;

    if (creatingNew.value) {
      const created = await coachStore.createCoach(schoolId.value, {
        first_name: newCoach.value.first_name,
        last_name: newCoach.value.last_name,
        email: newCoach.value.email || null,
        role: newCoach.value.role,
        phone: null,
        twitter_handle: null,
        instagram_handle: null,
        notes: null,
        tags: [],
        source: "Public profile lead",
        last_contact_date: null,
      });
      coachId = created.id;
    }

    const interaction = await createInteraction({
      school_id: schoolId.value,
      coach_id: coachId,
      type: props.lead.type === "interest" ? "interest" : "email",
      direction: "inbound",
      occurred_at: new Date().toISOString(),
      content: props.lead.note ?? "",
      subject:
        props.lead.type === "interest"
          ? "Interest via public profile"
          : "Contact via public profile",
    });

    await resolveLead(props.lead.id, interaction.id);
    emit("resolved");
  } catch (err) {
    logger.error("Failed to assign coach and log interaction", err);
    submitError.value = "Couldn't assign this lead. Please try again.";
  } finally {
    submitting.value = false;
  }
}

function handleClose() {
  emit("close");
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
