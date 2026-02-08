<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink
          to="/coaches"
          class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back to All Coaches
        </NuxtLink>
      </div>
    </div>

    <main class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-slate-600">Loading coach profile...</p>
      </div>

      <!-- Error State -->
      <div
        v-if="error"
        class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
      >
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Coach Not Found -->
      <div
        v-if="!loading && !coach"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center"
      >
        <p class="text-slate-600">Coach not found</p>
      </div>

      <!-- Coach Detail -->
      <div v-if="!loading && coach" class="space-y-6">
        <!-- Header Card -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div class="flex items-start justify-between mb-6">
            <div>
              <h1 class="text-3xl font-bold text-slate-900">
                {{ coach.first_name }} {{ coach.last_name }}
              </h1>
              <p class="text-lg text-slate-700 mt-1">
                {{ getRoleLabel(coach.role) }}
              </p>
              <p class="text-slate-600 mt-1" v-if="schoolName">
                {{ schoolName }}
              </p>
              <div
                v-if="coach.last_contact_date"
                class="flex items-center gap-2 text-slate-600 text-sm mt-3"
              >
                <CalendarIcon class="w-4 h-4" />
                Last contact: {{ formatDate(coach.last_contact_date) }} ({{
                  daysAgo(coach.last_contact_date)
                }}
                days ago)
              </div>
              <div
                v-else
                class="flex items-center gap-2 text-slate-500 text-sm mt-3"
              >
                <CalendarIcon class="w-4 h-4" />
                No contact recorded yet
              </div>
            </div>
            <ResponsivenessBadge
              v-if="
                coach.responsiveness_score !== undefined &&
                coach.responsiveness_score !== null
              "
              :percentage="coach.responsiveness_score"
            />
          </div>

          <!-- Contact Info Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div v-if="coach.email" class="flex items-center gap-3">
              <EnvelopeIcon class="w-5 h-5 text-slate-400" />
              <div>
                <div class="text-slate-600 text-sm">Email</div>
                <a
                  :href="`mailto:${coach.email}`"
                  class="text-blue-600 hover:text-blue-700"
                >
                  {{ coach.email }}
                </a>
              </div>
            </div>
            <div v-if="coach.phone" class="flex items-center gap-3">
              <PhoneIcon class="w-5 h-5 text-slate-400" />
              <div>
                <div class="text-slate-600 text-sm">Phone</div>
                <a
                  :href="`tel:${coach.phone}`"
                  class="text-blue-600 hover:text-blue-700"
                >
                  {{ coach.phone }}
                </a>
              </div>
            </div>
            <div v-if="coach.twitter_handle" class="flex items-center gap-3">
              <svg
                class="w-5 h-5 text-slate-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                />
              </svg>
              <div>
                <div class="text-slate-600 text-sm">Twitter/X</div>
                <a
                  :href="`https://twitter.com/${coach.twitter_handle.replace('@', '')}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-700"
                >
                  {{ coach.twitter_handle }}
                </a>
              </div>
            </div>
            <div v-if="coach.instagram_handle" class="flex items-center gap-3">
              <svg
                class="w-5 h-5 text-slate-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                />
              </svg>
              <div>
                <div class="text-slate-600 text-sm">Instagram</div>
                <a
                  :href="`https://instagram.com/${coach.instagram_handle.replace('@', '')}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-700"
                >
                  {{ coach.instagram_handle }}
                </a>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-2 mb-4">
            <button
              v-if="coach.email"
              @click="sendEmail"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition shadow-sm"
            >
              <EnvelopeIcon class="w-4 h-4" />
              Email
            </button>
            <button
              v-if="coach.phone"
              @click="sendText"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition shadow-sm"
            >
              <ChatBubbleLeftIcon class="w-4 h-4" />
              Text
            </button>
            <button
              v-if="coach.phone"
              @click="callCoach"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition shadow-sm"
            >
              <PhoneIcon class="w-4 h-4" />
              Call
            </button>
            <button
              v-if="coach.twitter_handle"
              @click="openTwitter"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white text-sm font-semibold rounded-lg hover:from-sky-600 hover:to-sky-700 transition shadow-sm"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                />
              </svg>
              Twitter
            </button>
            <button
              v-if="coach.instagram_handle"
              @click="openInstagram"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition shadow-sm"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                />
              </svg>
              Instagram
            </button>
            <NuxtLink
              :to="`/coaches/${coachId}/analytics`"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition shadow-sm"
            >
              <ChartBarIcon class="w-4 h-4" />
              Analytics
            </NuxtLink>
            <NuxtLink
              :to="`/coaches/${coachId}/communications`"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-500 to-slate-600 text-white text-sm font-semibold rounded-lg hover:from-slate-600 hover:to-slate-700 transition shadow-sm"
            >
              <ChatBubbleLeftRightIcon class="w-4 h-4" />
              Messages
            </NuxtLink>
          </div>

          <!-- Secondary Actions -->
          <div class="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            <NuxtLink
              :to="`/coaches/${coachId}/availability`"
              class="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition"
            >
              <CalendarIcon class="w-4 h-4" />
              Availability
            </NuxtLink>
            <NuxtLink
              :to="`/social/coach/${coachId}`"
              class="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition"
            >
              <RssIcon class="w-4 h-4" />
              Social Posts
            </NuxtLink>
            <button
              @click="editCoach"
              class="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition"
            >
              <PencilIcon class="w-4 h-4" />
              Edit
            </button>
            <button
              @click="openDeleteModal"
              data-test="coach-detail-delete-btn"
              class="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-50 transition ml-auto"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete Coach
            </button>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <p class="text-sm text-slate-500 mb-1">Total Interactions</p>
            <p class="text-3xl font-bold text-slate-900">
              {{ stats.totalInteractions }}
            </p>
          </div>

          <div
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <p class="text-sm text-slate-500 mb-1">Days Since Contact</p>
            <p
              class="text-3xl font-bold"
              :class="
                stats.daysSinceContact === 0
                  ? 'text-emerald-600'
                  : stats.daysSinceContact > 30
                    ? 'text-red-600'
                    : 'text-orange-500'
              "
            >
              {{ stats.daysSinceContact }}
            </p>
          </div>

          <div
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <p class="text-sm text-slate-500 mb-1">Response Method</p>
            <p class="text-xl font-bold text-slate-900">
              {{ stats.preferredMethod || "N/A" }}
            </p>
          </div>
        </div>

        <!-- Notes Section -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-slate-900">Notes</h3>
            <button
              @click="isEditingNotes = !isEditingNotes"
              class="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
            >
              <PencilIcon class="w-4 h-4" />
              {{ isEditingNotes ? "Cancel" : "Edit" }}
            </button>
          </div>

          <div
            v-if="!isEditingNotes"
            class="text-slate-700 whitespace-pre-wrap"
          >
            {{ coach.notes || "No notes added yet." }}
          </div>

          <div v-if="isEditingNotes" class="space-y-4">
            <textarea
              v-model="editedNotes"
              rows="6"
              class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add notes about this coach..."
            />
            <div class="flex gap-3">
              <button
                @click="saveNotes"
                :disabled="savingNotes"
                class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {{ savingNotes ? "Saving..." : "Save Notes" }}
              </button>
              <button
                @click="cancelEditNotes"
                class="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Private Notes Section -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-900 mb-1">
                My Private Notes
              </h3>
              <p class="text-slate-600 text-sm">Only you can see these notes</p>
            </div>
            <button
              @click="isEditingPrivateNotes = !isEditingPrivateNotes"
              class="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
            >
              <PencilIcon class="w-4 h-4" />
              {{ isEditingPrivateNotes ? "Cancel" : "Edit" }}
            </button>
          </div>

          <div
            v-if="!isEditingPrivateNotes"
            class="text-slate-700 whitespace-pre-wrap"
          >
            {{ myPrivateNote || "No private notes yet" }}
          </div>

          <div v-if="isEditingPrivateNotes" class="space-y-4">
            <textarea
              v-model="editedPrivateNotes"
              rows="6"
              class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add your private thoughts about this coach..."
            />
            <div class="flex gap-3">
              <button
                @click="savePrivateNotes"
                :disabled="savingPrivateNotes"
                class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {{ savingPrivateNotes ? "Saving..." : "Save Notes" }}
              </button>
              <button
                @click="isEditingPrivateNotes = false"
                class="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Recent Interactions -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 class="text-lg font-semibold text-slate-900 mb-4">
            Recent Interactions
          </h3>

          <div v-if="recentInteractions.length === 0" class="text-center py-8">
            <p class="text-slate-600">No interactions recorded yet</p>
          </div>

          <div
            v-else
            class="border border-slate-200 rounded-lg overflow-hidden"
          >
            <div
              v-for="(interaction, index) in recentInteractions.slice(0, 10)"
              :key="interaction.id"
              class="flex items-center justify-between px-4 py-3"
              :class="{ 'border-t border-slate-200': index > 0 }"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center"
                  :class="getInteractionBgColor(interaction.type)"
                >
                  <component
                    :is="getInteractionIconComponent(interaction.type)"
                    class="w-4 h-4"
                    :class="getInteractionIconColor(interaction.type)"
                  />
                </div>
                <div>
                  <p class="font-medium text-slate-900">
                    {{ formatInteractionType(interaction.type) }}
                  </p>
                  <p class="text-xs text-slate-500">
                    {{ formatDate(interaction.occurred_at) }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="interaction.sentiment"
                  class="px-2 py-1 text-xs font-semibold rounded"
                  :class="getSentimentColor(interaction.sentiment)"
                >
                  {{ interaction.sentiment }}
                </span>
                <span
                  v-if="interaction.subject"
                  class="text-sm text-slate-600 max-w-[200px] truncate"
                >
                  {{ interaction.subject }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="recentInteractions.length > 10" class="text-center pt-4">
            <button
              class="text-blue-600 hover:text-blue-700 font-semibold text-sm"
            >
              View All {{ recentInteractions.length }} Interactions →
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Communication Panel Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showPanel && coach"
          class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          @click="showPanel = false"
        >
          <div
            class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            @click.stop
          >
            <div
              class="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between rounded-t-xl"
            >
              <h2 class="text-xl font-bold text-slate-900">
                Quick Communication
              </h2>
              <button
                @click="showPanel = false"
                class="text-slate-400 hover:text-slate-600"
              >
                <XMarkIcon class="w-6 h-6" />
              </button>
            </div>
            <div class="p-6">
              <CommunicationPanel
                :coach="coach"
                :school="school"
                :initial-type="communicationType"
                @close="showPanel = false"
                @interaction-logged="handleCoachInteractionLogged"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit Coach Modal -->
    <EditCoachModal
      v-if="showEditModal && coach"
      :coach="coach"
      @close="showEditModal = false"
      @updated="handleCoachUpdated"
    />

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmationModal
      :is-open="deleteModalOpen"
      :item-name="coach ? `${coach.first_name} ${coach.last_name}` : ''"
      item-type="coach"
      :is-loading="isDeleting"
      @cancel="closeDeleteModal"
      @confirm="deleteCoach"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCoaches } from "~/composables/useCoaches";
import { useSchools } from "~/composables/useSchools";
import type { School } from "~/types/models";
import { useInteractions } from "~/composables/useInteractions";
import { useCommunication } from "~/composables/useCommunication";
import { useUserStore } from "~/stores/user";
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  ChartBarIcon,
  PencilIcon,
  RssIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";
import ResponsivenessBadge from "~/components/ResponsivenessBadge.vue";
import DeleteConfirmationModal from "~/components/DeleteConfirmationModal.vue";
import { getRoleLabel } from "~/utils/coachLabels";
import {
  getTypeIcon as getInteractionIconComponent,
  getTypeIconBg as getInteractionBgColor,
  getTypeIconColor as getInteractionIconColor,
  formatType as formatInteractionType,
  getSentimentBadgeClass as getSentimentColor,
} from "~/utils/interactionFormatters";
import type { Coach, Interaction } from "~/types/models";

definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const router = useRouter();
const coachId = route.params.id as string;

const { getCoach, updateCoach, smartDelete } = useCoaches();
const { getSchool } = useSchools();
const { interactions, fetchInteractions } = useInteractions();
const {
  showPanel,
  selectedCoach,
  communicationType,
  openCommunication,
  handleInteractionLogged,
} = useCommunication();
const userStore = useUserStore();

const coach = ref<Coach | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const schoolName = ref("");
const isEditingNotes = ref(false);

// Create a school object from schoolName for CommunicationPanel
// Note: CommunicationPanel only uses the name property, so we can pass a minimal object
const school = computed((): School | undefined => {
  if (!schoolName.value) return undefined;
  return {
    id: "",
    user_id: "",
    name: schoolName.value,
    location: null,
    division: null,
    conference: null,
    website: null,
    favicon_url: null,
    twitter_handle: null,
    instagram_handle: null,
    status: "interested",
    notes: null,
    pros: [],
    cons: [],
    is_favorite: false,
  };
});
const editedNotes = ref("");
const isEditingPrivateNotes = ref(false);
const editedPrivateNotes = ref("");
const savingPrivateNotes = ref(false);
const savingNotes = ref(false);

const recentInteractions = computed(() => {
  return (interactions.value || [])
    .filter((i) => i.coach_id === coachId)
    .sort((a, b) => {
      const dateA = a.occurred_at ? new Date(a.occurred_at).getTime() : 0;
      const dateB = b.occurred_at ? new Date(b.occurred_at).getTime() : 0;
      return dateB - dateA;
    });
});

const stats = computed(() => {
  if (!coach.value)
    return { totalInteractions: 0, daysSinceContact: 0, preferredMethod: "" };

  const total = recentInteractions.value.length;
  const daysSince = coach.value.last_contact_date
    ? daysAgo(coach.value.last_contact_date)
    : 0;

  // Calculate preferred method
  const methods: Record<string, number> = {};
  recentInteractions.value.forEach((i) => {
    methods[i.type] = (methods[i.type] || 0) + 1;
  });
  const preferredMethod =
    Object.entries(methods).sort(([, a], [, b]) => b - a)[0]?.[0] || "";

  return {
    totalInteractions: total,
    daysSinceContact: daysSince,
    preferredMethod: formatInteractionType(preferredMethod),
  };
});

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const daysAgo = (dateString: string): number => {
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - date.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const sendEmail = () => {
  if (coach.value) {
    openCommunication(coach.value, "email");
  }
};

const sendText = () => {
  if (coach.value) {
    openCommunication(coach.value, "text");
  }
};

const handleCoachInteractionLogged = async (interactionData: any) => {
  try {
    const refreshData = async () => {
      const updatedCoach = await getCoach(coachId);
      if (updatedCoach) {
        coach.value = updatedCoach;
      }

      if (coach.value?.school_id) {
        await fetchInteractions({ schoolId: coach.value.school_id, coachId });
      }
    };

    await handleInteractionLogged(interactionData, refreshData);
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to log interaction";
  }
};

const callCoach = () => {
  if (coach.value?.phone) {
    window.location.href = `tel:${coach.value.phone}`;
  }
};

const openTwitter = () => {
  if (coach.value?.twitter_handle) {
    const handle = coach.value.twitter_handle.replace("@", "");
    window.open(`https://twitter.com/${handle}`, "_blank");
  }
};

const openInstagram = () => {
  if (coach.value?.instagram_handle) {
    const handle = coach.value.instagram_handle.replace("@", "");
    window.open(`https://instagram.com/${handle}`, "_blank");
  }
};

const showEditModal = ref(false);

const editCoach = () => {
  showEditModal.value = true;
};

const handleCoachUpdated = async (updated: Coach) => {
  coach.value = updated;
  editedNotes.value = updated.notes || "";
};

// Delete modal state
const deleteModalOpen = ref(false);
const isDeleting = ref(false);

const openDeleteModal = () => {
  deleteModalOpen.value = true;
};

const closeDeleteModal = () => {
  deleteModalOpen.value = false;
};

const deleteCoach = async () => {
  if (!coach.value?.id) return;

  isDeleting.value = true;
  try {
    await smartDelete(coach.value.id);
    closeDeleteModal();
    router.push("/coaches");
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to delete coach";
    error.value = message;
    console.error("Failed to delete coach:", err);
  } finally {
    isDeleting.value = false;
  }
};

const cancelEditNotes = () => {
  editedNotes.value = coach.value?.notes || "";
  isEditingNotes.value = false;
};

const saveNotes = async () => {
  if (!coach.value) return;

  savingNotes.value = true;
  try {
    await updateCoach(coach.value.id, { notes: editedNotes.value });
    coach.value.notes = editedNotes.value;
    isEditingNotes.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to save notes";
  } finally {
    savingNotes.value = false;
  }
};

const myPrivateNote = computed({
  get: () => {
    if (!coach.value || !userStore.user) return "";
    return coach.value.private_notes?.[userStore.user.id] || "";
  },
  set: (value: string) => {
    if (!coach.value || !userStore.user) return;
    coach.value.private_notes = {
      ...(coach.value.private_notes || {}),
      [userStore.user.id]: value,
    };
  },
});

const savePrivateNotes = async () => {
  if (!coach.value || !userStore.user) return;

  savingPrivateNotes.value = true;
  try {
    await updateCoach(coach.value.id, {
      private_notes: {
        ...(coach.value.private_notes || {}),
        [userStore.user.id]: editedPrivateNotes.value,
      },
    });
    coach.value.private_notes = {
      ...(coach.value.private_notes || {}),
      [userStore.user.id]: editedPrivateNotes.value,
    };
    isEditingPrivateNotes.value = false;
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to save private notes";
  } finally {
    savingPrivateNotes.value = false;
  }
};

onMounted(async () => {
  loading.value = true;
  error.value = null;

  try {
    const coachData = await getCoach(coachId);
    if (coachData) {
      coach.value = coachData;
      editedNotes.value = coachData.notes || "";
      editedPrivateNotes.value = String(myPrivateNote.value || "");

      // Fetch school name
      if (coachData.school_id) {
        const schoolData = await getSchool(coachData.school_id);
        if (schoolData) {
          schoolName.value = String(schoolData.name);
        }
      }

      // Fetch interactions for this coach
      if (coachData.school_id) {
        await fetchInteractions({ schoolId: coachData.school_id, coachId });
      }
    } else {
      error.value = "Coach not found";
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load coach";
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
