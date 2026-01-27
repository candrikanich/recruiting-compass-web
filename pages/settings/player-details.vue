<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <div class="flex justify-between items-start mb-2">
          <NuxtLink
            to="/settings"
            class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <ArrowLeftIcon class="w-4 h-4" />
            Back to Settings
          </NuxtLink>
          <ProfileEditHistory />
        </div>
        <h1
          data-testid="page-title"
          class="text-2xl font-semibold text-slate-900"
        >
          Player Details
        </h1>
        <p class="text-slate-600">
          Athletic profile information for recruiting
        </p>
      </div>
    </div>

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
        ></div>
        <p class="text-slate-600">Loading player details...</p>
      </div>

      <!-- Error summary -->
      <FormErrorSummary
        v-if="hasErrors && !isLoading"
        :errors="errors"
        @dismiss="clearErrors"
      />

      <!-- Form -->
      <form v-if="!isLoading" @submit.prevent="handleSave" class="space-y-8">
        <!-- Read-only Warning Banner for Parents -->
        <div
          v-if="isParentRole"
          class="mb-6 rounded-lg bg-amber-50 border-l-4 border-amber-400 p-4"
        >
          <div class="flex">
            <div class="flex-shrink-0">
              <ExclamationCircleIcon class="h-5 w-5 text-amber-400" />
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-amber-800">Read-only view</h3>
              <div class="mt-2 text-sm text-amber-700">
                <p>You're viewing this profile as a parent. Contact your athlete to make changes.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Profile Photo Section -->
        <div
          class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          data-testid="profile-photo-section"
        >
          <h2 class="text-lg font-semibold text-slate-900 mb-4">
            Profile Photo
          </h2>
          <ProfilePhotoUpload />
        </div>

        <!-- Basic Info -->
        <div
          class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          data-testid="basic-info-section"
        >
          <h2 class="text-lg font-semibold text-slate-900 mb-4">
            Basic Information
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Graduation Year <span class="text-red-600">*</span>
              </label>
              <select
                v-model="form.graduation_year"
                :disabled="isParentRole"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option :value="undefined">Select Year</option>
                <option
                  v-for="year in graduationYears"
                  :key="year"
                  :value="year"
                >
                  {{ year }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >High School</label
              >
              <input
                v-model="form.high_school"
                :disabled="isParentRole"
                type="text"
                placeholder="e.g., Lincoln High School"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Club/Travel Team</label
              >
              <input
                v-model="form.club_team"
                :disabled="isParentRole"
                type="text"
                placeholder="e.g., East Coast Sox"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <!-- Positions -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">Positions</h2>
          <p class="text-sm text-gray-600 mb-4">
            Select all positions you play (primary position first)
          </p>

          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            <button
              v-for="pos in POSITIONS"
              :key="pos.value"
              type="button"
              :disabled="isParentRole"
              @click="togglePosition(pos.value)"
              :class="[
                'px-4 py-3 rounded-lg font-medium text-sm transition border-2 disabled:opacity-50 disabled:cursor-not-allowed',
                isPositionSelected(pos.value)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400',
              ]"
            >
              {{ pos.label }}
            </button>
          </div>

          <div v-if="form.positions && form.positions.length > 0" class="mt-4">
            <p class="text-sm text-gray-600">
              Selected:
              <span class="font-medium">{{ form.positions.join(", ") }}</span>
            </p>
          </div>
        </div>

        <!-- Physical & Athletic -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">Physical Profile</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Bats</label
              >
              <div class="flex gap-4">
                <label
                  v-for="opt in BATS_OPTIONS"
                  :key="opt.value"
                  :class="['flex items-center gap-2', isParentRole ? '' : 'cursor-pointer']"
                >
                  <input
                    type="radio"
                    :value="opt.value"
                    v-model="form.bats"
                    :disabled="isParentRole"
                    class="w-4 h-4 text-blue-600 disabled:cursor-not-allowed"
                  />
                  <span :class="['text-gray-700', isParentRole ? 'text-gray-500' : '']">{{ opt.label }}</span>
                </label>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Throws</label
              >
              <div class="flex gap-4">
                <label
                  v-for="opt in THROWS_OPTIONS"
                  :key="opt.value"
                  :class="['flex items-center gap-2', isParentRole ? '' : 'cursor-pointer']"
                >
                  <input
                    type="radio"
                    :value="opt.value"
                    v-model="form.throws"
                    :disabled="isParentRole"
                    class="w-4 h-4 text-blue-600 disabled:cursor-not-allowed"
                  />
                  <span :class="['text-gray-700', isParentRole ? 'text-gray-500' : '']">{{ opt.label }}</span>
                </label>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Height</label
              >
              <div class="flex gap-2">
                <select
                  v-model="heightFeet"
                  :disabled="isParentRole"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option :value="undefined">Feet</option>
                  <option v-for="ft in [4, 5, 6, 7]" :key="ft" :value="ft">
                    {{ ft }}'
                  </option>
                </select>
                <select
                  v-model="heightInches"
                  :disabled="isParentRole"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option :value="undefined">Inches</option>
                  <option v-for="i in 12" :key="i - 1" :value="i - 1">
                    {{ i - 1 }}"
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Weight (lbs)</label
              >
              <input
                v-model.number="form.weight_lbs"
                :disabled="isParentRole"
                type="number"
                min="100"
                max="400"
                placeholder="e.g., 185"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <!-- Academics -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">Academics</h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >GPA</label
              >
              <input
                v-model.number="form.gpa"
                :disabled="isParentRole"
                type="number"
                step="0.01"
                min="0"
                max="5"
                placeholder="e.g., 3.75"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >SAT Score</label
              >
              <input
                v-model.number="form.sat_score"
                :disabled="isParentRole"
                type="number"
                min="400"
                max="1600"
                placeholder="e.g., 1200"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >ACT Score</label
              >
              <input
                v-model.number="form.act_score"
                :disabled="isParentRole"
                type="number"
                min="1"
                max="36"
                placeholder="e.g., 28"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <!-- External IDs -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">
            External Profiles
          </h2>
          <p class="text-sm text-gray-600 mb-4">
            Link your profiles from recruiting databases
          </p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >NCAA ID</label
              >
              <input
                v-model="form.ncaa_id"
                :disabled="isParentRole"
                type="text"
                placeholder="NCAA Eligibility ID"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Perfect Game ID</label
              >
              <input
                v-model="form.perfect_game_id"
                :disabled="isParentRole"
                type="text"
                placeholder="Perfect Game Player ID"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Prep Baseball ID</label
              >
              <input
                v-model="form.prep_baseball_id"
                :disabled="isParentRole"
                type="text"
                placeholder="Prep Baseball Report ID"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <!-- Social Media -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">Social Media</h2>
          <p class="text-sm text-gray-600 mb-4">
            Add your social media accounts for coaches to follow
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"
              >
                <ShareIcon class="w-4 h-4" />
                <span>Twitter Handle</span>
              </label>
              <div class="flex items-center gap-2">
                <span class="text-gray-500">@</span>
                <input
                  v-model="form.twitter_handle"
                  :disabled="isParentRole"
                  type="text"
                  placeholder="username"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label
                class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"
              >
                <PhotoIcon class="w-4 h-4" />
                <span>Instagram Handle</span>
              </label>
              <div class="flex items-center gap-2">
                <span class="text-gray-500">@</span>
                <input
                  v-model="form.instagram_handle"
                  :disabled="isParentRole"
                  type="text"
                  placeholder="username"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >🎵 TikTok Handle</label
              >
              <div class="flex items-center gap-2">
                <span class="text-gray-500">@</span>
                <input
                  v-model="form.tiktok_handle"
                  :disabled="isParentRole"
                  type="text"
                  placeholder="username"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >f Facebook Profile</label
              >
              <input
                v-model="form.facebook_url"
                :disabled="isParentRole"
                type="url"
                placeholder="https://facebook.com/..."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <!-- Contact Information -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">
            Contact Information
          </h2>
          <p class="text-sm text-gray-600 mb-4">
            Coaches can use this to contact you about recruiting opportunities
          </p>

          <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >Phone</label
                >
                <input
                  v-model="form.phone"
                  :disabled="isParentRole"
                  type="tel"
                  placeholder="(123) 456-7890"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >Email</label
                >
                <input
                  v-model="form.email"
                  :disabled="isParentRole"
                  type="email"
                  placeholder="your.email@example.com"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div class="border-t border-gray-200 pt-6">
              <p class="text-sm font-medium text-gray-700 mb-4">
                Sharing Permissions
              </p>
              <div class="space-y-3">
                <label :class="['flex items-center gap-3', isParentRole ? '' : 'cursor-pointer']">
                  <input
                    v-model="form.allow_share_phone"
                    :disabled="isParentRole"
                    type="checkbox"
                    class="w-4 h-4 text-blue-600 rounded disabled:cursor-not-allowed"
                  />
                  <span :class="['text-gray-700', isParentRole ? 'text-gray-500' : '']"
                    >Allow coaches to see my phone number</span
                  >
                </label>
                <label :class="['flex items-center gap-3', isParentRole ? '' : 'cursor-pointer']">
                  <input
                    v-model="form.allow_share_email"
                    :disabled="isParentRole"
                    type="checkbox"
                    class="w-4 h-4 text-blue-600 rounded disabled:cursor-not-allowed"
                  />
                  <span :class="['text-gray-700', isParentRole ? 'text-gray-500' : '']"
                    >Allow coaches to see my email</span
                  >
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- School Information -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">
            Current High School
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >School Name</label
              >
              <input
                v-model="form.school_name"
                :disabled="isParentRole"
                type="text"
                placeholder="e.g., Lincoln High School"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Address</label
              >
              <input
                v-model="form.school_address"
                :disabled="isParentRole"
                type="text"
                placeholder="e.g., 123 Main St"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >City</label
              >
              <input
                v-model="form.school_city"
                :disabled="isParentRole"
                type="text"
                placeholder="e.g., Atlanta"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >State</label
              >
              <input
                v-model="form.school_state"
                :disabled="isParentRole"
                type="text"
                placeholder="e.g., GA"
                maxlength="2"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <!-- High School Team Levels -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">
            High School Team Levels
          </h2>
          <p class="text-sm text-gray-600 mb-6">
            Add your team assignment and coach for each grade level
          </p>

          <div class="space-y-6">
            <!-- 9th Grade -->
            <div class="pb-6 border-b border-gray-200">
              <h3 class="text-sm font-semibold text-gray-900 mb-3">
                9th Grade (Freshman)
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Team</label
                  >
                  <input
                    v-model="form.ninth_grade_team"
                    :disabled="isParentRole"
                    type="text"
                    placeholder="e.g., Freshman Team"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Head Coach</label
                  >
                  <input
                    v-model="form.ninth_grade_coach"
                    :disabled="isParentRole"
                    type="text"
                    placeholder="Coach name"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <!-- 10th Grade -->
            <div class="pb-6 border-b border-gray-200">
              <h3 class="text-sm font-semibold text-gray-900 mb-3">
                10th Grade (Sophomore)
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Team</label
                  >
                  <input
                    v-model="form.tenth_grade_team"
                    :disabled="isParentRole"
                    type="text"
                    placeholder="e.g., Junior Varsity"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Head Coach</label
                  >
                  <input
                    v-model="form.tenth_grade_coach"
                    :disabled="isParentRole"
                    type="text"
                    placeholder="Coach name"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <!-- 11th Grade -->
            <div class="pb-6 border-b border-gray-200">
              <h3 class="text-sm font-semibold text-gray-900 mb-3">
                11th Grade (Junior)
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Team</label
                  >
                  <input
                    v-model="form.eleventh_grade_team"
                    :disabled="isParentRole"
                    type="text"
                    placeholder="e.g., Varsity"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Head Coach</label
                  >
                  <input
                    v-model="form.eleventh_grade_coach"
                    :disabled="isParentRole"
                    type="text"
                    placeholder="Coach name"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <!-- 12th Grade -->
            <div>
              <h3 class="text-sm font-semibold text-gray-900 mb-3">
                12th Grade (Senior)
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Team</label
                  >
                  <input
                    v-model="form.twelfth_grade_team"
                    :disabled="isParentRole"
                    type="text"
                    placeholder="e.g., Varsity"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Head Coach</label
                  >
                  <input
                    v-model="form.twelfth_grade_coach"
                    :disabled="isParentRole"
                    type="text"
                    placeholder="Coach name"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Travel Team -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">Travel Team</h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Year</label
              >
              <input
                v-model.number="form.travel_team_year"
                :disabled="isParentRole"
                type="number"
                :min="new Date().getFullYear()"
                :max="new Date().getFullYear() + 5"
                placeholder="e.g., 2024"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Team Name</label
              >
              <input
                v-model="form.travel_team_name"
                :disabled="isParentRole"
                type="text"
                placeholder="e.g., East Coast Sox"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Head Coach</label
              >
              <input
                v-model="form.travel_team_coach"
                :disabled="isParentRole"
                type="text"
                placeholder="Coach name"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div
          v-if="error"
          class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"
        >
          {{ error }}
        </div>

        <!-- Save Button -->
        <div class="flex justify-end gap-4">
          <NuxtLink
            to="/settings"
            class="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </NuxtLink>
          <button
            data-testid="save-player-details-button"
            type="submit"
            :disabled="saving || isParentRole"
            class="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {{
              isParentRole
                ? "Read-only view"
                : saving
                  ? recalculating
                    ? "Recalculating fit scores..."
                    : "Saving..."
                  : "Save Player Details"
            }}
          </button>
        </div>
      </form>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { ExclamationCircleIcon, ShareIcon, PhotoIcon, ArrowLeftIcon } from "@heroicons/vue/24/outline";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useToast } from "~/composables/useToast";
import { useFormValidation } from "~/composables/useFormValidation";
import { useFitScoreRecalculation } from "~/composables/useFitScoreRecalculation";
import { useUserStore } from "~/stores/user";
import { playerDetailsSchema } from "~/utils/validation/schemas";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import type { PlayerDetails } from "~/types/models";

definePageMeta({
  middleware: "auth",
});

const userStore = useUserStore();
const { isLoading, getPlayerDetails, setPlayerDetails } =
  usePreferenceManager();
const { showToast } = useToast();
const { recalculateAllFitScores, loading: recalculating } =
  useFitScoreRecalculation();
const { errors, fieldErrors, clearErrors, hasErrors } =
  useValidation(playerDetailsSchema);

const isParentRole = computed(() => userStore.user?.role === "parent");

const POSITIONS = [
  { value: "P", label: "P" },
  { value: "C", label: "C" },
  { value: "1B", label: "1B" },
  { value: "2B", label: "2B" },
  { value: "3B", label: "3B" },
  { value: "SS", label: "SS" },
  { value: "LF", label: "LF" },
  { value: "CF", label: "CF" },
  { value: "RF", label: "RF" },
  { value: "DH", label: "DH" },
  { value: "UTIL", label: "Utility" },
];

const BATS_OPTIONS = [
  { value: "R", label: "Right" },
  { value: "L", label: "Left" },
  { value: "S", label: "Switch" },
];

const THROWS_OPTIONS = [
  { value: "R", label: "Right" },
  { value: "L", label: "Left" },
];

const saving = ref(false);
const heightFeet = ref<number | undefined>(undefined);
const heightInches = ref<number | undefined>(undefined);

const form = ref<PlayerDetails>({
  graduation_year: undefined,
  high_school: "",
  club_team: "",
  positions: [],
  bats: undefined,
  throws: undefined,
  height_inches: undefined,
  weight_lbs: undefined,
  gpa: undefined,
  sat_score: undefined,
  act_score: undefined,
  ncaa_id: "",
  perfect_game_id: "",
  prep_baseball_id: "",
  // Social Media
  twitter_handle: "",
  instagram_handle: "",
  tiktok_handle: "",
  facebook_url: "",
  // Contact Info
  phone: "",
  email: "",
  allow_share_phone: false,
  allow_share_email: false,
  // School Info
  school_name: "",
  school_address: "",
  school_city: "",
  school_state: "",
  // High School Team Levels
  ninth_grade_team: "",
  ninth_grade_coach: "",
  tenth_grade_team: "",
  tenth_grade_coach: "",
  eleventh_grade_team: "",
  eleventh_grade_coach: "",
  twelfth_grade_team: "",
  twelfth_grade_coach: "",
  // Travel Team
  travel_team_year: undefined,
  travel_team_name: "",
  travel_team_coach: "",
});

const graduationYears = computed(() => {
  const currentYear = new Date().getFullYear();
  return [
    currentYear,
    currentYear + 1,
    currentYear + 2,
    currentYear + 3,
    currentYear + 4,
  ];
});

// Sync height fields
watch([heightFeet, heightInches], ([feet, inches]) => {
  if (feet !== undefined && inches !== undefined) {
    form.value.height_inches = feet * 12 + inches;
  } else {
    form.value.height_inches = undefined;
  }
});

// Initialize height from total inches
const initializeHeight = (totalInches: number | undefined) => {
  if (totalInches) {
    heightFeet.value = Math.floor(totalInches / 12);
    heightInches.value = totalInches % 12;
  }
};

const isPositionSelected = (pos: string) => {
  return form.value.positions?.includes(pos) || false;
};

const togglePosition = (pos: string) => {
  if (!form.value.positions) {
    form.value.positions = [];
  }
  const idx = form.value.positions.indexOf(pos);
  if (idx >= 0) {
    form.value.positions.splice(idx, 1);
  } else {
    form.value.positions.push(pos);
  }
};

const handleSave = async () => {
  saving.value = true;
  try {
    // Save player details
    await setPlayerDetails(form.value);

    // Trigger fit score recalculation (blocking)
    try {
      await recalculateAllFitScores();
      showToast(
        "Player details saved and fit scores updated successfully",
        "success"
      );
    } catch (recalcError) {
      console.error("Fit score recalculation failed:", recalcError);
      showToast(
        "Player details saved, but fit score update failed. Try refreshing.",
        "warning"
      );
    }
  } catch (err) {
    console.error("Failed to save player details:", err);
    showToast("Failed to save player details", "error");
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  const playerDetails = getPlayerDetails();
  if (playerDetails) {
    form.value = { ...form.value, ...playerDetails };
    initializeHeight(playerDetails.height_inches);
  }
});
</script>
