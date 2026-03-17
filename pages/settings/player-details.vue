<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
    :class="{'pb-32 sm:pb-20': true}"
  >
    <!-- Sticky Status Header (Offsets global header which is top-0) -->
    <div class="sticky top-16 z-30 bg-white/90 backdrop-blur-lg border-b border-slate-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/settings"
            class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"
            title="Back to Settings"
          >
            <ArrowLeftIcon class="w-5 h-5" />
          </NuxtLink>
          <div class="flex items-center gap-2">
            <h1 class="text-sm font-bold text-slate-900 hidden sm:block">Player Details</h1>
            <div v-if="saving || isSaving" class="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-blue-600 font-bold">
              <div class="w-2.5 h-2.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Saving
            </div>
            <div v-else class="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-600 font-bold">
              <CheckCircleIcon class="w-3 h-3" />
              Saved
            </div>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <SettingsProfileEditHistory />
        </div>
      </div>
    </div>

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <!-- Profile Completeness Hero -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
        <ProfileCompleteness :percentage="profileCompleteness" />
      </div>

      <!-- Desktop Tab Navigation (Hidden on Mobile) -->
      <nav class="hidden sm:flex p-1 bg-slate-200/50 rounded-xl mb-8 gap-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="currentTab = tab.id"
          :class="[
            'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all',
            currentTab === tab.id
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          ]"
        >
          <component :is="tab.icon" class="w-4 h-4" />
          <span>{{ tab.name }}</span>
        </button>
      </nav>

      <!-- Mobile Tab Bar (Sticky Bottom, iOS Style) -->
      <nav class="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
        <div class="flex justify-around items-center h-16">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="currentTab = tab.id"
            class="flex flex-col items-center justify-center flex-1 gap-1"
            :class="currentTab === tab.id ? 'text-blue-600' : 'text-slate-400'"
          >
            <component :is="tab.icon" class="w-6 h-6" :class="currentTab === tab.id ? 'fill-blue-50' : ''" />
            <span class="text-[10px] font-bold uppercase tracking-tighter">{{ tab.name }}</span>
          </button>
        </div>
      </nav>

      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="bg-white rounded-xl border border-slate-200 shadow-xs p-12 text-center"
      >
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-slate-600 font-medium">Loading your profile...</p>
      </div>

      <!-- Error summary -->
      <FormErrorSummary
        v-if="hasErrors && !isLoading"
        :errors="errors"
        @dismiss="clearErrors"
      />

      <!-- Read-only Warning Banner -->
      <div
        v-if="isParentRole && !isLoading"
        class="mb-8 rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3 shadow-sm"
      >
        <ExclamationCircleIcon class="h-5 w-5 text-amber-500 shrink-0" />
        <div>
          <h3 class="text-sm font-bold text-amber-900">Read-only view</h3>
          <p class="text-xs text-amber-700 mt-0.5 font-medium leading-relaxed">
            You\'re viewing this profile as a parent. Your athlete is the primary owner of this data.
          </p>
        </div>
      </div>

      <div v-if="!isLoading" class="space-y-6">
        <!-- TAB: BASICS -->
        <div v-show="currentTab === 'basics'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 class="text-base font-bold text-slate-900">Essential Info</h2>
              <p class="text-xs text-slate-500 font-medium">The core details recruiters see first.</p>
            </div>
            
            <div class="p-6 space-y-8">
              <!-- Profile Photo -->
              <div class="flex flex-col sm:flex-row gap-8 items-center sm:items-start">
                <SettingsProfilePhotoUpload />
                <div class="flex-1 space-y-5 w-full">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                        Graduation Year <span class="text-red-500">*</span>
                      </label>
                      <select
                        v-model="form.graduation_year"
                        :disabled="isParentRole"
                        @change="triggerSave"
                        class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50 appearance-none font-medium text-slate-700"
                      >
                        <option :value="undefined">Select Year</option>
                        <option v-for="year in graduationYears" :key="year" :value="year">{{ year }}</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Primary Sport</label>
                      <select
                        v-model="form.primary_sport"
                        :disabled="isParentRole"
                        @change="triggerSave"
                        class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50 appearance-none font-medium text-slate-700"
                      >
                        <option :value="undefined">Select Sport</option>
                        <option v-for="sport in commonSports" :key="sport" :value="sport">{{ sport }}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <!-- School Info -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-100">
                <div class="md:col-span-2">
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">High School Name</label>
                  <HighSchoolSearchInput
                    :model-value="{ name: form.school_name, nces_school_id: form.nces_school_id || null }"
                    :state-hint="form.school_state || ''"
                    :disabled="isParentRole"
                    @update:model-value="(v) => {
                      form.school_name = v.name;
                      form.high_school = v.name;
                      form.nces_school_id = v.nces_school_id ?? '';
                      triggerSave();
                    }"
                  />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">School City</label>
                  <input
                    v-model="form.school_city"
                    :disabled="isParentRole"
                    type="text"
                    placeholder="Atlanta"
                    @blur="triggerSave"
                    class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">School State</label>
                  <input
                    v-model="form.school_state"
                    :disabled="isParentRole"
                    type="text"
                    placeholder="GA"
                    maxlength="2"
                    @blur="triggerSave"
                    class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 uppercase transition font-medium text-slate-700"
                  />
                </div>
              </div>

              <!-- College Preferences -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-100">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Campus Size Preference
                  </label>
                  <div class="flex p-1 bg-slate-100 rounded-xl">
                    <button
                      v-for="opt in CAMPUS_SIZE_OPTIONS"
                      :key="opt.value"
                      type="button"
                      :disabled="isParentRole"
                      @click="form.campus_size_preference = opt.value; triggerSave()"
                      :class="[
                        'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
                        form.campus_size_preference === opt.value
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      ]"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                  <p class="text-xs text-slate-400 mt-1.5 ml-1">Used for personal fit analysis</p>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Cost Sensitivity
                  </label>
                  <div class="flex p-1 bg-slate-100 rounded-xl">
                    <button
                      v-for="opt in COST_SENSITIVITY_OPTIONS"
                      :key="opt.value"
                      type="button"
                      :disabled="isParentRole"
                      @click="form.cost_sensitivity = opt.value; triggerSave()"
                      :class="[
                        'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
                        form.cost_sensitivity === opt.value
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      ]"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                  <p class="text-xs text-slate-400 mt-1.5 ml-1">Used for personal fit analysis</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB: ATHLETICS -->
        <div v-show="currentTab === 'athletics'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <!-- Physical Stats -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 class="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
              <BoltIcon class="w-5 h-5 text-blue-600" />
              Physical Profile
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <!-- Height/Weight Row -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Height</label>
                  <div class="flex gap-2">
                    <select v-model="heightFeet" :disabled="isParentRole" @change="triggerSave" class="flex-1 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-700">
                      <option v-for="ft in [4, 5, 6, 7]" :key="ft" :value="ft">{{ ft }}'</option>
                    </select>
                    <select v-model="heightInches" :disabled="isParentRole" @change="triggerSave" class="flex-1 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-700">
                      <option v-for="i in 12" :key="i - 1" :value="i - 1">{{ i - 1 }}"</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Weight (lbs)</label>
                  <input
                    v-model.number="form.weight_lbs"
                    :disabled="isParentRole"
                    type="number"
                    @blur="triggerSave"
                    placeholder="185"
                    class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition font-medium text-slate-700"
                  />
                </div>
              </div>

              <!-- Bats/Throws (Sport Specific) -->
              <div v-if="isBaseballOrSoftball" class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Bats</label>
                  <div class="flex p-1 bg-slate-100 rounded-xl">
                    <button 
                      v-for="opt in BATS_OPTIONS" 
                      :key="opt.value"
                      type="button"
                      @click="form.bats = opt.value; triggerSave()"
                      :class="[
                        'flex-1 py-1.5 text-xs font-bold rounded-lg transition-all',
                        form.bats === opt.value ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      ]"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Throws</label>
                  <div class="flex p-1 bg-slate-100 rounded-xl">
                    <button 
                      v-for="opt in THROWS_OPTIONS" 
                      :key="opt.value"
                      type="button"
                      @click="form.throws = opt.value; triggerSave()"
                      :class="[
                        'flex-1 py-1.5 text-xs font-bold rounded-lg transition-all',
                        form.throws === opt.value ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      ]"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Positions -->
            <div class="mt-8 pt-8 border-t border-slate-100">
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">Positions You Play</label>
              <div v-if="availablePositions.length > 0" class="flex flex-wrap gap-2">
                <button
                  v-for="pos in availablePositions"
                  :key="pos"
                  type="button"
                  :disabled="isParentRole"
                  @click="togglePosition(pos); triggerSave()"
                  :class="[
                    'px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-2',
                    isPositionSelected(pos)
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105 z-10'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  ]"
                >
                  {{ pos }}
                </button>
              </div>
              <p v-else class="text-sm text-slate-400 italic">Select a sport on the Basics tab to see positions.</p>
            </div>
          </div>

          <!-- External IDs -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 class="text-base font-bold text-slate-900 mb-6">Recruiting Database IDs</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">NCAA ID</label>
                <input v-model="form.ncaa_id" @blur="triggerSave" placeholder="ID Number" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
              <template v-if="isBaseballOrSoftball">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Perfect Game ID</label>
                  <input v-model="form.perfect_game_id" @blur="triggerSave" placeholder="ID Number" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Prep Baseball ID</label>
                  <input v-model="form.prep_baseball_id" @blur="triggerSave" placeholder="ID Number" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
                </div>
              </template>
            </div>
          </div>

          <!-- Video Links -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 class="text-base font-bold text-slate-900">Video Links</h2>
              <p class="text-xs text-slate-500 font-medium">Hudl, YouTube, or Vimeo highlight reels for recruiters.</p>
            </div>
            <div class="p-6 space-y-4">
              <div
                v-for="(link, idx) in form.video_links"
                :key="idx"
                class="flex items-center gap-3"
              >
                <select
                  :value="(form.video_links ?? [])[idx].platform"
                  :disabled="isParentRole"
                  @change="(e) => { form.video_links = (form.video_links ?? []).map((l, i) => i === idx ? { ...l, platform: (e.target as HTMLSelectElement).value as 'hudl' | 'youtube' | 'vimeo' } : l); triggerSave(); }"
                  class="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
                >
                  <option value="hudl">Hudl</option>
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                </select>
                <input
                  :value="(form.video_links ?? [])[idx].url"
                  :disabled="isParentRole"
                  type="url"
                  placeholder="https://..."
                  @blur="(e) => { form.video_links = (form.video_links ?? []).map((l, i) => i === idx ? { ...l, url: (e.target as HTMLInputElement).value } : l); triggerSave(); }"
                  class="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
                />
                <input
                  :value="(form.video_links ?? [])[idx].title"
                  :disabled="isParentRole"
                  type="text"
                  placeholder="Title (optional)"
                  @blur="(e) => { form.video_links = (form.video_links ?? []).map((l, i) => i === idx ? { ...l, title: (e.target as HTMLInputElement).value } : l); triggerSave(); }"
                  class="w-32 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
                />
                <button
                  v-if="!isParentRole"
                  @click="removeVideoLink(idx)"
                  type="button"
                  class="p-2 text-slate-400 hover:text-red-500 transition rounded-lg hover:bg-red-50"
                  title="Remove"
                >
                  <XMarkIcon class="w-4 h-4" />
                </button>
              </div>

              <button
                v-if="!isParentRole && (form.video_links ?? []).length < 5"
                @click="addVideoLink"
                type="button"
                class="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 py-2"
              >
                <PlusIcon class="w-4 h-4" />
                Add Video Link
              </button>
              <p v-if="(form.video_links ?? []).length >= 5" class="text-xs text-slate-500">Maximum 5 video links.</p>
            </div>
          </div>
        </div>

        <!-- TAB: ACADEMICS & SOCIAL -->
        <div v-show="currentTab === 'academics'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <!-- Academics -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 class="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
              <AcademicCapIcon class="w-5 h-5 text-blue-600" />
              Academic Standing
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">GPA</label>
                <input v-model.number="form.gpa" type="number" step="0.01" @blur="triggerSave" placeholder="e.g. 3.85" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">SAT Score</label>
                <input v-model.number="form.sat_score" type="number" @blur="triggerSave" placeholder="1200" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ACT Score</label>
                <input v-model.number="form.act_score" type="number" @blur="triggerSave" placeholder="28" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
            </div>
          </div>

          <!-- Core Courses -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 class="text-base font-bold text-slate-900">Core Courses</h2>
              <p class="text-xs text-slate-500 font-medium">AP, honors, or notable courses for your recruiting profile.</p>
            </div>
            <div class="p-6 space-y-4">
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="(course, idx) in form.core_courses"
                  :key="idx"
                  class="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium px-3 py-1.5 rounded-full"
                >
                  {{ course }}
                  <button
                    v-if="!isParentRole"
                    @click="removeCourse(idx)"
                    type="button"
                    class="text-blue-400 hover:text-blue-600 transition"
                    :aria-label="`Remove ${course}`"
                  >
                    <XMarkIcon class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div v-if="!isParentRole && (form.core_courses?.length ?? 0) < 20" class="flex gap-2">
                <input
                  v-model="newCourseInput"
                  type="text"
                  placeholder="e.g., AP Chemistry"
                  @keydown.enter.prevent="addCourse"
                  class="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition"
                  maxlength="60"
                />
                <button
                  @click="addCourse"
                  type="button"
                  :disabled="!newCourseInput.trim()"
                  class="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              <p v-if="(form.core_courses?.length ?? 0) >= 20" class="text-xs text-slate-500">Maximum 20 courses added.</p>
            </div>
          </div>

          <!-- Social Media -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 class="text-base font-bold text-slate-900 mb-6">Social Handles</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div v-for="social in socialInputs" :key="social.key" class="relative">
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{{ social.label }}</label>
                <div class="flex items-center">
                  <span v-if="social.prefix" class="absolute left-4 text-slate-400 font-bold">{{ social.prefix }}</span>
                  <input
                    v-model="form[social.key]"
                    type="text"
                    @blur="(e) => handleSocialBlur(String(social.key), (e.target as HTMLInputElement).value)"
                    :placeholder="social.placeholder"
                    :class="[
                      'w-full py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition font-medium text-slate-700',
                      social.prefix ? 'pl-9 pr-4' : 'px-4'
                    ]"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Contact -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 class="text-base font-bold text-slate-900 mb-6">Contact & Privacy</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                <input v-model="form.phone" type="tel" @blur="triggerSave" placeholder="(555) 000-0000" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Public Email</label>
                <input v-model="form.email" type="email" @blur="triggerSave" placeholder="athlete@example.com" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
            </div>
            
            <div class="bg-slate-50 rounded-2xl p-4 space-y-4">
              <label class="flex items-center gap-3 cursor-pointer group">
                <div class="relative flex items-center">
                  <input v-model="form.allow_share_phone" type="checkbox" @change="triggerSave" class="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white checked:bg-blue-600 checked:border-blue-600 transition-all shadow-sm" />
                  <CheckIcon class="absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100 left-1 top-1 pointer-events-none stroke-[3]" />
                </div>
                <span class="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition">Show phone number to verified coaches</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer group">
                <div class="relative flex items-center">
                  <input v-model="form.allow_share_email" type="checkbox" @change="triggerSave" class="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white checked:bg-blue-600 checked:border-blue-600 transition-all shadow-sm" />
                  <CheckIcon class="absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100 left-1 top-1 pointer-events-none stroke-[3]" />
                </div>
                <span class="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition">Show email to verified coaches</span>
              </label>
            </div>
          </div>
        </div>

        <!-- TAB: PUBLIC PROFILE -->
        <div v-show="currentTab === 'public-profile'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProfileSetup />
            <ProfilePreview
              v-if="playerProfile"
              :settings="playerProfile"
              :player-name="userStore.user?.full_name ?? 'Athlete'"
              :details="(form as unknown as Record<string, unknown>)"
              :schools="[]"
            />
          </div>
        </div>

        <!-- TAB: HISTORY -->
        <div v-show="currentTab === 'history'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 class="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ClockIcon class="w-5 h-5 text-blue-600" />
              High School Career
            </h2>
            <div class="space-y-6">
              <div v-for="grade in gradeLevels" :key="grade.key" class="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">{{ grade.label }}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Team Level</label>
                    <input v-model="form[grade.teamKey]" @blur="triggerSave" placeholder="e.g. Varsity" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium shadow-xs" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Head Coach</label>
                    <input v-model="form[grade.coachKey]" @blur="triggerSave" placeholder="Coach Name" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium shadow-xs" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 class="text-base font-bold text-slate-900 mb-6">Latest Travel Team</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Season Year</label>
                <input v-model.number="form.travel_team_year" type="number" @blur="triggerSave" placeholder="2024" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Organization</label>
                <input v-model="form.travel_team_name" @blur="triggerSave" placeholder="Team Name" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Head Coach</label>
                <input v-model="form.travel_team_coach" @blur="triggerSave" placeholder="Coach Name" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import {
  ExclamationCircleIcon,
  ArrowLeftIcon,
  IdentificationIcon,
  BoltIcon,
  AcademicCapIcon,
  ClockIcon,
  CheckCircleIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  ShareIcon,
} from "@heroicons/vue/24/outline";
import { usePlayerProfile } from "~/composables/usePlayerProfile";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useAppToast } from "~/composables/useAppToast";
import { useFormValidation } from "~/composables/useFormValidation";
import { useSportsPositionLookup } from "~/composables/useSportsPositionLookup";
import { useAutoSave } from "~/composables/useAutoSave";
import { useUserStore } from "~/stores/user";
import { normalizePositions } from "~/utils/positions";
import { normalizeHandle, type SocialPlatform } from "~/utils/social";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import ProfileCompleteness from "~/components/ProfileCompleteness.vue";
import { calculateProfileCompleteness } from "~/utils/profileCompletenessCalculation";
import type { PlayerDetails, VideoLink } from "~/types/models";

definePageMeta({
  middleware: "auth",
});

const userStore = useUserStore();
const { isLoading, getPlayerDetails, setPlayerDetails, loadAllPreferences } =
  usePreferenceManager();
const { showToast } = useAppToast();
const { errors, clearErrors, hasErrors } = useFormValidation();

const isParentRole = computed(() => userStore.user?.role === "parent");

const currentTab = ref("basics");
const tabs = [
  { id: "basics", name: "Basics", icon: IdentificationIcon },
  { id: "athletics", name: "Athletics", icon: BoltIcon },
  { id: "academics", name: "Academics & Social", icon: AcademicCapIcon },
  { id: "history", name: "History", icon: ClockIcon },
  { id: "public-profile", name: "Public Profile", icon: ShareIcon },
];

const { profile: playerProfile } = usePlayerProfile();

const BATS_OPTIONS = [
  { value: "R", label: "Right" },
  { value: "L", label: "Left" },
  { value: "S", label: "Switch" },
] as const;

const THROWS_OPTIONS = [
  { value: "R", label: "Right" },
  { value: "L", label: "Left" },
] as const;

const CAMPUS_SIZE_OPTIONS = [
  { value: "small" as const, label: "Small" },
  { value: "medium" as const, label: "Medium" },
  { value: "large" as const, label: "Large" },
];

const COST_SENSITIVITY_OPTIONS = [
  { value: "high" as const, label: "High" },
  { value: "medium" as const, label: "Medium" },
  { value: "low" as const, label: "Low" },
];

const saving = ref(false);
const heightFeet = ref<number | undefined>(undefined);
const heightInches = ref<number | undefined>(undefined);

const form = ref<PlayerDetails>({
  graduation_year: undefined,
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
  twitter_handle: "",
  instagram_handle: "",
  tiktok_handle: "",
  facebook_url: "",
  phone: "",
  email: "",
  allow_share_phone: false,
  allow_share_email: false,
  school_name: "",
  nces_school_id: "",
  school_address: "",
  school_city: "",
  school_state: "",
  campus_size_preference: undefined,
  cost_sensitivity: undefined,
  ninth_grade_team: "",
  ninth_grade_coach: "",
  tenth_grade_team: "",
  tenth_grade_coach: "",
  eleventh_grade_team: "",
  eleventh_grade_coach: "",
  twelfth_grade_team: "",
  twelfth_grade_coach: "",
  travel_team_year: undefined,
  travel_team_name: "",
  travel_team_coach: "",
  video_links: [] as VideoLink[],
  core_courses: [] as string[],
});

const { commonSports, getPositionsBySport } = useSportsPositionLookup();
const availablePositions = ref<string[]>([]);

const isBaseballOrSoftball = computed(() => {
  return form.value.primary_sport === "Baseball" || form.value.primary_sport === "Softball";
});

const profileCompleteness = computed(() => calculateProfileCompleteness(form.value));

const { isSaving, triggerSave } = useAutoSave({
  debounceMs: 1000,
  onSave: async () => {
    try {
      const detailsToSave = {
        ...form.value,
        positions: normalizePositions(form.value.positions),
      };
      await setPlayerDetails(detailsToSave);
    } catch (err) {
      console.error("Auto-save failed:", err);
    }
  },
});

watch(
  () => form.value.primary_sport,
  (sport) => {
    if (sport) {
      availablePositions.value = getPositionsBySport(sport);
      if (!availablePositions.value.includes(form.value.primary_position || "")) {
        form.value.primary_position = undefined;
      }
    } else {
      availablePositions.value = [];
    }
  },
);

const graduationYears = computed(() => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => currentYear + i);
});

watch([heightFeet, heightInches], ([feet, inches]) => {
  if (feet !== undefined) {
    form.value.height_inches = feet * 12 + (inches || 0);
  }
});

const initializeHeight = (totalInches: number | undefined) => {
  if (totalInches) {
    heightFeet.value = Math.floor(totalInches / 12);
    heightInches.value = totalInches % 12;
  }
};

const isPositionSelected = (pos: string) => form.value.positions?.includes(pos) || false;

const togglePosition = (pos: string) => {
  if (!form.value.positions) form.value.positions = [];
  const idx = form.value.positions.indexOf(pos);
  if (idx >= 0) form.value.positions.splice(idx, 1);
  else form.value.positions.push(pos);
};

const addVideoLink = () => {
  form.value.video_links = [...(form.value.video_links ?? []), { platform: "hudl", url: "", title: "" }];
};

const removeVideoLink = (idx: number) => {
  form.value.video_links = (form.value.video_links ?? []).filter((_, i) => i !== idx);
  triggerSave();
};

const newCourseInput = ref("");

const addCourse = () => {
  const trimmed = newCourseInput.value.trim();
  if (!trimmed || form.value.core_courses?.includes(trimmed)) return;
  form.value.core_courses = [...(form.value.core_courses ?? []), trimmed];
  newCourseInput.value = "";
  triggerSave();
};

const removeCourse = (idx: number) => {
  form.value.core_courses = (form.value.core_courses ?? []).filter((_, i) => i !== idx);
  triggerSave();
};

const SOCIAL_PLATFORMS: Record<string, SocialPlatform | null> = {
  twitter_handle: "twitter",
  instagram_handle: "instagram",
  tiktok_handle: "tiktok",
  facebook_url: null,
};

function handleSocialBlur(key: string, value: string) {
  const platform = SOCIAL_PLATFORMS[key];
  if (!platform) return;

  const { handle, isShortUrl } = normalizeHandle(value, platform);
  (form.value as Record<string, unknown>)[key] = handle;

  if (isShortUrl) {
    showToast("Short links can't be used as handles — enter your username directly.", "warning");
  }

  triggerSave();
}

const socialInputs: { key: keyof PlayerDetails; label: string; prefix?: string; placeholder: string }[] = [
  { key: "twitter_handle", label: "Twitter / X", prefix: "@", placeholder: "username" },
  { key: "instagram_handle", label: "Instagram", prefix: "@", placeholder: "username" },
  { key: "tiktok_handle", label: "TikTok", prefix: "@", placeholder: "username" },
  { key: "facebook_url", label: "Facebook URL", placeholder: "https://facebook.com/..." },
];

const gradeLevels = [
  { key: "9", label: "9th Grade (Freshman)", teamKey: "ninth_grade_team", coachKey: "ninth_grade_coach" },
  { key: "10", label: "10th Grade (Sophomore)", teamKey: "tenth_grade_team", coachKey: "tenth_grade_coach" },
  { key: "11", label: "11th Grade (Junior)", teamKey: "eleventh_grade_team", coachKey: "eleventh_grade_coach" },
  { key: "12", label: "12th Grade (Senior)", teamKey: "twelfth_grade_team", coachKey: "twelfth_grade_coach" },
] as const;

onMounted(async () => {
  await loadAllPreferences();
  const playerDetails = getPlayerDetails();
  if (playerDetails) {
    if (playerDetails.high_school && !playerDetails.school_name) {
      playerDetails.school_name = playerDetails.high_school;
    }
    form.value = { ...form.value, ...playerDetails, positions: normalizePositions(playerDetails.positions) };
    form.value.video_links = playerDetails.video_links ?? [];
    form.value.core_courses = playerDetails.core_courses ?? [];
    initializeHeight(playerDetails.height_inches);
    if (form.value.primary_sport) {
      availablePositions.value = getPositionsBySport(form.value.primary_sport);
    }
  }
});

</script>

<style scoped>
.animate-in {
  animation: animate-in 0.3s ease-out;
}
@keyframes animate-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>


