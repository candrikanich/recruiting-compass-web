<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Global Navigation -->

    <!-- Page Header -->
    <PageHeader title="Offers" description="Track and compare your scholarship offers">
      <template #actions>
        <button
          v-if="selectedOffers.length >= 2"
          data-testid="compare-offers-button"
          @click="showComparison = true"
          class="px-3 py-2 text-sm font-medium border border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition flex items-center gap-2"
        >
          <ScaleIcon class="w-4 h-4" />
          Compare ({{ selectedOffers.length }})
        </button>
        <button
          data-testid="log-offer-button"
          @click="showAddForm = !showAddForm"
          class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2"
        >
          <PlusIcon class="w-4 h-4" />
          {{ showAddForm ? "Cancel" : "Log Offer" }}
        </button>
      </template>
    </PageHeader>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Summary Cards -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"
            >
              <CheckCircleIcon class="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-900">
                {{ acceptedOffers.length }}
              </p>
              <p class="text-sm text-slate-500">Accepted</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"
            >
              <ClockIcon class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-900">
                {{ pendingOffers.length }}
              </p>
              <p class="text-sm text-slate-500">Pending</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"
            >
              <XCircleIcon class="w-5 h-5 text-red-600" />
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

      <!-- Add Offer Form -->
      <div
        v-if="showAddForm"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
      >
        <h2 class="text-lg font-semibold text-slate-900 mb-4">Log New Offer</h2>
        <form @submit.prevent="handleAddOffer" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1"
                >School *</label
              >
              <select
                v-model="newOffer.school_id"
                required
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label class="block text-sm font-medium text-slate-700 mb-1"
                >Offer Type *</label
              >
              <select
                v-model="newOffer.offer_type"
                required
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label class="block text-sm font-medium text-slate-700 mb-1"
                >Status *</label
              >
              <select
                v-model="newOffer.status"
                required
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1"
                >Scholarship %</label
              >
              <input
                v-model.number="newOffer.scholarship_percentage"
                type="number"
                min="0"
                max="100"
                placeholder="0-100"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1"
                >Amount ($)</label
              >
              <input
                v-model.number="newOffer.scholarship_amount"
                type="number"
                min="0"
                placeholder="0"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1"
                >Offer Date *</label
              >
              <input
                v-model="newOffer.offer_date"
                type="date"
                required
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1"
                >Deadline</label
              >
              <input
                v-model="newOffer.deadline_date"
                type="date"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Notes</label
            >
            <textarea
              v-model="newOffer.notes"
              rows="2"
              placeholder="Additional notes..."
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div class="flex gap-3">
            <button
              type="submit"
              :disabled="loading || !newOffer.school_id || !newOffer.offer_type"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {{ loading ? "Saving..." : "Save Offer" }}
            </button>
            <button
              type="button"
              @click="showAddForm = false"
              class="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Filter Bar -->
      <div
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6"
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Search</label
            >
            <div class="relative">
              <MagnifyingGlassIcon
                class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                v-model="filters.schoolSearch"
                type="text"
                placeholder="School name..."
                class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Status</label
            >
            <select
              v-model="filters.status"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- All --</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Offer Type</label
            >
            <select
              v-model="filters.offerType"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Sort By</label
            >
            <select
              v-model="filters.sortBy"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="offer_date">Offer Date</option>
              <option value="deadline_date">Deadline</option>
              <option value="scholarship_percentage">Percentage</option>
              <option value="scholarship_amount">Amount</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Direction</label
            >
            <select
              v-model="filters.sortDirection"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="loading && offers.length === 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
        ></div>
        <p class="text-slate-600">Loading offers...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="offers.length === 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <GiftIcon class="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p class="text-slate-900 font-medium mb-2">No offers logged yet</p>
        <p class="text-sm text-slate-500">
          Log scholarship offers as you receive them
        </p>
      </div>

      <!-- No Results State -->
      <div
        v-else-if="filteredOffers.length === 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <MagnifyingGlassIcon class="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p class="text-slate-900 font-medium mb-2">
          No offers match your filters
        </p>
        <p class="text-sm text-slate-500">Try adjusting your search criteria</p>
      </div>

      <!-- Offers Grid -->
      <div v-else class="space-y-4">
        <div
          v-for="offer in filteredOffers"
          :key="offer.id"
          class="bg-white rounded-xl border shadow-sm hover:shadow-md transition overflow-hidden"
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
                  class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <!-- Main Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="flex items-center gap-2 flex-wrap mb-1">
                      <h3 class="font-semibold text-slate-900">
                        {{ getSchoolName(offer.school_id) }}
                      </h3>
                      <span
                        class="px-2 py-0.5 text-xs font-medium rounded-full"
                        :class="getStatusBadgeClass(offer.status)"
                      >
                        {{ getStatusLabel(offer.status) }}
                      </span>
                    </div>
                    <p class="text-sm text-slate-500">
                      {{ getOfferTypeLabel(offer.offer_type) }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <NuxtLink
                      :to="`/offers/${offer.id}`"
                      class="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      View
                    </NuxtLink>
                    <button
                      @click="deleteOffer(offer.id)"
                      class="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <!-- Details Grid -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
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
                  class="text-sm text-slate-600 mt-3 line-clamp-2"
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from "vue";
import { useOffers } from "~/composables/useOffers";
import { useSchools } from "~/composables/useSchools";
import Header from "~/components/Header.vue";
import OfferComparison from "~/components/OfferComparison.vue";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  GiftIcon,
  ScaleIcon,
} from "@heroicons/vue/24/outline";
import type { Offer } from "~/types/models";

definePageMeta({
  middleware: "auth",
});

const {
  offers,
  acceptedOffers,
  pendingOffers,
  declinedOffers,
  loading,
  fetchOffers,
  createOffer,
  deleteOffer: deleteOfferAPI,
  daysUntilDeadline,
} = useOffers();
const { schools, fetchSchools } = useSchools();

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
        | "pending"
        | "accepted"
        | "declined"
        | "expired",
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

    await fetchOffers();
  } catch (err) {
    console.error("Failed to log offer:", err);
  }
};

const deleteOffer = async (offerId: string) => {
  if (confirm("Are you sure you want to delete this offer?")) {
    try {
      await deleteOfferAPI(offerId);
    } catch (err) {
      console.error("Failed to delete offer:", err);
    }
  }
};

onMounted(async () => {
  await fetchSchools();
  await fetchOffers();
});
</script>
