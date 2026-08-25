<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @keydown.escape="handleClose"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-coach-title"
          class="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between border-b border-slate-200 p-6"
          >
            <h2 id="edit-coach-title" class="text-2xl font-bold text-slate-900">
              Edit Coach
            </h2>
            <button
              @click="handleClose"
              aria-label="Close edit coach dialog"
              class="text-2xl text-slate-500 transition hover:text-slate-900"
            >
              ×
            </button>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="space-y-6 p-6">
            <!-- Name Fields -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  for="firstName"
                  class="mb-1 block text-sm font-medium text-slate-500"
                >
                  First Name <span class="text-red-600">*</span>
                </label>
                <input
                  id="firstName"
                  v-model="form.first_name"
                  type="text"
                  required
                  class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label
                  for="lastName"
                  class="mb-1 block text-sm font-medium text-slate-500"
                >
                  Last Name <span class="text-red-600">*</span>
                </label>
                <input
                  id="lastName"
                  v-model="form.last_name"
                  type="text"
                  required
                  class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <!-- Contact Info -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  for="email"
                  class="mb-1 block text-sm font-medium text-slate-500"
                >
                  Email
                </label>
                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  autocomplete="email"
                  class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                />
              </div>
              <div>
                <label
                  for="phone"
                  class="mb-1 block text-sm font-medium text-slate-500"
                >
                  Phone
                </label>
                <input
                  id="phone"
                  :value="form.phone"
                  type="tel"
                  autocomplete="tel"
                  inputmode="tel"
                  maxlength="14"
                  class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                  @input="
                    form.phone = formatPhoneNational(
                      ($event.target as HTMLInputElement).value,
                    )
                  "
                />
              </div>
            </div>

            <!-- Social Media -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  for="twitter"
                  class="mb-1 block text-sm font-medium text-slate-500"
                >
                  Twitter Handle
                </label>
                <input
                  id="twitter"
                  v-model="form.twitter_handle"
                  type="text"
                  placeholder="@username"
                  class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label
                  for="instagram"
                  class="mb-1 block text-sm font-medium text-slate-500"
                >
                  Instagram Handle
                </label>
                <input
                  id="instagram"
                  v-model="form.instagram_handle"
                  type="text"
                  placeholder="@username"
                  class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <!-- Role -->
            <div>
              <label
                for="role"
                class="mb-1 block text-sm font-medium text-slate-500"
              >
                Role <span class="text-red-600">*</span>
              </label>
              <select
                id="role"
                v-model="form.role"
                required
                class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Select Role</option>
                <option value="head">Head Coach</option>
                <option value="assistant">Assistant Coach</option>
                <option value="recruiting">Recruiting Coordinator</option>
              </select>
            </div>

            <!-- Notes -->
            <div>
              <label
                for="notes"
                class="mb-1 block text-sm font-medium text-slate-500"
              >
                Notes
              </label>
              <textarea
                id="notes"
                v-model="form.notes"
                rows="4"
                placeholder="Additional notes about this coach..."
                class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <!-- Source -->
            <div>
              <label
                for="source"
                class="mb-1 block text-sm font-medium text-slate-500"
              >
                Source
              </label>
              <input
                id="source"
                v-model="form.source"
                type="text"
                placeholder="e.g., Camp, LinkedIn, Referral"
                class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <!-- Tags -->
            <CoachTagsCard
              :tags="form.tags"
              @add="handleAddTag"
              @remove="handleRemoveTag"
            />

            <!-- Actions -->
            <div class="flex gap-4 border-t border-slate-200 pt-4">
              <button
                type="submit"
                :disabled="loading"
                class="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {{ loading ? "Saving..." : "Save Changes" }}
              </button>
              <button
                type="button"
                @click="handleClose"
                class="flex-1 rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-900 transition hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref, watch, toRefs, nextTick } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";
import CoachTagsCard from "~/components/Coach/detail/CoachTagsCard.vue";
import type { Coach } from "~/types/models";
import { createClientLogger } from "~/utils/logger";
import {
  formatPhoneDisplay,
  formatPhoneNational,
  toStoredPhone,
} from "~/utils/phone";

const logger = createClientLogger("EditCoachModal");

interface Props {
  coach: Coach;
  isOpen: boolean;
  updateFn: (id: string, data: Partial<Coach>) => Promise<Coach>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  updated: [coach: Coach];
}>();

const loading = ref(false);

const dialogRef = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(dialogRef);

const handleClose = () => {
  deactivate();
  emit("close");
};

const form = reactive({
  first_name: props.coach.first_name,
  last_name: props.coach.last_name,
  email: props.coach.email || "",
  phone: formatPhoneDisplay(props.coach.phone || ""),
  twitter_handle: props.coach.twitter_handle || "",
  instagram_handle: props.coach.instagram_handle || "",
  role: props.coach.role,
  notes: props.coach.notes || "",
  source: props.coach.source || "",
  tags: [...(props.coach.tags || [])],
});

const handleAddTag = (tag: string) => {
  if (!form.tags.includes(tag)) {
    form.tags = [...form.tags, tag];
  }
};

const handleRemoveTag = (tag: string) => {
  form.tags = form.tags.filter((t) => t !== tag);
};

// Watch for changes to coach prop and update form
const { coach } = toRefs(props);

watch(
  coach,
  (newCoach) => {
    if (newCoach) {
      Object.assign(form, {
        first_name: newCoach.first_name,
        last_name: newCoach.last_name,
        email: newCoach.email || "",
        phone: formatPhoneDisplay(newCoach.phone || ""),
        twitter_handle: newCoach.twitter_handle || "",
        instagram_handle: newCoach.instagram_handle || "",
        role: newCoach.role,
        notes: newCoach.notes || "",
        source: newCoach.source || "",
        tags: [...(newCoach.tags || [])],
      });
    }
  },
  { deep: true },
);

const handleSubmit = async () => {
  loading.value = true;
  try {
    const updated = await props.updateFn(props.coach.id, {
      ...form,
      phone: toStoredPhone(form.phone),
    });
    emit("updated", updated);
    handleClose();
  } catch (err) {
    logger.error("Failed to update coach", err);
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      await nextTick();
      activate();
    } else {
      deactivate();
    }
  },
);
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
