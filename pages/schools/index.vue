<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Global Navigation -->

    <!-- Timeline Status Snippet -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
      <StatusSnippet context="schools" />
    </div>

    <!-- Athlete Selector (for parents) -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 pt-4" v-if="isParent">
      <AthleteSelector />
    </div>

    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 class="text-2xl font-semibold text-slate-900">Schools</h1>
            <p class="text-slate-600">
              {{ filteredSchools.length }} school{{
                filteredSchools.length !== 1 ? "s" : ""
              }}
              found
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button
              v-if="filteredSchools.length > 0"
              @click="handleExportCSV"
              class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700"
            >
              <ArrowDownTrayIcon class="w-4 h-4" />
              CSV
            </button>
            <button
              v-if="filteredSchools.length > 0"
              @click="handleExportPDF"
              class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700"
            >
              <ArrowDownTrayIcon class="w-4 h-4" />
              PDF
            </button>
            <NuxtLink
              to="/schools/new"
              class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2"
            >
              <PlusIcon class="w-4 h-4" />
              Add School
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Refined Filter Panel -->
      <div class="space-y-6 mb-8">
        <!-- Filter Header with Search + Sliders -->
        <div class="flex flex-col lg:flex-row lg:items-center gap-4">
          <!-- Search (left) -->
          <div class="flex-1">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Find Schools
            </label>
            <div class="relative group">
              <MagnifyingGlassIcon
                class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
              />
              <input
                type="text"
                :value="String((filterValues as any)?.name ?? '')"
                @input="
                  handleFilterUpdate(
                    'name',
                    ($event.target as HTMLInputElement).value,
                  )
                "
                placeholder="Search by name or location..."
                class="w-full pl-12 pr-4 py-3 text-slate-700 placeholder-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white hover:border-slate-300"
              />
            </div>
          </div>

          <!-- Fit Score Slider (equal width) -->
          <div class="w-full lg:w-1/4">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Fit Score
              </label>
              <span class="text-sm font-semibold text-blue-600">
                {{
                  (filterValues.value as any)?.fit_score?.min ?? 0
                }}–{{
                  (filterValues.value as any)?.fit_score?.max ?? 100
                }}
              </span>
            </div>
            <div class="flex gap-2">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                :value="
                  (filterValues.value as any)?.fit_score?.min ?? 0
                "
                @input="
                  handleFilterUpdate('fit_score', {
                    min: parseInt(($event.target as HTMLInputElement).value),
                    max:
                      (filterValues.value as any)?.fit_score?.max ?? 100,
                  })
                "
                class="flex-1 h-2.5 bg-gradient-to-r from-slate-300 to-slate-400 rounded-full appearance-none cursor-pointer accent-blue-500 transition-opacity"
              />
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                :value="
                  (filterValues.value as any)?.fit_score?.max ?? 100
                "
                @input="
                  handleFilterUpdate('fit_score', {
                    min:
                      (filterValues.value as any)?.fit_score?.min ?? 0,
                    max: parseInt(($event.target as HTMLInputElement).value),
                  })
                "
                class="flex-1 h-2.5 bg-gradient-to-r from-slate-300 to-slate-400 rounded-full appearance-none cursor-pointer accent-blue-500 transition-opacity"
              />
            </div>
          </div>

          <!-- Distance Slider (equal width) -->
          <div class="w-full lg:w-1/4">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Distance
              </label>
              <span class="text-sm font-semibold text-blue-600">
                {{
                  (filterValues.value as any)?.distance?.max ??
                  3000
                }}
                <span class="text-xs text-slate-500">mi</span>
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="3000"
              step="50"
              :value="
                (filterValues.value as any)?.distance?.max ?? 3000
              "
              @input="
                handleFilterUpdate('distance', {
                  max: parseInt(($event.target as HTMLInputElement).value),
                })
              "
              :disabled="!userHomeLocation"
              class="w-full h-2.5 bg-gradient-to-r from-slate-300 to-slate-400 rounded-full appearance-none cursor-pointer accent-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            />
            <p
              v-if="!userHomeLocation"
              class="text-xs text-amber-700 mt-1 px-2 py-0.5 bg-amber-50 rounded border border-amber-200"
            >
              ⚠️ Set home location
            </p>
          </div>
        </div>

        <!-- Filter Sections Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <!-- Select Filters Row -->
          <div class="lg:col-span-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <!-- Division -->
            <div class="group">
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Division
              </label>
              <select
                :value="String((filterValues.value as any)?.division ?? '')"
                @change="
                  handleFilterUpdate(
                    'division',
                    ($event.target as HTMLSelectElement).value || null,
                  )
                "
                class="w-full px-3 py-2.5 text-sm text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white hover:border-slate-300 appearance-none cursor-pointer"
                style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/%3E%3C/svg%3E'); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2rem;"
              >
                <option value="">All</option>
                <option value="D1">D1</option>
                <option value="D2">D2</option>
                <option value="D3">D3</option>
                <option value="NAIA">NAIA</option>
                <option value="JUCO">JUCO</option>
              </select>
            </div>

            <!-- Status -->
            <div class="group">
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Status
              </label>
              <select
                :value="String((filterValues.value as any)?.status ?? '')"
                @change="
                  handleFilterUpdate(
                    'status',
                    ($event.target as HTMLSelectElement).value || null,
                  )
                "
                class="w-full px-3 py-2.5 text-sm text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white hover:border-slate-300 appearance-none cursor-pointer"
                style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/%3E%3C/svg%3E'); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2rem;"
              >
                <option value="">All</option>
                <option value="researching">Researching</option>
                <option value="contacted">Contacted</option>
                <option value="interested">Interested</option>
                <option value="offer_received">Offer</option>
                <option value="committed">Committed</option>
              </select>
            </div>

            <!-- State -->
            <div class="group">
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                State
              </label>
              <select
                :value="String((filterValues.value as any)?.state ?? '')"
                @change="
                  handleFilterUpdate(
                    'state',
                    ($event.target as HTMLSelectElement).value || null,
                  )
                "
                class="w-full px-3 py-2.5 text-sm text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white hover:border-slate-300 appearance-none cursor-pointer"
                style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/%3E%3C/svg%3E'); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2rem;"
              >
                <option value="">All</option>
                <option
                  v-for="option in stateOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>

            <!-- Favorites -->
            <div class="group">
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Favorites
              </label>
              <select
                :value="(filterValues.value as any)?.is_favorite ? 'true' : ''"
                @change="
                  handleFilterUpdate(
                    'is_favorite',
                    ($event.target as HTMLSelectElement).value === 'true' || null,
                  )
                "
                class="w-full px-3 py-2.5 text-sm text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white hover:border-slate-300 appearance-none cursor-pointer"
                style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/%3E%3C/svg%3E'); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2rem;"
              >
                <option value="">All</option>
                <option value="true">⭐ Starred</option>
              </select>
            </div>

            <!-- Priority Tier Filter -->
            <div class="group">
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Tier
              </label>
              <select
                :value="
                  priorityTierFilter && priorityTierFilter.length === 1
                    ? priorityTierFilter[0]
                    : ''
                "
                @change="
                  updatePriorityTierFilter(
                    ($event.target as HTMLSelectElement).value
                      ? [($event.target as HTMLSelectElement).value as 'A' | 'B' | 'C']
                      : null,
                  )
                "
                class="w-full px-3 py-2.5 text-sm text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white hover:border-slate-300 appearance-none cursor-pointer"
                style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/%3E%3C/svg%3E'); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2rem;"
              >
                <option value="">All</option>
                <option value="A">A - Top Choice</option>
                <option value="B">B - Strong Interest</option>
                <option value="C">C - Fallback</option>
              </select>
            </div>

            <!-- Sort Selector -->
            <div class="group">
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Sort
              </label>
              <select
                :value="sortBy"
                @change="sortBy = ($event.target as HTMLSelectElement).value"
                class="w-full px-3 py-2.5 text-sm text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white hover:border-slate-300 appearance-none cursor-pointer"
                style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/%3E%3C/svg%3E'); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2rem;"
              >
                <option value="a-z">A-Z</option>
                <option value="fit-score">Fit Score</option>
                <option value="distance">Distance</option>
                <option value="last-contact">Last Contact</option>
              </select>
            </div>
          </div>

        </div>

        <!-- Active Filters Chips -->
        <div
          v-if="hasActiveFilters"
          class="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100"
        >
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Filters:
          </span>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(value, key) in activeFiltersDisplay"
              :key="key"
              class="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200 hover:bg-blue-100 transition-colors group"
            >
              <span class="text-blue-500">●</span>
              {{ value }}
              <button
                @click="handleRemoveFilter(key as string)"
                class="ml-1 text-blue-400 hover:text-blue-600 transition-colors group-hover:opacity-100"
              >
                <XMarkIcon class="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
          <button
            @click="clearFilters"
            class="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            Clear all
          </button>
        </div>
      </div>

      <!-- Results Intro -->
      <div v-if="!loading" class="mb-6">
        <p class="text-sm text-slate-600">
          <span class="font-semibold text-slate-900">{{ filteredSchools.length }}</span>
          result{{ filteredSchools.length !== 1 ? "s" : "" }} found
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div
          class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
        ></div>
        <p class="text-slate-600">Loading schools...</p>
      </div>

      <!-- Error State -->
      <div
        v-if="error"
        class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700"
      >
        {{ error }}
      </div>

      <!-- 30+ Schools Warning -->
      <div
        v-if="shouldShowSchoolWarning"
        class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-0.5">
            <svg
              class="h-5 w-5 text-amber-600"
              fill="currentColor"
              viewBox="0 0 20 20"
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
              You have {{ schools.length }} schools on your list
            </h3>
            <p class="text-sm text-amber-800 mt-1">
              Consider organizing your schools with priority tiers (A, B, C) to
              better manage your recruiting strategy.
            </p>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="!loading && filteredSchools.length === 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <MagnifyingGlassIcon class="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 class="text-lg font-semibold text-slate-900 mb-2">
          No schools found
        </h3>
        <p class="text-slate-600 mb-6">
          Try adjusting your filters or search terms
        </p>
        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition"
        >
          Clear Filters
        </button>
        <NuxtLink
          v-else
          to="/schools/new"
          class="inline-block px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition"
        >
          Add Your First School
        </NuxtLink>
      </div>

      <!-- Schools Grid -->
      <div
        v-if="!loading && filteredSchools.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <div
          v-for="school in filteredSchools"
          :key="school.id"
          class="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
        >
          <!-- Card Content -->
          <div class="p-5">
            <div class="flex items-start gap-4 mb-4">
              <!-- Logo -->
              <SchoolLogo
                :school="school"
                size="lg"
                fetch-on-mount
                class="shadow-md rounded-lg"
              />

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <h3 class="text-slate-900 font-semibold line-clamp-2 mb-1">
                  {{ school.name }}
                </h3>
                <p class="text-slate-600 text-sm">{{ school.location }}</p>
              </div>

              <!-- Favorite Star -->
              <button
                @click.stop="toggleFavorite(school.id, school.is_favorite)"
                :class="[
                  'flex-shrink-0 transition-all',
                  school.is_favorite
                    ? 'text-yellow-500'
                    : 'text-slate-300 hover:text-yellow-400',
                ]"
              >
                <StarIcon
                  :class="[
                    'w-5 h-5',
                    school.is_favorite ? 'fill-yellow-500' : '',
                  ]"
                />
              </button>
            </div>

            <!-- Badges -->
            <div class="flex flex-wrap gap-2 mb-4">
              <span
                v-if="school.division"
                class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700"
              >
                {{ school.division }}
              </span>
              <span
                :class="getStatusBadgeClass(school.status)"
                class="px-2 py-0.5 text-xs font-medium rounded-full"
              >
                {{ formatStatus(school.status) }}
              </span>
              <span
                v-if="school.fit_score !== null && school.fit_score !== undefined"
                :class="getFitScoreBadgeClass(school.fit_score)"
                class="px-2 py-0.5 text-xs font-medium rounded-full"
              >
                Fit: {{ school.fit_score }}
              </span>
              <span
                v-if="
                  getCarnegieSize(
                    typeof school.academic_info?.student_size === 'string'
                      ? parseInt(school.academic_info.student_size)
                      : typeof school.academic_info?.student_size === 'number'
                        ? school.academic_info.student_size
                        : null,
                  )
                "
                :class="
                  getSizeBadgeClass(
                    getCarnegieSize(
                      typeof school.academic_info?.student_size === 'string'
                        ? parseInt(school.academic_info.student_size)
                        : typeof school.academic_info?.student_size === 'number'
                          ? school.academic_info.student_size
                          : null,
                    ),
                  )
                "
                class="px-2 py-0.5 text-xs font-medium rounded-full"
              >
                {{
                  getCarnegieSize(
                    typeof school.academic_info?.student_size === "string"
                      ? parseInt(school.academic_info.student_size)
                      : typeof school.academic_info?.student_size === "number"
                        ? school.academic_info.student_size
                        : null,
                  )
                }}
              </span>
            </div>

            <!-- Conference/Notes -->
            <p v-if="school.conference" class="text-slate-600 text-sm mb-2">
              {{ school.conference }}
            </p>
            <p v-if="school.notes" class="text-slate-600 text-sm line-clamp-2 mb-4">
              {{ school.notes }}
            </p>

            <!-- Private Notes Card -->
            <PrivateNotesCard entity-type="school" :entity-id="school.id" class="mb-4" />
          </div>

          <!-- Actions -->
          <div class="px-5 pb-5 flex gap-2">
            <NuxtLink
              :to="`/schools/${school.id}`"
              class="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition text-center flex items-center justify-center gap-2"
            >
              <EyeIcon class="w-4 h-4" />
              View
            </NuxtLink>
            <button
              @click.stop="deleteSchool(school.id)"
              class="px-3 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition"
            >
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, inject } from "vue";
import { useSchools } from "~/composables/useSchools";
import { useSchoolLogos } from "~/composables/useSchoolLogos";
import { useSchoolMatching } from "~/composables/useSchoolMatching";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useOffers } from "~/composables/useOffers";
import { useInteractions } from "~/composables/useInteractions";
import { useCoaches } from "~/composables/useCoaches";
import { useFamilyContext } from "~/composables/useFamilyContext";
import { useUserStore } from "~/stores/user";
import { useUniversalFilter } from "~/composables/useUniversalFilter";
import type { School } from "~/types";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  StarIcon,
  EyeIcon,
  TrashIcon,
} from "@heroicons/vue/24/outline";
import SchoolLogo from "~/components/School/SchoolLogo.vue";
import StatusSnippet from "~/components/Timeline/StatusSnippet.vue";
import SortSelector from "~/components/Schools/SortSelector.vue";
import {
  exportSchoolComparisonToCSV,
  generateSchoolComparisonPDF,
  type SchoolComparisonData,
} from "~/utils/exportUtils";
import { getCarnegieSize } from "~/utils/schoolSize";
import { calculateDistance } from "~/utils/distance";
import { extractStateFromLocation } from "~/utils/locationParser";
import type { FilterConfig } from "~/types/filters";

definePageMeta({});

// Inject family context provided at app.vue level (with singleton fallback)
const activeFamily = inject("activeFamily") || useFamilyContext();
const { activeFamilyId } = activeFamily;

// Call composables that depend on the family context
const { schools, loading, error, fetchSchools, toggleFavorite, deleteSchool } =
  useSchools();
const { fetchMultipleLogos } = useSchoolLogos();
const { calculateMatchScore } = useSchoolMatching();
const { getSchoolPreferences, getHomeLocation } =
  usePreferenceManager();
const { offers, fetchOffers } = useOffers();
const { interactions: interactionsData, fetchInteractions } = useInteractions();
const { coaches: coachesData, fetchAllCoaches } = useCoaches();

const userStore = useUserStore();

const allInteractions = ref<any[]>([]);
const allCoaches = ref<any[]>([]);
const priorityTierFilter = ref<("A" | "B" | "C")[] | null>(null);
const sortBy = ref<string>("a-z");

const isParent = computed(() => userStore.user?.role === "parent");

// Re-fetch schools if user initializes after page mount (race condition safety)
watch(
  () => userStore.user?.id,
  async (newUserId) => {
    console.debug(
      `[Schools] User watcher fired: userId=${newUserId}, schools=${schools.value.length}`,
    );
    if (newUserId && schools.value.length === 0) {
      console.debug("[Schools] User initialized, re-fetching schools");
      await fetchSchools();
      console.debug(`[Schools] Re-fetch complete: ${schools.value.length} schools`);
    }
  },
);

// Re-fetch schools when active athlete changes (for parents switching between children)
watch(
  () => activeFamilyId.value,
  async (newFamilyId) => {
    if (newFamilyId) {
      console.debug(
        `[Schools] Family changed: familyId=${newFamilyId}, re-fetching schools`,
      );
      // Pass the family context to the fetch to ensure it has access to it
      console.debug(`[Schools] Current activeFamily ID for fetch: ${activeFamily.activeFamilyId.value}`);
      await fetchSchools();
    }
  },
  { immediate: true },
);

const userHomeLocation = computed(() => getHomeLocation());

const hasPreferences = computed(() => {
  const prefs = getSchoolPreferences();
  return (prefs?.preferences?.length || 0) > 0;
});

const shouldShowSchoolWarning = computed(() => {
  return schools.value.length >= 30;
});

// Compute dynamic state options from schools
const stateOptions = computed(() => {
  const states = new Set<string>();
  schools.value.forEach((school) => {
    // Try dedicated state field first
    let state =
      school.academic_info?.state || (school.state as string | undefined);

    // Fallback: extract state from location (e.g., "Berea, OH" → "OH")
    if (!state && school.location) {
      state = extractStateFromLocation(school.location);
    }

    if (state && typeof state === "string") {
      states.add(state);
    }
  });
  return Array.from(states)
    .sort()
    .map((state) => ({ value: state, label: state }));
});

// Memoized distance cache to avoid recalculating distances
const distanceCache = computed(() => {
  const cache = new Map<string, number>();
  const homeLocation = getHomeLocation();
  if (!homeLocation?.latitude || !homeLocation?.longitude) {
    return cache;
  }

  schools.value.forEach((school) => {
    const coords = school.academic_info;
    if (
      coords?.latitude &&
      coords?.longitude &&
      typeof coords.latitude === "number" &&
      typeof coords.longitude === "number"
    ) {
      const distance = calculateDistance(
        {
          latitude: homeLocation.latitude,
          longitude: homeLocation.longitude,
        },
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
      );
      cache.set(school.id, distance);
    }
  });

  return cache;
});

// Filter configurations
const filterConfigs: FilterConfig[] = [
  {
    type: "text",
    field: "name",
    label: "Search",
    placeholder: "School name or location...",
    filterFn: (item: School, filterValue: string) => {
      if (!filterValue) return true;
      const query = String(filterValue).toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        item.location?.toLowerCase().includes(query)
      );
    },
  },
  {
    type: "select",
    field: "division",
    label: "Division",
    options: [
      { value: "D1", label: "Division 1" },
      { value: "D2", label: "Division 2" },
      { value: "D3", label: "Division 3" },
      { value: "NAIA", label: "NAIA" },
      { value: "JUCO", label: "JUCO" },
    ],
  },
  {
    type: "select",
    field: "status",
    label: "Status",
    options: [
      { value: "researching", label: "Researching" },
      { value: "contacted", label: "Contacted" },
      { value: "interested", label: "Interested" },
      { value: "offer_received", label: "Offer Received" },
      { value: "committed", label: "Committed" },
    ],
  },
  { type: "boolean", field: "is_favorite", label: "Favorites Only" },
  {
    type: "select",
    field: "state",
    label: "State",
    options: stateOptions,
    filterFn: (item: School, filterValue: string) => {
      let schoolState =
        item.academic_info?.state || (item.state as string | undefined);
      // Fallback: extract state from location
      if (!schoolState && item.location) {
        schoolState = extractStateFromLocation(item.location) || undefined;
      }
      return schoolState === filterValue;
    },
  },
  {
    type: "range",
    field: "fit_score",
    label: "Fit Score",
    min: 0,
    max: 100,
    step: 5,
    defaultValue: { min: 0, max: 100 },
    filterFn: (item: School, filterValue: { min?: number; max?: number }) => {
      const score = item.fit_score;
      if (score === null || score === undefined) return true;
      const min = filterValue?.min ?? 0;
      const max = filterValue?.max ?? 100;
      return score >= min && score <= max;
    },
  },
  {
    type: "range",
    field: "distance",
    label: "Distance",
    min: 0,
    max: 3000,
    step: 50,
    defaultValue: { max: 3000 },
    filterFn: (item: School, filterValue: { max?: number }) => {
      const homeLoc = getHomeLocation();
      if (!homeLoc?.latitude || !homeLoc?.longitude) {
        return true;
      }
      const distance = distanceCache.value.get(item.id);
      if (distance === undefined) return true;
      const maxDistance = filterValue?.max ?? 3000;
      return distance <= maxDistance;
    },
  },
];

const {
  filterValues,
  filteredItems,
  activeFilterCount,
  hasActiveFilters,
  setFilterValue,
  clearFilters,
  getFilterDisplayValue,
} = useUniversalFilter(schools as any, filterConfigs, {
  storageKey: "schools-filters",
  persistState: false, // Don't persist filters to prevent stale state on login/logout
});

// Computed for active filters display
const activeFiltersDisplay = computed(() => {
  const display: Record<string, string> = {};
  Object.entries(filterValues.value).forEach(([key, value]: [string, any]) => {
    if (value) {
      if (key === "is_favorite") {
        display[key] = "Favorites";
      } else if (key === "name") {
        display[key] = `"${value}"`;
      } else if (key === "fit_score") {
        if (typeof value === "object" && value !== null) {
          const min = value.min ?? 0;
          const max = value.max ?? 100;
          if (min === 0 && max === 100) {
            return; // Default range, don't display
          }
          display[key] = `${min} - ${max}`;
        }
      } else if (key === "distance") {
        if (typeof value === "object" && value !== null) {
          const max = value.max ?? 3000;
          if (max === 3000) {
            return; // Default max, don't display
          }
          display[key] = `Within ${max} miles`;
        }
      } else {
        display[key] = String(value);
      }
    }
  });

  // Add priority tier filter if selected
  if (priorityTierFilter.value && priorityTierFilter.value.length > 0) {
    display["priority_tier"] = priorityTierFilter.value.join(", ");
  }

  return display;
});

// Apply additional filtering and sorting with performance tracking
const filteredSchools = computed(() => {
  const startTime = typeof performance !== "undefined" ? performance.now() : 0;

  let filtered = filteredItems.value as unknown as School[];

  // Apply priority tier filter if selected
  if (priorityTierFilter.value && priorityTierFilter.value.length > 0) {
    filtered = filtered.filter((s: School) =>
      priorityTierFilter.value?.includes(s.priority_tier as "A" | "B" | "C"),
    );
  }

  // Apply match filter if enabled
  const showMatches = filterValues.value.show_matches;
  if (showMatches && hasPreferences.value) {
    filtered = filtered.filter((s: School) => {
      const match = calculateMatchScore(s);
      return match.score >= 60 && !match.hasDealbreakers;
    });
  }

  // Apply sorting
  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;

    switch (sortBy.value) {
      case "fit-score": {
        const scoreA = a.fit_score ?? -1;
        const scoreB = b.fit_score ?? -1;
        comparison = scoreB - scoreA; // Highest fit score first
        break;
      }
      case "distance": {
        if (!homeLocation.value?.latitude || !homeLocation.value?.longitude) {
          // Fall back to A-Z if home location not set
          comparison = a.name.localeCompare(b.name);
          break;
        }

        const getDistance = (school: School): number => {
          const cached = distanceCache.value.get(school.id);
          if (cached !== undefined) return cached;
          return Infinity;
        };

        const distA = getDistance(a);
        const distB = getDistance(b);
        comparison = distA - distB; // Closest first
        break;
      }
      case "last-contact": {
        const dateA = new Date(a.updated_at || 0).getTime();
        const dateB = new Date(b.updated_at || 0).getTime();
        comparison = dateB - dateA; // Most recent first
        break;
      }
      case "a-z":
      default:
        comparison = a.name.localeCompare(b.name);
        break;
    }

    return comparison;
  });

  // Log performance in dev mode
  if (typeof performance !== "undefined" && import.meta.env.DEV) {
    const duration = performance.now() - startTime;
    if (duration > 100) {
      console.warn(
        `Filter execution time exceeded 100ms: ${duration.toFixed(2)}ms for ${sorted.length} schools`,
      );
    }
  }

  return sorted;
});

// Filter event handlers
const handleFilterUpdate = (field: string, value: any) => {
  setFilterValue(field, value);
};

const handleRemoveFilter = (field: string) => {
  if (field === "priority_tier") {
    priorityTierFilter.value = null;
  } else {
    setFilterValue(field, null);
  }
};

const updatePriorityTierFilter = (tiers: ("A" | "B" | "C")[] | null) => {
  priorityTierFilter.value = tiers;
};

// Badge helpers
const getStatusBadgeClass = (status: string): string => {
  const classes: Record<string, string> = {
    researching: "bg-slate-100 text-slate-700",
    contacted: "bg-yellow-100 text-yellow-700",
    interested: "bg-emerald-100 text-emerald-700",
    offer_received: "bg-green-100 text-green-700",
    committed: "bg-purple-100 text-purple-700",
    declined: "bg-red-100 text-red-700",
  };
  return classes[status] || "bg-slate-100 text-slate-700";
};

const getSizeBadgeClass = (size: string | null | undefined): string => {
  if (!size) return "";
  const classes: Record<string, string> = {
    "Very Small": "bg-indigo-100 text-indigo-700",
    Small: "bg-blue-100 text-blue-700",
    Medium: "bg-emerald-100 text-emerald-700",
    Large: "bg-orange-100 text-orange-700",
    "Very Large": "bg-purple-100 text-purple-700",
  };
  return classes[size] || "bg-slate-100 text-slate-700";
};

const getFitScoreBadgeClass = (score: number): string => {
  if (score >= 70) return "bg-emerald-100 text-emerald-700";
  if (score >= 50) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
};

const formatStatus = (status: string): string => {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

// Export functions
const getExportData = (): SchoolComparisonData[] => {
  return filteredSchools.value.map((school) => {
    const schoolOffers = offers.value.filter((o) => o.school_id === school.id);
    const interactionCount = allInteractions.value.filter(
      (i) => i.school_id === school.id,
    ).length;
    const coachCount = allCoaches.value.filter(
      (c) => c.school_id === school.id,
    ).length;

    let distance: number | null = null;
    if (
      homeLocation.value?.latitude &&
      homeLocation.value?.longitude &&
      school.academic_info
    ) {
      const lat = school.academic_info["latitude"] as number | undefined;
      const lng = school.academic_info["longitude"] as number | undefined;
      if (lat && lng) {
        distance = calculateDistance(
          {
            latitude: homeLocation.value.latitude,
            longitude: homeLocation.value.longitude,
          },
          { latitude: lat, longitude: lng },
        );
      }
    }

    return {
      ...school,
      favicon_url: null, // Add missing field for SchoolComparisonData
      coachCount,
      interactionCount,
      offer: schoolOffers.length > 0 ? schoolOffers[0] : null,
      distance,
    };
  });
};

const handleExportCSV = () => {
  const data = getExportData();
  if (data.length === 0) return;
  exportSchoolComparisonToCSV(data);
};

const handleExportPDF = () => {
  const data = getExportData();
  if (data.length === 0) return;
  generateSchoolComparisonPDF(data);
};

onMounted(async () => {
  console.debug("[Schools] Page mounted, fetching data");
  // Don't fetch schools here - the watchers will handle it when family context is ready
  // Just fetch other data that doesn't depend on family context
  await Promise.all([
    fetchOffers(),
    fetchAllCoaches(),
    fetchInteractions({}),
  ]);
  allInteractions.value = interactionsData.value;
  allCoaches.value = coachesData.value;

  console.debug(`[Schools] onMounted complete: ${schools.value.length} schools loaded`);
  if (schools.value.length > 0) {
    fetchMultipleLogos(schools.value).catch((err) => {
      console.warn("Failed to fetch logos:", err);
    });
  }
});
</script>

<style scoped>
/* Range input slider styling */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 10px;
  background: transparent;
  cursor: pointer;
  outline: none;
}

/* Webkit browsers (Chrome, Safari, Edge) */
input[type="range"]::-webkit-slider-runnable-track {
  height: 6px;
  background: linear-gradient(to right, #cbd5e1, #a1a5ab);
  border-radius: 3px;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  margin-top: -5px;
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: #2563eb;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

/* Firefox */
input[type="range"]::-moz-range-track {
  background: linear-gradient(to right, #cbd5e1, #a1a5ab);
  height: 6px;
  border-radius: 3px;
  border: none;
}

input[type="range"]::-moz-range-progress {
  background: linear-gradient(to right, #cbd5e1, #a1a5ab);
  height: 6px;
  border-radius: 3px;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb:hover {
  background: #2563eb;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

/* Disabled state */
input[type="range"]:disabled::-webkit-slider-runnable-track {
  background: #e2e8f0;
}

input[type="range"]:disabled::-webkit-slider-thumb {
  background: #cbd5e1;
  cursor: not-allowed;
}

input[type="range"]:disabled::-moz-range-track {
  background: #e2e8f0;
}

input[type="range"]:disabled::-moz-range-thumb {
  background: #cbd5e1;
  cursor: not-allowed;
}
</style>
