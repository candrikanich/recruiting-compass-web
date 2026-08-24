<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Back Button -->
      <div class="mb-6">
        <NuxtLink
          to="/offers"
          class="font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Back to Offers
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <div v-if="loading && !offer" class="py-12 text-center">
        <p class="text-gray-600">Loading offer...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4"
      >
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Offer Not Found -->
      <div
        v-else-if="!offer"
        class="rounded-lg bg-white p-12 text-center shadow-sm"
      >
        <p class="mb-2 text-gray-600">Offer not found</p>
        <NuxtLink
          to="/offers"
          class="font-semibold text-blue-600 hover:text-blue-700"
        >
          Return to Offers →
        </NuxtLink>
      </div>

      <!-- Offer Detail -->
      <div v-else class="space-y-8">
        <!-- Offer Header -->
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <div class="mb-6 flex items-start justify-between">
            <div class="flex-1">
              <div class="mb-2 flex items-center gap-3">
                <span
                  :class="[
                    'inline-block rounded-full px-3 py-1 text-xs font-semibold',
                    getStatusBadgeClasses(offer.status),
                  ]"
                >
                  {{ getStatusLabel(offer.status) }}
                </span>
                <h1 class="text-3xl font-bold text-gray-900">
                  {{ schoolName }}
                </h1>
              </div>
              <p class="text-gray-600">
                {{ getOfferTypeLabel(offer.offer_type) }}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                v-if="!isEditing"
                @click="isEditing = true"
                class="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                v-else
                @click="isEditing = false"
                class="rounded-lg bg-gray-300 px-4 py-2 font-semibold text-gray-900 transition hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                @click="deleteOffer"
                class="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Financial Summary -->
          <div
            class="mb-6 grid grid-cols-1 gap-6 border-b border-gray-200 pb-6 md:grid-cols-3"
          >
            <div>
              <p class="mb-1 text-sm text-gray-600">Scholarship Amount</p>
              <p class="text-2xl font-bold text-gray-900">
                {{
                  offer.scholarship_amount
                    ? `$${offer.scholarship_amount.toLocaleString()}`
                    : "—"
                }}
              </p>
            </div>
            <div>
              <p class="mb-1 text-sm text-gray-600">Scholarship %</p>
              <p class="text-2xl font-bold text-gray-900">
                {{
                  offer.scholarship_percentage
                    ? `${offer.scholarship_percentage}%`
                    : "—"
                }}
              </p>
            </div>
            <div>
              <p class="mb-1 text-sm text-gray-600">Deadline</p>
              <p
                :class="[
                  'text-2xl font-bold',
                  daysUntilDeadline && daysUntilDeadline > 30
                    ? 'text-gray-900'
                    : daysUntilDeadline && daysUntilDeadline > 7
                      ? 'text-amber-600'
                      : daysUntilDeadline && daysUntilDeadline > 0
                        ? 'text-red-600'
                        : 'text-gray-900',
                ]"
              >
                {{ offer.deadline_date ? `${daysUntilDeadline}d` : "—" }}
              </p>
              <p class="mt-1 text-xs text-gray-600">{{ formatDeadline }}</p>
            </div>
          </div>

          <!-- Offer Details Grid -->
          <div v-if="!isEditing" class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div class="text-sm">
              <p class="mb-1 text-gray-600">Offer Date</p>
              <p class="font-semibold text-gray-900">
                {{ formatDate(offer.offer_date) }}
              </p>
            </div>
            <div class="text-sm">
              <p class="mb-1 text-gray-600">Deadline Date</p>
              <p class="font-semibold text-gray-900">
                {{
                  offer.deadline_date
                    ? formatDate(offer.deadline_date)
                    : "No deadline set"
                }}
              </p>
            </div>

            <div v-if="offer.conditions" class="text-sm md:col-span-2">
              <p class="mb-1 text-gray-600">Conditions</p>
              <p class="font-semibold text-gray-900">{{ offer.conditions }}</p>
            </div>

            <div v-if="offer.notes" class="text-sm md:col-span-2">
              <p class="mb-1 text-gray-600">Notes</p>
              <p class="font-semibold text-gray-900">{{ offer.notes }}</p>
            </div>
          </div>
        </div>

        <!-- Scholarship Calculator -->
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <ScholarshipCalculator
            :initial-amount="offer.scholarship_amount || undefined"
            :initial-percentage="offer.scholarship_percentage || undefined"
            :on-save-value="
              (amount, percentage) => {
                editForm.scholarship_amount = amount;
                editForm.scholarship_percentage = percentage;
              }
            "
          />
        </div>

        <!-- Edit Form -->
        <div v-if="isEditing" class="rounded-lg bg-white p-6 shadow-sm">
          <h2 class="mb-6 text-2xl font-bold text-gray-900">Edit Offer</h2>
          <form @submit.prevent="saveOffer" class="space-y-6">
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <!-- Offer Type -->
              <div>
                <label
                  for="offerType"
                  class="mb-1 block text-sm font-medium text-gray-700"
                >
                  Offer Type
                </label>
                <select
                  id="offerType"
                  v-model="editForm.offer_type"
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="full_ride">Full Ride Scholarship</option>
                  <option value="partial">Partial Scholarship</option>
                  <option value="scholarship">Scholarship</option>
                  <option value="recruited_walk_on">Recruited Walk-On</option>
                  <option value="preferred_walk_on">Preferred Walk-On</option>
                </select>
              </div>

              <!-- Status -->
              <div>
                <label
                  for="status"
                  class="mb-1 block text-sm font-medium text-gray-700"
                >
                  Status
                </label>
                <select
                  id="status"
                  v-model="editForm.status"
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <!-- Scholarship Amount -->
              <div>
                <label
                  for="amount"
                  class="mb-1 block text-sm font-medium text-gray-700"
                >
                  Scholarship Amount ($)
                </label>
                <input
                  id="amount"
                  v-model.number="editForm.scholarship_amount"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="0"
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Scholarship Percentage -->
              <div>
                <label
                  for="percentage"
                  class="mb-1 block text-sm font-medium text-gray-700"
                >
                  Scholarship Percentage (%)
                </label>
                <input
                  id="percentage"
                  v-model.number="editForm.scholarship_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  placeholder="0"
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Offer Date -->
              <div>
                <label
                  for="offerDate"
                  class="mb-1 block text-sm font-medium text-gray-700"
                >
                  Offer Date
                </label>
                <input
                  id="offerDate"
                  v-model="editForm.offer_date"
                  type="date"
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Deadline Date -->
              <div>
                <label
                  for="deadline"
                  class="mb-1 block text-sm font-medium text-gray-700"
                >
                  Deadline Date
                </label>
                <input
                  id="deadline"
                  v-model="editForm.deadline_date"
                  type="date"
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Conditions -->
              <div class="md:col-span-2">
                <label
                  for="conditions"
                  class="mb-1 block text-sm font-medium text-gray-700"
                >
                  Conditions or Requirements
                </label>
                <textarea
                  id="conditions"
                  v-model="editForm.conditions"
                  rows="3"
                  placeholder="Any conditions attached to the offer..."
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Notes -->
              <div class="md:col-span-2">
                <label
                  for="notes"
                  class="mb-1 block text-sm font-medium text-gray-700"
                >
                  Notes
                </label>
                <textarea
                  id="notes"
                  v-model="editForm.notes"
                  rows="3"
                  placeholder="Additional notes about this offer..."
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <!-- Buttons -->
            <div class="flex gap-4">
              <button
                type="submit"
                :disabled="loading"
                class="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {{ loading ? "Saving..." : "Save Changes" }}
              </button>
              <button
                type="button"
                @click="isEditing = false"
                class="flex-1 rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-900 transition hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Confirm Delete Dialog -->
    <DesignSystemConfirmDialog
      :is-open="isDeleteDialogOpen"
      title="Delete Offer"
      message="Are you sure you want to delete this offer? This action cannot be undone."
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDeleteOffer"
      @cancel="isDeleteDialogOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { useOffersStore } from "~/stores/offers";
import { useSchools } from "~/composables/useSchools";
import ScholarshipCalculator from "~/components/ScholarshipCalculator.vue";
import type { Offer } from "~/types/models";
import { createClientLogger } from "~/utils/logger";

definePageMeta({
  middleware: "auth",
});

const logger = createClientLogger("OfferDetail");
const route = useRoute();
const router = useRouter();
const offersStore = useOffersStore();
const { offers, loading } = storeToRefs(offersStore);
const {
  fetchOffers,
  getOffer,
  updateOffer,
  daysUntilDeadline: calculateDaysUntil,
} = offersStore;
const deleteOfferAPI = offersStore.deleteOffer;
const { schools, fetchSchools } = useSchools();

const isEditing = ref(false);
const error = ref("");

const offerId = computed(() => route.params.id as string);

const offer = computed(
  () => offers.value.find((o) => o.id === offerId.value) ?? null,
);

const schoolName = computed(() => {
  if (!offer.value) return "";
  return (
    schools.value.find((s) => s.id === offer.value!.school_id)?.name ||
    "Unknown School"
  );
});

const daysUntilDeadline = computed(() => {
  if (!offer.value) return null;
  return calculateDaysUntil(offer.value);
});

const formatDeadline = computed(() => {
  if (!offer.value?.deadline_date) return "No deadline set";
  const date = new Date(offer.value.deadline_date);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
});

interface EditFormData {
  offer_type: Offer["offer_type"];
  status: Offer["status"];
  scholarship_amount: number | null;
  scholarship_percentage: number | null;
  offer_date: string;
  deadline_date: string;
  conditions: string;
  notes: string;
}

const editForm = reactive<EditFormData>({
  offer_type: "full_ride",
  status: "pending",
  scholarship_amount: null,
  scholarship_percentage: null,
  offer_date: "",
  deadline_date: "",
  conditions: "",
  notes: "",
});

const getStatusBadgeClasses = (status: string): string => {
  const classes: Record<string, string> = {
    pending: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-800",
    expired: "bg-gray-100 text-gray-800",
  };
  return classes[status] || "bg-gray-100 text-gray-800";
};

const getStatusLabel = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getOfferTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    full_ride: "Full Ride Scholarship",
    partial: "Partial Scholarship",
    scholarship: "Scholarship",
    recruited_walk_on: "Recruited Walk-On",
    preferred_walk_on: "Preferred Walk-On",
  };
  return labels[type] || type;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const saveOffer = async () => {
  if (!offer.value) return;
  try {
    await updateOffer(offerId.value, {
      offer_type: editForm.offer_type,
      status: editForm.status,
      scholarship_amount: editForm.scholarship_amount,
      scholarship_percentage: editForm.scholarship_percentage,
      offer_date: editForm.offer_date,
      deadline_date: editForm.deadline_date || null,
      conditions: editForm.conditions || null,
      notes: editForm.notes || null,
    });
    isEditing.value = false;
  } catch (err) {
    error.value = "Failed to save offer";
    logger.error("Error saving offer", err);
  }
};

const isDeleteDialogOpen = ref(false);

const deleteOffer = () => {
  isDeleteDialogOpen.value = true;
};

const confirmDeleteOffer = async () => {
  isDeleteDialogOpen.value = false;
  try {
    await deleteOfferAPI(offerId.value);
    await router.push("/offers");
  } catch (err) {
    error.value = "Failed to delete offer";
    logger.error("Error deleting offer", err);
  }
};

const loadOfferData = () => {
  if (offer.value) {
    editForm.offer_type = offer.value.offer_type;
    editForm.status = offer.value.status;
    editForm.scholarship_amount = offer.value.scholarship_amount || null;
    editForm.scholarship_percentage =
      offer.value.scholarship_percentage || null;
    editForm.offer_date = offer.value.offer_date;
    editForm.deadline_date = offer.value.deadline_date || "";
    editForm.conditions = offer.value.conditions || "";
    editForm.notes = offer.value.notes || "";
  }
};

onMounted(async () => {
  await Promise.all([fetchSchools(), fetchOffers(), getOffer(offerId.value)]);
  loadOfferData();
});
</script>
