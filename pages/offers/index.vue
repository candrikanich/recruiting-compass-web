<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Global Navigation -->

    <!-- Page Header -->
    <PageHeader
      title="Offers"
      description="Track and compare your scholarship offers"
    >
      <template #actions>
        <button
          v-if="selectedOffers.length >= 2"
          data-testid="compare-offers-button"
          @click="showComparison = true"
          class="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
        >
          <UIcon name="i-heroicons-scale" class="h-4 w-4" />
          Compare ({{ selectedOffers.length }})
        </button>
        <button
          data-testid="log-offer-button"
          @click="showAddForm = !showAddForm"
          class="flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700"
        >
          <UIcon name="i-heroicons-plus" class="h-4 w-4" />
          {{ showAddForm ? "Cancel" : "Log Offer" }}
        </button>
      </template>
    </PageHeader>

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <!-- Summary Cards -->
      <div class="mb-6 grid grid-cols-3 gap-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100"
            >
              <UIcon
                name="i-heroicons-check-circle"
                class="h-5 w-5 text-emerald-600"
              />
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-900">
                {{ acceptedOffers.length }}
              </p>
              <p class="text-sm text-slate-500">Accepted</p>
            </div>
          </div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100"
            >
              <UIcon name="i-heroicons-clock" class="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-900">
                {{ pendingOffers.length }}
              </p>
              <p class="text-sm text-slate-500">Pending</p>
            </div>
          </div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100"
            >
              <UIcon name="i-heroicons-x-circle" class="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-900">
                {{ declinedOffers.length }}
              </p>
              <p class="text-sm text-slate-500">Declined</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Soft-Warn Card (>=25 offers) -->
      <div
        v-if="softWarnVisible"
        data-testid="offers-soft-warn"
        class="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4"
      >
        <div class="flex items-start gap-3">
          <div class="mt-0.5 shrink-0">
            <svg
              class="h-5 w-5 text-amber-600"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-amber-900">
              You have {{ totalCount }} offers logged
            </h3>
            <p class="mt-1 text-sm text-amber-800">
              If some are from prior cycles, consider tagging or removing them
              so this list stays focused on what's active.
            </p>
          </div>
        </div>
      </div>

      <!-- Add Offer Form -->
      <div
        v-if="showAddForm"
        class="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
      >
        <h2 class="mb-4 text-lg font-semibold text-slate-900">Log New Offer</h2>
        <form @submit.prevent="handleAddOffer" class="space-y-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700"
                >School *</label
              >
              <select
                v-model="newOffer.school_id"
                required
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select School</option>
                <option
                  v-for="school in schools"
                  :key="school.id"
                  :value="school.id"
                >
                  {{ school.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700"
                >Offer Type *</label
              >
              <select
                v-model="newOffer.offer_type"
                required
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Type</option>
                <option value="full_ride">Full Ride</option>
                <option value="partial">Partial Scholarship</option>
                <option value="scholarship">Scholarship</option>
                <option value="recruited_walk_on">Recruited Walk-On</option>
                <option value="preferred_walk_on">Preferred Walk-On</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700"
                >Status *</label
              >
              <select
                v-model="newOffer.status"
                required
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700"
                >Scholarship %</label
              >
              <input
                v-model.number="newOffer.scholarship_percentage"
                type="number"
                min="0"
                max="100"
                placeholder="0-100"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700"
                >Amount ($)</label
              >
              <input
                v-model.number="newOffer.scholarship_amount"
                type="number"
                min="0"
                placeholder="0"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700"
                >Offer Date *</label
              >
              <input
                v-model="newOffer.offer_date"
                type="date"
                required
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700"
                >Deadline</label
              >
              <input
                v-model="newOffer.deadline_date"
                type="date"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700"
              >Notes</label
            >
            <textarea
              v-model="newOffer.notes"
              rows="2"
              placeholder="Additional notes..."
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div class="flex gap-3">
            <button
              type="submit"
              :disabled="loading || !newOffer.school_id || !newOffer.offer_type"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {{ loading ? "Saving..." : "Save Offer" }}
            </button>
            <button
              type="button"
              @click="showAddForm = false"
              class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Filter Bar -->
      <div
        class="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
      >
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700"
              >Search</label
            >
            <div class="relative">
              <UIcon
                name="i-heroicons-magnifying-glass"
                class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                v-model="filters.schoolSearch"
                type="text"
                placeholder="School name..."
                class="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-9 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700"
              >Status</label
            >
            <select
              v-model="filters.status"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- All --</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700"
              >Offer Type</label
            >
            <select
              v-model="filters.offerType"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- All --</option>
              <option value="full_ride">Full Ride</option>
              <option value="partial">Partial</option>
              <option value="scholarship">Scholarship</option>
              <option value="recruited_walk_on">Recruited Walk-On</option>
              <option value="preferred_walk_on">Preferred Walk-On</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700"
              >Sort By</label
            >
            <select
              v-model="filters.sortBy"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="offer_date">Offer Date</option>
              <option value="deadline_date">Deadline</option>
              <option value="scholarship_percentage">Percentage</option>
              <option value="scholarship_amount">Amount</option>
            </select>
          </div>
          <DesignSystemFormSegmentedControl
            v-model="filters.sortDirection"
            label="Direction"
            size="sm"
            :options="[
              { value: 'desc', label: 'Newest First' },
              { value: 'asc', label: 'Oldest First' },
            ]"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="loading && offers.length === 0"
        class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
      >
        <div
          class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"
        ></div>
        <p class="text-slate-600">Loading offers...</p>
      </div>

      <!-- Empty State -->
      <DesignSystemEmptyState
        v-else-if="offers.length === 0"
        title="No offers tracked"
        description="Record offers, preferred walk-ons, and recruiting interest levels"
      >
        <template #icon>
          <UIcon name="i-heroicons-gift" class="h-8 w-8 text-brand-slate-400" />
        </template>
        <template #action>
          <DesignSystemButton color="blue" variant="solid" @click="showAddForm = true">
            Track Your First Offer
          </DesignSystemButton>
        </template>
      </DesignSystemEmptyState>

      <!-- No Results State -->
      <div
        v-else-if="filteredOffers.length === 0"
        class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
      >
        <UIcon
          name="i-heroicons-magnifying-glass"
          class="mx-auto mb-4 h-12 w-12 text-slate-300"
        />
        <p class="mb-2 font-medium text-slate-900">
          No offers match your filters
        </p>
        <p class="text-sm text-slate-500">Try adjusting your search criteria</p>
      </div>

      <!-- Offers Grid -->
      <div v-else class="space-y-4">
        <div
          v-for="offer in filteredOffers"
          :key="offer.id"
          class="overflow-hidden rounded-xl border bg-white shadow-xs transition hover:shadow-md"
          :class="[
            isOfferSelected(offer.id)
              ? 'border-blue-400 ring-2 ring-blue-100'
              : 'border-slate-200',
            getStatusBorderClass(offer.status),
          ]"
        >
          <div class="p-5">
            <div class="flex items-start gap-4">
              <!-- Checkbox -->
              <div class="pt-1">
                <input
                  type="checkbox"
                  :checked="isOfferSelected(offer.id)"
                  @change="toggleOfferSelection(offer.id)"
                  class="h-4 w-4 cursor-pointer rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <!-- Main Content -->
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="mb-1 flex flex-wrap items-center gap-2">
                      <h3 class="font-semibold text-slate-900">
                        {{ getSchoolName(offer.school_id) }}
                      </h3>
                      <span
                        class="rounded-full px-2 py-0.5 text-xs font-medium"
                        :class="getStatusBadgeClass(offer.status)"
                      >
                        {{ getStatusLabel(offer.status) }}
                      </span>
                    </div>
                    <p class="text-sm text-slate-500">
                      {{ getOfferTypeLabel(offer.offer_type) }}
                    </p>
                  </div>
                  <div class="flex shrink-0 items-center gap-2">
                    <NuxtLink
                      :to="`/offers/${offer.id}`"
                      class="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                    >
                      View
                    </NuxtLink>
                    <button
                      @click="deleteOffer(offer.id)"
                      class="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <!-- Details Grid -->
                <div class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div v-if="offer.scholarship_percentage">
                    <p class="text-xs text-slate-500">Scholarship</p>
                    <p class="text-lg font-bold text-slate-900">
                      {{ offer.scholarship_percentage }}%
                    </p>
                  </div>
                  <div v-if="offer.scholarship_amount">
                    <p class="text-xs text-slate-500">Amount</p>
                    <p class="text-lg font-bold text-slate-900">
                      ${{ formatAmount(offer.scholarship_amount) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-slate-500">Offered</p>
                    <p class="text-sm font-medium text-slate-700">
                      {{ formatDate(offer.offer_date) }}
                    </p>
                  </div>
                  <div v-if="offer.deadline_date">
                    <p class="text-xs text-slate-500">Deadline</p>
                    <p
                      class="text-sm font-medium"
                      :class="getDeadlineClass(offer)"
                    >
                      {{ formatDate(offer.deadline_date) }}
                      <span
                        v-if="daysUntilDeadline(offer) !== null"
                        class="text-xs"
                      >
                        ({{ daysUntilDeadline(offer) }}d)
                      </span>
                    </p>
                  </div>
                </div>

                <!-- Notes -->
                <p
                  v-if="offer.notes"
                  class="mt-3 line-clamp-2 text-sm text-slate-600"
                >
                  {{ offer.notes }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Comparison Modal -->
      <OfferComparison
        v-if="showComparison"
        :offers="selectedOffers"
        @close="showComparison = false"
      />
    </main>

    <!-- Confirm Delete Dialog -->
    <DesignSystemConfirmDialog
      :is-open="isDeleteDialogOpen"
      title="Delete Offer"
      message="Are you sure you want to delete this offer? This action cannot be undone."
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDeleteOffer"
      @cancel="cancelDeleteOffer"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useOffersStore } from "~/stores/offers";
import { useSchools } from "~/composables/useSchools";
import { useFamilyCtx } from "~/composables/useFamilyCtx";
import OfferComparison from "~/components/OfferComparison.vue";
import { useAppToast } from "~/composables/useAppToast";
import type { Offer } from "~/types/models";
import { createClientLogger } from "~/utils/logger";

definePageMeta({
  middleware: "auth",
});

const logger = createClientLogger("OffersList");
const offersStore = useOffersStore();
const {
  offers,
  acceptedOffers,
  pendingOffers,
  declinedOffers,
  loading,
  softWarnVisible,
  totalCount,
} = storeToRefs(offersStore);
const { fetchOffers, createOffer, daysUntilDeadline } = offersStore;
const deleteOfferAPI = offersStore.deleteOffer;
const { showToast } = useAppToast();
const { schools, fetchSchools } = useSchools();
const activeFamily = useFamilyCtx();

const showAddForm = ref(false);
const showComparison = ref(false);
const selectedOfferIds = ref<string[]>([]);

const newOffer = reactive({
  school_id: "",
  offer_type: "",
  scholarship_amount: null as number | null,
  scholarship_percentage: null as number | null,
  offer_date: new Date().toISOString().split("T")[0],
  deadline_date: "",
  status: "pending",
  conditions: "",
  notes: "",
});

const filters = reactive({
  schoolSearch: "",
  status: "",
  offerType: "",
  sortBy: "offer_date",
  sortDirection: "desc",
});

const filteredOffers = computed(() => {
  let result = [...offers.value];

  // Filter by school search
  if (filters.schoolSearch) {
    const search = filters.schoolSearch.toLowerCase();
    result = result.filter((offer) => {
      const schoolName = getSchoolName(offer.school_id).toLowerCase();
      return schoolName.includes(search);
    });
  }

  // Filter by status
  if (filters.status) {
    result = result.filter((offer) => offer.status === filters.status);
  }

  // Filter by offer type
  if (filters.offerType) {
    result = result.filter((offer) => offer.offer_type === filters.offerType);
  }

  // Sort
  result.sort((a, b) => {
    let aValue: any = a[filters.sortBy as keyof typeof a];
    let bValue: any = b[filters.sortBy as keyof typeof b];

    if (filters.sortBy === "offer_date" || filters.sortBy === "deadline_date") {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }

    if (aValue === null || aValue === undefined) aValue = 0;
    if (bValue === null || bValue === undefined) bValue = 0;

    const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    return filters.sortDirection === "asc" ? comparison : -comparison;
  });

  return result;
});

const selectedOffers = computed(() => {
  return offers.value.filter((o) => selectedOfferIds.value.includes(o.id));
});

const isOfferSelected = (offerId: string): boolean => {
  return selectedOfferIds.value.includes(offerId);
};

const toggleOfferSelection = (offerId: string) => {
  const index = selectedOfferIds.value.indexOf(offerId);
  if (index > -1) {
    selectedOfferIds.value.splice(index, 1);
  } else {
    selectedOfferIds.value.push(offerId);
  }
};

const getSchoolName = (schoolId: string): string => {
  return schools.value.find((s) => s.id === schoolId)?.name || "Unknown School";
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

const getStatusLabel = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getStatusBadgeClass = (status: string): string => {
  const classes: Record<string, string> = {
    pending: "bg-blue-100 text-blue-700",
    accepted: "bg-emerald-100 text-emerald-700",
    declined: "bg-red-100 text-red-700",
    expired: "bg-slate-100 text-slate-700",
  };
  return classes[status] || "bg-slate-100 text-slate-700";
};

const getStatusBorderClass = (status: string): string => {
  const classes: Record<string, string> = {
    pending: "border-l-4 border-l-blue-400",
    accepted: "border-l-4 border-l-emerald-400",
    declined: "border-l-4 border-l-red-400",
    expired: "border-l-4 border-l-slate-400",
  };
  return classes[status] || "";
};

const getDeadlineClass = (offer: Offer): string => {
  const days = daysUntilDeadline(offer);
  if (days === null) return "text-slate-700";
  if (days <= 7) return "text-red-600";
  if (days <= 30) return "text-amber-600";
  return "text-slate-700";
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatAmount = (amount: number): string => {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  }
  return amount.toString();
};

const handleAddOffer = async () => {
  try {
    await createOffer({
      school_id: newOffer.school_id,
      offer_type: newOffer.offer_type as
        | "full_ride"
        | "partial"
        | "scholarship"
        | "recruited_walk_on"
        | "preferred_walk_on",
      scholarship_amount: newOffer.scholarship_amount,
      scholarship_percentage: newOffer.scholarship_percentage,
      offer_date: newOffer.offer_date,
      deadline_date: newOffer.deadline_date || null,
      status: newOffer.status as
        "pending" | "accepted" | "declined" | "expired",
      conditions: newOffer.conditions || null,
      notes: newOffer.notes || null,
    });

    // Reset form
    newOffer.school_id = "";
    newOffer.offer_type = "";
    newOffer.scholarship_amount = null;
    newOffer.scholarship_percentage = null;
    newOffer.offer_date = new Date().toISOString().split("T")[0];
    newOffer.deadline_date = "";
    newOffer.status = "pending";
    newOffer.conditions = "";
    newOffer.notes = "";
    showAddForm.value = false;
  } catch (err) {
    logger.error("Failed to log offer", err);
    showToast(
      "Something went wrong logging this offer. Please try again.",
      "error",
    );
  }
};

const isDeleteDialogOpen = ref(false);
const offerToDeleteId = ref<string | null>(null);

const deleteOffer = (offerId: string) => {
  offerToDeleteId.value = offerId;
  isDeleteDialogOpen.value = true;
};

const confirmDeleteOffer = async () => {
  if (!offerToDeleteId.value) return;
  const deletingId = offerToDeleteId.value;
  isDeleteDialogOpen.value = false;
  offerToDeleteId.value = null;
  try {
    await deleteOfferAPI(deletingId);
  } catch (err) {
    logger.error("Failed to delete offer", err);
    showToast(
      "Something went wrong deleting this offer. Please try again.",
      "error",
    );
  }
};

const cancelDeleteOffer = () => {
  isDeleteDialogOpen.value = false;
  offerToDeleteId.value = null;
};

// Watch for family context to load — immediate: true handles initial fetch on page load
watch(
  () => activeFamily.activeFamilyId.value,
  async (newFamilyId, oldFamilyId) => {
    if (newFamilyId && newFamilyId !== oldFamilyId) {
      if (oldFamilyId) offersStore.reset();
      await fetchSchools();
      await fetchOffers();
    }
  },
  { immediate: true },
);

// Watch for athlete switches (for parents)
watch(
  () => activeFamily.activeAthleteId.value,
  async (newId, oldId) => {
    if (newId && newId !== oldId && activeFamily.isViewingAsParent.value) {
      offersStore.reset();
      await fetchSchools();
      await fetchOffers({ force: true });
    }
  },
);
</script>
