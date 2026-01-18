<template>
  <div class="min-h-screen bg-gray-50">
    <Header />

    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back Button -->
      <div class="mb-6">
        <NuxtLink to="/offers" class="text-blue-600 hover:text-blue-700 font-semibold">
          ← Back to Offers
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <div v-if="loading && !offer" class="text-center py-12">
        <p class="text-gray-600">Loading offer...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Offer Not Found -->
      <div v-else-if="!offer" class="bg-white rounded-lg shadow p-12 text-center">
        <p class="text-gray-600 mb-2">Offer not found</p>
        <NuxtLink to="/offers" class="text-blue-600 hover:text-blue-700 font-semibold">
          Return to Offers →
        </NuxtLink>
      </div>

      <!-- Offer Detail -->
      <div v-else class="space-y-8">
        <!-- Offer Header -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-start justify-between mb-6">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <span
                  :class="[
                    'inline-block px-3 py-1 text-xs font-semibold rounded-full',
                    getStatusBadgeClasses(offer.status),
                  ]"
                >
                  {{ getStatusLabel(offer.status) }}
                </span>
                <h1 class="text-3xl font-bold text-gray-900">{{ schoolName }}</h1>
              </div>
              <p class="text-gray-600">{{ getOfferTypeLabel(offer.offer_type) }}</p>
            </div>
            <div class="flex gap-2">
              <button
                v-if="!isEditing"
                @click="isEditing = true"
                class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Edit
              </button>
              <button
                v-else
                @click="isEditing = false"
                class="px-4 py-2 bg-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                @click="deleteOffer"
                class="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Financial Summary -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 pb-6 border-b border-gray-200">
            <div>
              <p class="text-gray-600 text-sm mb-1">Scholarship Amount</p>
              <p class="text-2xl font-bold text-gray-900">
                {{ offer.scholarship_amount ? `$${offer.scholarship_amount.toLocaleString()}` : '—' }}
              </p>
            </div>
            <div>
              <p class="text-gray-600 text-sm mb-1">Scholarship %</p>
              <p class="text-2xl font-bold text-gray-900">
                {{ offer.scholarship_percentage ? `${offer.scholarship_percentage}%` : '—' }}
              </p>
            </div>
            <div>
              <p class="text-gray-600 text-sm mb-1">Deadline</p>
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
                {{ offer.deadline_date ? `${daysUntilDeadline}d` : '—' }}
              </p>
              <p class="text-xs text-gray-600 mt-1">{{ formatDeadline }}</p>
            </div>
          </div>

          <!-- Offer Details Grid -->
          <div v-if="!isEditing" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="text-sm">
              <p class="text-gray-600 mb-1">Offer Date</p>
              <p class="font-semibold text-gray-900">{{ formatDate(offer.offer_date) }}</p>
            </div>
            <div class="text-sm">
              <p class="text-gray-600 mb-1">Deadline Date</p>
              <p class="font-semibold text-gray-900">
                {{ offer.deadline_date ? formatDate(offer.deadline_date) : 'No deadline set' }}
              </p>
            </div>

            <div v-if="offer.conditions" class="text-sm md:col-span-2">
              <p class="text-gray-600 mb-1">Conditions</p>
              <p class="font-semibold text-gray-900">{{ offer.conditions }}</p>
            </div>

            <div v-if="offer.notes" class="text-sm md:col-span-2">
              <p class="text-gray-600 mb-1">Notes</p>
              <p class="font-semibold text-gray-900">{{ offer.notes }}</p>
            </div>
          </div>
        </div>

        <!-- Scholarship Calculator -->
        <div class="bg-white rounded-lg shadow p-6">
          <ScholarshipCalculator
            :initial-amount="offer.scholarship_amount || undefined"
            :initial-percentage="offer.scholarship_percentage || undefined"
            :on-save-value="
              (amount, percentage) => {
                editForm.scholarship_amount = amount
                editForm.scholarship_percentage = percentage
              }
            "
          />
        </div>

        <!-- Edit Form -->
        <div v-if="isEditing" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Edit Offer</h2>
          <form @submit.prevent="saveOffer" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Offer Type -->
              <div>
                <label for="offerType" class="block text-sm font-medium text-gray-700 mb-1">
                  Offer Type
                </label>
                <select
                  id="offerType"
                  v-model="editForm.offer_type"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                <label for="status" class="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  v-model="editForm.status"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <!-- Scholarship Amount -->
              <div>
                <label for="amount" class="block text-sm font-medium text-gray-700 mb-1">
                  Scholarship Amount ($)
                </label>
                <input
                  id="amount"
                  v-model.number="editForm.scholarship_amount"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="0"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Scholarship Percentage -->
              <div>
                <label for="percentage" class="block text-sm font-medium text-gray-700 mb-1">
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
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Offer Date -->
              <div>
                <label for="offerDate" class="block text-sm font-medium text-gray-700 mb-1">
                  Offer Date
                </label>
                <input
                  id="offerDate"
                  v-model="editForm.offer_date"
                  type="date"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Deadline Date -->
              <div>
                <label for="deadline" class="block text-sm font-medium text-gray-700 mb-1">
                  Deadline Date
                </label>
                <input
                  id="deadline"
                  v-model="editForm.deadline_date"
                  type="date"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Conditions -->
              <div class="md:col-span-2">
                <label for="conditions" class="block text-sm font-medium text-gray-700 mb-1">
                  Conditions or Requirements
                </label>
                <textarea
                  id="conditions"
                  v-model="editForm.conditions"
                  rows="3"
                  placeholder="Any conditions attached to the offer..."
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Notes -->
              <div class="md:col-span-2">
                <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  v-model="editForm.notes"
                  rows="3"
                  placeholder="Additional notes about this offer..."
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <!-- Buttons -->
            <div class="flex gap-4">
              <button
                type="submit"
                :disabled="loading"
                class="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {{ loading ? 'Saving...' : 'Save Changes' }}
              </button>
              <button
                type="button"
                @click="isEditing = false"
                class="flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOffers } from '~/composables/useOffers'
import { useSchools } from '~/composables/useSchools'
import ScholarshipCalculator from '~/components/ScholarshipCalculator.vue'
import type { Offer } from '~/types/models'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()
const { offers, loading, fetchOffers, updateOffer, deleteOffer: deleteOfferAPI, daysUntilDeadline: calculateDaysUntil } = useOffers()
const { schools, fetchSchools } = useSchools()

const isEditing = ref(false)
const error = ref('')

const offerId = computed(() => route.params.id as string)

const offer = computed(() => offers.value.find((o) => o.id === offerId.value))

const schoolName = computed(() => {
  if (!offer.value) return ''
  return schools.value.find((s) => s.id === offer.value!.school_id)?.name || 'Unknown School'
})

const daysUntilDeadline = computed(() => {
  if (!offer.value) return null
  return calculateDaysUntil(offer.value)
})

const formatDeadline = computed(() => {
  if (!offer.value?.deadline_date) return 'No deadline set'
  const date = new Date(offer.value.deadline_date)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
})

interface EditFormData {
  offer_type: Offer['offer_type']
  status: Offer['status']
  scholarship_amount: number | null
  scholarship_percentage: number | null
  offer_date: string
  deadline_date: string
  conditions: string
  notes: string
}

const editForm = reactive<EditFormData>({
  offer_type: 'full_ride',
  status: 'pending',
  scholarship_amount: null,
  scholarship_percentage: null,
  offer_date: '',
  deadline_date: '',
  conditions: '',
  notes: '',
})

const getStatusBadgeClasses = (status: string): string => {
  const classes: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    declined: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800',
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getStatusLabel = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const getOfferTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    full_ride: 'Full Ride Scholarship',
    partial: 'Partial Scholarship',
    scholarship: 'Scholarship',
    recruited_walk_on: 'Recruited Walk-On',
    preferred_walk_on: 'Preferred Walk-On',
  }
  return labels[type] || type
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const saveOffer = async () => {
  if (!offer.value) return
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
    })
    isEditing.value = false
    await fetchOffers()
  } catch (err) {
    error.value = 'Failed to save offer'
    console.error('Error saving offer:', err)
  }
}

const deleteOffer = async () => {
  if (confirm('Are you sure you want to delete this offer?')) {
    try {
      await deleteOfferAPI(offerId.value)
      await router.push('/offers')
    } catch (err) {
      error.value = 'Failed to delete offer'
      console.error('Error deleting offer:', err)
    }
  }
}

const loadOfferData = () => {
  if (offer.value) {
    editForm.offer_type = offer.value.offer_type
    editForm.status = offer.value.status
    editForm.scholarship_amount = offer.value.scholarship_amount || null
    editForm.scholarship_percentage = offer.value.scholarship_percentage || null
    editForm.offer_date = offer.value.offer_date
    editForm.deadline_date = offer.value.deadline_date || ''
    editForm.conditions = offer.value.conditions || ''
    editForm.notes = offer.value.notes || ''
  }
}

onMounted(async () => {
  await Promise.all([fetchSchools(), fetchOffers()])
  loadOfferData()
})
</script>
