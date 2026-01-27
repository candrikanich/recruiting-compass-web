<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink
          to="/schools"
          class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back to Schools
        </NuxtLink>
      </div>
    </div>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Loading State -->
      <div
        v-if="loading"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
        ></div>
        <p class="text-slate-600">Loading school...</p>
      </div>

      <!-- School Detail -->
      <div v-else-if="school" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content - Left Column -->
        <div class="lg:col-span-2 space-y-6">
          <!-- School Header Card -->
          <div
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <div class="flex items-start gap-4">
              <SchoolLogo :school="school" size="lg" fetch-on-mount />
              <div class="flex-1 min-w-0">
                <h1 class="text-2xl font-bold text-slate-900 mb-1">
                  {{ school.name }}
                </h1>
                <div class="flex items-center gap-2 text-slate-600 mb-3">
                  <MapPinIcon class="w-4 h-4" />
                  {{ school.location }}
                </div>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-if="school.division"
                    class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700"
                  >
                    {{ school.division }}
                  </span>
                  <select
                    v-model="school.status"
                    @change="updateStatus"
                    :disabled="statusUpdating"
                    class="px-2 py-1 text-xs font-medium rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500"
                    :class="[
                      statusBadgeColor(school.status),
                      statusUpdating ? 'opacity-50' : '',
                    ]"
                  >
                    <option value="researching">Researching</option>
                    <option value="contacted">Contacted</option>
                    <option value="interested">Interested</option>
                    <option value="offer_received">Offer Received</option>
                    <option value="committed">Committed</option>
                  </select>
                  <div class="py-1">
                    <SchoolPrioritySelector
                      :model-value="school.priority_tier"
                      @update:model-value="updatePriorityTier"
                      :data-testid="`priority-selector-${id}`"
                    />
                  </div>
                  <span
                    v-if="calculatedSize"
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    :class="getSizeColorClass(calculatedSize)"
                  >
                    {{ calculatedSize }}
                  </span>
                  <span
                    v-if="school.conference"
                    class="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700"
                  >
                    {{ school.conference }}
                  </span>
                </div>
              </div>
              <button
                @click="toggleFavorite"
                class="flex-shrink-0 transition-all"
                :class="
                  school.is_favorite
                    ? 'text-yellow-500'
                    : 'text-slate-300 hover:text-yellow-400'
                "
              >
                <StarIcon
                  class="w-6 h-6"
                  :class="school.is_favorite ? 'fill-yellow-500' : ''"
                />
              </button>
            </div>
          </div>

          <!-- Status History Card (Story 3.4) -->
          <SchoolStatusHistory :school-id="id" />

          <!-- Fit Score Card -->
          <div
            v-if="fitScore"
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <h2 class="text-lg font-semibold text-slate-900 mb-4">
              School Fit Analysis
            </h2>
            <FitScoreDisplay :fit-score="fitScore" :show-breakdown="true" />
          </div>

          <!-- Division Recommendations Card -->
          <div
            v-if="divisionRecommendation?.shouldConsiderOtherDivisions"
            class="bg-blue-50 rounded-xl border border-blue-200 shadow-sm p-6"
          >
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 mt-0.5">
                <svg
                  class="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-blue-900 mb-2">
                  Consider Other Divisions
                </h3>
                <p class="text-blue-800 mb-3">
                  {{ divisionRecommendation.message }}
                </p>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="division in divisionRecommendation.recommendedDivisions"
                    :key="division"
                    class="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded-full"
                  >
                    {{ division }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Information Card -->
          <div
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-slate-900">Information</h2>
              <div class="flex gap-2">
                <button
                  v-if="!editingBasicInfo"
                  @click="lookupCollegeData"
                  :disabled="collegeDataLoading"
                  class="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-1 disabled:opacity-50"
                >
                  <MapPinIcon class="w-4 h-4" />
                  {{ collegeDataLoading ? "Looking up..." : "Lookup" }}
                </button>
                <button
                  @click="editingBasicInfo = !editingBasicInfo"
                  class="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition"
                >
                  {{ editingBasicInfo ? "Cancel" : "Edit" }}
                </button>
              </div>
            </div>

            <div
              v-if="collegeDataError"
              class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm"
            >
              {{ collegeDataError }}
            </div>

            <!-- Map -->
            <div class="mb-4">
              <SchoolMap
                :latitude="
                  school?.academic_info?.latitude as number | null | undefined
                "
                :longitude="
                  school?.academic_info?.longitude as number | null | undefined
                "
                :school-name="school?.name"
              />
            </div>

            <!-- Distance from Home -->
            <div
              v-if="calculatedDistanceFromHome"
              class="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200"
            >
              Distance from Home:
              <strong>{{ calculatedDistanceFromHome }}</strong>
            </div>

            <!-- Edit Form -->
            <div v-if="editingBasicInfo" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Campus Address</label
                  >
                  <input
                    v-model="editedBasicInfo.address"
                    type="text"
                    placeholder="Main campus address..."
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Baseball Facility</label
                  >
                  <input
                    v-model="editedBasicInfo.baseball_facility_address"
                    type="text"
                    placeholder="Stadium address..."
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Mascot</label
                  >
                  <input
                    v-model="editedBasicInfo.mascot"
                    type="text"
                    placeholder="School mascot..."
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Undergraduate Size</label
                  >
                  <input
                    v-model="editedBasicInfo.undergrad_size"
                    type="text"
                    placeholder="e.g., 5,000-8,000..."
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Website</label
                  >
                  <input
                    v-model="editedBasicInfo.website"
                    type="url"
                    placeholder="https://..."
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Twitter Handle</label
                  >
                  <input
                    v-model="editedBasicInfo.twitter_handle"
                    type="text"
                    placeholder="@handle..."
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                @click="saveBasicInfo"
                :disabled="loading"
                class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {{ loading ? "Saving..." : "Save Information" }}
              </button>
            </div>

            <!-- Display Info -->
            <div v-else class="space-y-4">
              <!-- School Information -->
              <div
                v-if="
                  school.academic_info?.address ||
                  school.academic_info?.baseball_facility_address ||
                  school.academic_info?.mascot ||
                  school.academic_info?.undergrad_size
                "
                class="space-y-3"
              >
                <h4 class="font-medium text-slate-900">School Information</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    v-if="school.academic_info?.address"
                    class="p-3 bg-slate-50 rounded-lg"
                  >
                    <p
                      class="text-xs text-slate-600 mb-1 flex items-center gap-1"
                    >
                      <MapPinIcon class="w-3.5 h-3.5" />
                      Campus Address
                    </p>
                    <p class="text-sm font-medium text-slate-900">
                      {{ school.academic_info.address }}
                    </p>
                  </div>
                  <div
                    v-if="school.academic_info?.baseball_facility_address"
                    class="p-3 bg-slate-50 rounded-lg"
                  >
                    <p class="text-xs text-slate-600 mb-1">Baseball Facility</p>
                    <p class="text-sm font-medium text-slate-900">
                      {{ school.academic_info.baseball_facility_address }}
                    </p>
                  </div>
                  <div
                    v-if="school.academic_info?.mascot"
                    class="p-3 bg-slate-50 rounded-lg"
                  >
                    <p class="text-xs text-slate-600 mb-1">Mascot</p>
                    <p class="text-sm font-medium text-slate-900">
                      {{ school.academic_info.mascot }}
                    </p>
                  </div>
                  <div
                    v-if="school.academic_info?.undergrad_size"
                    class="p-3 bg-slate-50 rounded-lg"
                  >
                    <p class="text-xs text-slate-600 mb-1">
                      Undergraduate Size
                    </p>
                    <p class="text-sm font-medium text-slate-900">
                      {{ school.academic_info.undergrad_size }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Contact & Social -->
              <div
                v-if="school.website || school.twitter_handle"
                class="space-y-3 pt-2 border-t border-slate-200"
              >
                <h4 class="font-medium text-slate-900">Contact & Social</h4>
                <div class="space-y-2">
                  <div v-if="school.website" class="flex items-start gap-2">
                    <span class="text-slate-500 text-sm w-24">Website:</span>
                    <a
                      :href="school.website"
                      target="_blank"
                      class="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                    >
                      {{ school.website }}
                      <ArrowTopRightOnSquareIcon class="w-3 h-3" />
                    </a>
                  </div>
                  <div
                    v-if="school.twitter_handle"
                    class="flex items-start gap-2"
                  >
                    <span class="text-slate-500 text-sm w-24">Twitter:</span>
                    <a
                      :href="`https://twitter.com/${school.twitter_handle.replace('@', '')}`"
                      target="_blank"
                      class="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                    >
                      {{ school.twitter_handle }}
                      <ArrowTopRightOnSquareIcon class="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              <!-- College Scorecard Data -->
              <div
                v-if="
                  getAcademicInfo('student_size') ||
                  getAcademicInfo('tuition_in_state') ||
                  getAcademicInfo('tuition_out_of_state') ||
                  getAcademicInfo('admission_rate')
                "
                class="pt-2 border-t border-slate-200"
              >
                <h4 class="font-medium text-slate-900 mb-3">
                  College Scorecard Data
                </h4>
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <div
                    v-if="getAcademicInfo('student_size')"
                    class="flex justify-between p-2 bg-slate-50 rounded"
                  >
                    <span class="text-slate-600">Students</span>
                    <span class="font-medium text-slate-900">{{
                      getAcademicInfo("student_size")?.toLocaleString()
                    }}</span>
                  </div>
                  <div
                    v-if="getAcademicInfo('tuition_in_state')"
                    class="flex justify-between p-2 bg-slate-50 rounded"
                  >
                    <span class="text-slate-600">Tuition (In-State)</span>
                    <span class="font-medium text-slate-900"
                      >${{
                        getAcademicInfo("tuition_in_state")?.toLocaleString()
                      }}</span
                    >
                  </div>
                  <div
                    v-if="getAcademicInfo('tuition_out_of_state')"
                    class="flex justify-between p-2 bg-slate-50 rounded"
                  >
                    <span class="text-slate-600">Tuition (Out-of-State)</span>
                    <span class="font-medium text-slate-900"
                      >${{
                        getAcademicInfo(
                          "tuition_out_of_state",
                        )?.toLocaleString()
                      }}</span
                    >
                  </div>
                  <div
                    v-if="getAcademicInfo('admission_rate')"
                    class="flex justify-between p-2 bg-slate-50 rounded"
                  >
                    <span class="text-slate-600">Admission Rate</span>
                    <span class="font-medium text-slate-900"
                      >{{
                        (getAcademicInfo("admission_rate") * 100).toFixed(0)
                      }}%</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes Card -->
          <div
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-slate-900">Notes</h2>
              <div class="flex items-center gap-2">
                <NotesHistory :school-id="id" />
                <button
                  @click="editingNotes = !editingNotes"
                  class="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition flex items-center gap-1"
                >
                  <PencilIcon class="w-4 h-4" />
                  {{ editingNotes ? "Cancel" : "Edit" }}
                </button>
              </div>
            </div>
            <div v-if="editingNotes" class="space-y-3">
              <textarea
                v-model="editedNotes"
                rows="4"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add notes about this school..."
              />
              <button
                @click="saveNotes"
                :disabled="loading"
                class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {{ loading ? "Saving..." : "Save Notes" }}
              </button>
            </div>
            <p v-else class="text-slate-700 text-sm whitespace-pre-wrap">
              {{ school.notes || "No notes added yet." }}
            </p>
          </div>

          <!-- Private Notes Card -->
          <div
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <DocumentTextIcon class="w-5 h-5 text-slate-400" />
                <h2 class="text-lg font-semibold text-slate-900">
                  My Private Notes
                </h2>
              </div>
              <button
                @click="editingPrivateNotes = !editingPrivateNotes"
                class="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition flex items-center gap-1"
              >
                <PencilIcon class="w-4 h-4" />
                {{ editingPrivateNotes ? "Cancel" : "Edit" }}
              </button>
            </div>
            <p class="text-xs text-slate-500 mb-3">
              Only you can see these notes
            </p>
            <div v-if="editingPrivateNotes" class="space-y-3">
              <textarea
                v-model="editedPrivateNotes"
                rows="4"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add your private thoughts..."
              />
              <button
                @click="savePrivateNotes"
                :disabled="loading"
                class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {{ loading ? "Saving..." : "Save Notes" }}
              </button>
            </div>
            <p v-else class="text-slate-700 text-sm whitespace-pre-wrap">
              {{ myPrivateNote || "No private notes added yet." }}
            </p>
          </div>

          <!-- Pros and Cons -->
          <div v-if="school" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Pros -->
            <div
              class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
            >
              <h3
                class="font-semibold text-slate-900 mb-4 flex items-center gap-2"
              >
                <div
                  class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center"
                >
                  <CheckIcon class="w-4 h-4 text-emerald-600" />
                </div>
                Pros
              </h3>
              <div class="space-y-2 mb-4">
                <div
                  v-for="(pro, index) in school.pros ?? []"
                  :key="`pro-${index}`"
                  class="flex items-center justify-between p-2 bg-emerald-50 rounded-lg text-emerald-700 text-sm"
                >
                  <span>{{ pro }}</span>
                  <button
                    @click="removePro(index)"
                    class="text-emerald-400 hover:text-red-500 transition"
                  >
                    <XMarkIcon class="w-4 h-4" />
                  </button>
                </div>
                <div
                  v-if="!(school.pros ?? []).length"
                  class="text-slate-400 text-sm"
                >
                  No pros added yet
                </div>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="newPro"
                  type="text"
                  placeholder="Add a pro..."
                  class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  @keyup.enter="addPro"
                />
                <button
                  @click="addPro"
                  :disabled="!newPro.trim()"
                  class="px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>

            <!-- Cons -->
            <div
              class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
            >
              <h3
                class="font-semibold text-slate-900 mb-4 flex items-center gap-2"
              >
                <div
                  class="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center"
                >
                  <XMarkIcon class="w-4 h-4 text-red-600" />
                </div>
                Cons
              </h3>
              <div class="space-y-2 mb-4">
                <div
                  v-for="(con, index) in school.cons ?? []"
                  :key="`con-${index}`"
                  class="flex items-center justify-between p-2 bg-red-50 rounded-lg text-red-700 text-sm"
                >
                  <span>{{ con }}</span>
                  <button
                    @click="removeCon(index)"
                    class="text-red-400 hover:text-red-600 transition"
                  >
                    <XMarkIcon class="w-4 h-4" />
                  </button>
                </div>
                <div
                  v-if="!(school.cons ?? []).length"
                  class="text-slate-400 text-sm"
                >
                  No cons added yet
                </div>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="newCon"
                  type="text"
                  placeholder="Add a con..."
                  class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  @keyup.enter="addCon"
                />
                <button
                  @click="addCon"
                  :disabled="!newCon.trim()"
                  class="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <!-- Coaching Philosophy Card -->
          <SchoolCoachingPhilosophy
            :school="school"
            :school-id="id"
            @update="updateCoachingPhilosophy"
          />

          <!-- Shared Documents -->
          <div
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <DocumentTextIcon class="w-5 h-5 text-slate-400" />
                <h2 class="text-lg font-semibold text-slate-900">
                  Shared Documents
                </h2>
              </div>
              <button
                @click="showUploadModal = true"
                class="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                + Upload
              </button>
            </div>
            <div v-if="schoolDocuments.length > 0" class="space-y-3">
              <div
                v-for="doc in schoolDocuments"
                :key="doc.id"
                class="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                <div>
                  <p class="font-medium text-slate-900 text-sm">
                    {{ doc.title }}
                  </p>
                  <p class="text-xs text-slate-500 capitalize">
                    {{ doc.type }}
                  </p>
                </div>
                <NuxtLink
                  :to="`/documents/${doc.id}`"
                  class="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  View
                </NuxtLink>
              </div>
            </div>
            <div v-else class="text-center py-8 text-slate-500 text-sm">
              No documents shared with this school yet
            </div>
          </div>

          <!-- Document Upload Modal -->
          <SchoolDocumentUploadModal
            v-if="showUploadModal"
            :school-id="id"
            @close="showUploadModal = false"
            @success="handleDocumentUploadSuccess"
          />

          <!-- Email Send Modal -->
          <EmailSendModal
            v-if="showEmailModal"
            :is-open="showEmailModal"
            :recipient-email="schoolCoaches.length > 0 ? schoolCoaches[0].email : ''"
            :recipient-name="school?.name || ''"
            @close="showEmailModal = false"
          />
        </div>

        <!-- Sidebar - Right Column -->
        <div class="space-y-6">
          <!-- Quick Actions -->
          <div
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <h3 class="font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div class="space-y-3">
              <NuxtLink
                :to="`/schools/${id}/interactions`"
                class="block w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition text-center flex items-center justify-center gap-2"
              >
                <ChatBubbleLeftRightIcon class="w-4 h-4" />
                Log Interaction
              </NuxtLink>
              <button
                @click="showEmailModal = true"
                class="block w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transition text-center flex items-center justify-center gap-2"
              >
                <EnvelopeIcon class="w-4 h-4" />
                Send Email
              </button>
              <NuxtLink
                :to="`/schools/${id}/coaches`"
                class="block w-full px-4 py-2.5 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition text-center flex items-center justify-center gap-2"
              >
                <UsersIcon class="w-4 h-4" />
                Manage Coaches
              </NuxtLink>
            </div>
          </div>

          <!-- Coaches -->
          <div
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <UserCircleIcon class="w-5 h-5 text-slate-400" />
                <h3 class="font-semibold text-slate-900">Coaches</h3>
              </div>
              <NuxtLink
                :to="`/schools/${id}/coaches`"
                class="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Manage &rarr;
              </NuxtLink>
            </div>
            <div v-if="schoolCoaches.length > 0" class="space-y-3">
              <div
                v-for="coach in schoolCoaches"
                :key="coach.id"
                class="p-3 border border-slate-200 rounded-lg"
              >
                <p class="font-medium text-slate-900 text-sm">
                  {{ coach.first_name }} {{ coach.last_name }}
                </p>
                <p class="text-xs text-slate-500 capitalize mb-2">
                  {{ getRoleLabel(coach.role) }}
                </p>
                <div class="flex flex-wrap gap-1">
                  <a
                    v-if="coach.email"
                    :href="`mailto:${coach.email}`"
                    class="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                    title="Email"
                  >
                    <EnvelopeIcon class="w-3.5 h-3.5" />
                  </a>
                  <a
                    v-if="coach.phone"
                    :href="`sms:${coach.phone}`"
                    class="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                    title="Text"
                  >
                    <ChatBubbleLeftIcon class="w-3.5 h-3.5" />
                  </a>
                  <a
                    v-if="coach.phone"
                    :href="`tel:${coach.phone}`"
                    class="p-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition"
                    title="Call"
                  >
                    <PhoneIcon class="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4 text-slate-500 text-sm">
              No coaches added yet
            </div>
          </div>

          <!-- Ranking -->
          <div
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <h3 class="font-semibold text-slate-900 mb-4">Ranking</h3>
            <div class="text-center py-4">
              <div class="w-16 h-1 bg-blue-500 mx-auto mb-2 rounded-full"></div>
              <p class="text-slate-600 text-sm">Current ranking</p>
            </div>
          </div>

          <!-- Attribution -->
          <div
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-5"
          >
            <h4 class="font-semibold text-slate-900 mb-3">Attribution</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-slate-600">Created by:</span>
                <span class="text-slate-900">Parent</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-600">Last updated:</span>
                <span class="text-slate-900">Parent</span>
              </div>
              <div v-if="school.updated_at" class="text-slate-500 text-xs">
                {{ new Date(school.updated_at).toLocaleDateString() }}
              </div>
            </div>
          </div>

          <!-- Delete School -->
          <button
            @click="confirmDelete"
            class="w-full px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
          >
            <TrashIcon class="w-4 h-4" />
            Delete School
          </button>
        </div>
      </div>

      <!-- Not Found -->
      <div
        v-else
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <p class="text-slate-600 mb-4">School not found</p>
        <NuxtLink
          to="/schools"
          class="text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to Schools
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { navigateTo } from "#app";
import { useSchools } from "~/composables/useSchools";
import { useSchoolLogos } from "~/composables/useSchoolLogos";
import { useCoaches } from "~/composables/useCoaches";
import { useDocumentsConsolidated } from "~/composables/useDocumentsConsolidated";
import { useFitScore } from "~/composables/useFitScore";
import { useDivisionRecommendations } from "~/composables/useDivisionRecommendations";
import type { Document, AcademicInfo } from "~/types/models";
import type { FitScoreResult, DivisionRecommendation } from "~/types/timeline";
import { useCollegeData } from "~/composables/useCollegeData";
import { useUserPreferences } from "~/composables/useUserPreferences";
import { useUserStore } from "~/stores/user";
import { getCarnegieSize, getSizeColorClass } from "~/utils/schoolSize";
import { calculateDistance, formatDistance } from "~/utils/distance";
import Header from "~/components/Header.vue";
import SchoolLogo from "~/components/School/SchoolLogo.vue";
import SchoolMap from "~/components/School/SchoolMap.vue";
import NotesHistory from "~/components/School/NotesHistory.vue";
import EmailSendModal from "~/components/EmailSendModal.vue";
import {
  ArrowLeftIcon,
  MapPinIcon,
  StarIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  UserCircleIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  PhoneIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/vue/24/outline";
import type { School } from "~/types/models";

definePageMeta({});

const route = useRoute();
const {
  getSchool,
  updateSchool,
  deleteSchool: deleteSchoolAPI,
  loading,
} = useSchools();
const { fetchSchoolLogo } = useSchoolLogos();
const { coaches: allCoaches, fetchCoaches } = useCoaches();
const { documents, fetchDocuments } = useDocumentsConsolidated();
const { calculateSchoolFitScore, getFitScore } = useFitScore();
const {
  fetchByName,
  loading: collegeDataLoading,
  error: collegeDataError,
} = useCollegeData();
const { homeLocation, fetchPreferences } = useUserPreferences();

const id = route.params.id as string;
const userStore = useUserStore();
const school = ref<School | null>(null);
const fitScore = ref<FitScoreResult | null>(null);
const divisionRecommendation = ref<DivisionRecommendation | null>(null);
const statusUpdating = ref(false);
const priorityTierUpdating = ref(false);
const schoolCoaches = computed(() => allCoaches.value);
const schoolDocuments = computed(() =>
  documents.value.filter((doc: Document) =>
    (doc.shared_with_schools as string[] | undefined)?.includes(id),
  ),
);
const calculatedSize = computed(() =>
  getCarnegieSize(
    school.value?.academic_info?.student_size as number | null | undefined,
  ),
);

const calculatedDistanceFromHome = computed(() => {
  const schoolLat = school.value?.academic_info?.latitude as
    | number
    | null
    | undefined;
  const schoolLng = school.value?.academic_info?.longitude as
    | number
    | null
    | undefined;
  const homeLat = homeLocation.value?.latitude;
  const homeLng = homeLocation.value?.longitude;
  if (schoolLat && schoolLng && homeLat && homeLng) {
    const distance = calculateDistance(
      { latitude: homeLat, longitude: homeLng },
      { latitude: schoolLat, longitude: schoolLng },
    );
    return formatDistance(distance);
  }
  return null;
});

const editingNotes = ref(false);
const editedNotes = ref("");
const editingPrivateNotes = ref(false);
const editedPrivateNotes = ref("");
const editingBasicInfo = ref(false);
const newPro = ref("");
const newCon = ref("");
const showUploadModal = ref(false);
const showEmailModal = ref(false);
const editedBasicInfo = ref({
  address: "",
  baseball_facility_address: "",
  mascot: "",
  undergrad_size: "",
  distance_from_home: null as number | null,
  website: "",
  twitter_handle: "",
  instagram_handle: "",
});

const statusBadgeColor = (status: string) => {
  const colors: Record<string, string> = {
    interested: "bg-blue-100 text-blue-700",
    contacted: "bg-slate-100 text-slate-700",
    camp_invite: "bg-purple-100 text-purple-700",
    recruited: "bg-green-100 text-green-700",
    official_visit_invited: "bg-amber-100 text-amber-700",
    official_visit_scheduled: "bg-orange-100 text-orange-700",
    offer_received: "bg-red-100 text-red-700",
    committed: "bg-green-800 text-white",
    not_pursuing: "bg-gray-300 text-gray-700",
  };
  return colors[status] || "bg-slate-100 text-slate-700";
};

const toggleFavorite = async () => {
  if (!school.value) return;
  const updated = await updateSchool(id, {
    is_favorite: !school.value.is_favorite,
  });
  if (updated) school.value = updated;
};

const updateStatus = async () => {
  if (!school.value) return;
  statusUpdating.value = true;
  try {
    const { updateStatus: updateSchoolStatus } = useSchools();
    const updated = await updateSchoolStatus(id, school.value.status);
    if (updated) school.value = updated;
  } catch (err) {
    console.error("Failed to update status:", err);
  } finally {
    statusUpdating.value = false;
  }
};

const updatePriorityTier = async (tier: "A" | "B" | "C" | null) => {
  if (!school.value) return;
  priorityTierUpdating.value = true;
  try {
    const updated = await updateSchool(id, { priority_tier: tier });
    if (updated) school.value = updated;
  } finally {
    priorityTierUpdating.value = false;
  }
};

const saveNotes = async () => {
  if (!school.value) return;
  const updated = await updateSchool(id, { notes: editedNotes.value });
  if (updated) {
    school.value = updated;
    editingNotes.value = false;
  }
};

const myPrivateNote = computed({
  get: () => {
    if (!school.value || !userStore.user) return "";
    return school.value.private_notes?.[userStore.user.id] || "";
  },
  set: (value: string) => {
    if (!school.value || !userStore.user) return;
    school.value.private_notes = {
      ...(school.value.private_notes || {}),
      [userStore.user.id]: value,
    };
  },
});

const savePrivateNotes = async () => {
  if (!school.value || !userStore.user) return;
  const updated = await updateSchool(id, {
    private_notes: {
      ...(school.value.private_notes || {}),
      [userStore.user.id]: editedPrivateNotes.value,
    },
  });
  if (updated) {
    school.value = updated;
    editingPrivateNotes.value = false;
  }
};

const removePro = async (index: number) => {
  if (!school.value) return;
  const newPros = (school.value.pros ?? []).filter((_, i) => i !== index);
  const updated = await updateSchool(id, { pros: newPros });
  if (updated) school.value = updated;
};

const removeCon = async (index: number) => {
  if (!school.value) return;
  const newCons = (school.value.cons ?? []).filter((_, i) => i !== index);
  const updated = await updateSchool(id, { cons: newCons });
  if (updated) school.value = updated;
};

const addPro = async () => {
  if (!school.value || !newPro.value.trim()) return;
  const updated = await updateSchool(id, {
    pros: [...(school.value.pros ?? []), newPro.value],
  });
  if (updated) {
    school.value = updated;
    newPro.value = "";
  }
};

const addCon = async () => {
  if (!school.value || !newCon.value.trim()) return;
  const updated = await updateSchool(id, {
    cons: [...(school.value.cons ?? []), newCon.value],
  });
  if (updated) {
    school.value = updated;
    newCon.value = "";
  }
};

const getAcademicInfo = (key: string): any =>
  school.value?.academic_info?.[key] ?? null;

const saveBasicInfo = async () => {
  if (!school.value) return;
  const updates = {
    website: editedBasicInfo.value.website || null,
    twitter_handle: editedBasicInfo.value.twitter_handle || null,
    instagram_handle: editedBasicInfo.value.instagram_handle || null,
    academic_info: {
      ...(school.value.academic_info || {}),
      address: editedBasicInfo.value.address,
      baseball_facility_address:
        editedBasicInfo.value.baseball_facility_address,
      mascot: editedBasicInfo.value.mascot,
      undergrad_size: editedBasicInfo.value.undergrad_size,
      distance_from_home: editedBasicInfo.value.distance_from_home,
    } as unknown as AcademicInfo,
  };
  const updated = await updateSchool(id, updates);
  if (updated) {
    school.value = updated;
    editingBasicInfo.value = false;
  }
};

const updateCoachingPhilosophy = async (data: Partial<School>) => {
  if (!school.value) return;
  const updated = await updateSchool(id, data);
  if (updated) {
    school.value = updated;
  }
};

const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    head: "Head Coach",
    assistant: "Assistant Coach",
    recruiting: "Recruiting Coordinator",
  };
  return labels[role] || role;
};

const confirmDelete = async () => {
  if (confirm("Are you sure you want to delete this school?")) {
    try {
      await deleteSchoolAPI(id);
      await navigateTo("/schools");
    } catch (err) {
      console.error("Failed to delete school:", err);
    }
  }
};

const handleDocumentUploadSuccess = async () => {
  // Refresh documents list after successful upload
  await fetchDocuments();
};

const loadFitScore = async () => {
  if (!school.value) return;
  try {
    const { getRecommendedDivisions } = useDivisionRecommendations();

    const cachedScore = getFitScore(id);
    if (cachedScore) {
      fitScore.value = cachedScore;
    } else {
      // Calculate fit score with minimal data (school only)
      // Full fit score calculation requires athlete data
      fitScore.value = await calculateSchoolFitScore(id, undefined, {
        campusSize: school.value.academic_info?.student_size,
        avgGpa: school.value.academic_info?.gpa_requirement,
        offeredMajors: [],
      });
    }

    // Compute division recommendations based on fit score
    if (fitScore.value) {
      divisionRecommendation.value = getRecommendedDivisions(
        school.value.division,
        fitScore.value.score,
      );
    }
  } catch (err) {
    console.error("Failed to load fit score:", err);
  }
};

const lookupCollegeData = async () => {
  if (!school.value) return;
  const result = await fetchByName(school.value.name);
  if (result) {
    const updates = {
      website: result.website || school.value.website,
      academic_info: {
        ...(school.value.academic_info || {}),
        address: result.address || school.value.academic_info?.address,
        student_size: String(result.studentSize || ""),
        carnegie_size: result.carnegieSize,
        enrollment_all: result.enrollmentAll,
        admission_rate: result.admissionRate,
        tuition_in_state: result.tuitionInState,
        tuition_out_of_state: result.tuitionOutOfState,
        latitude: result.latitude,
        longitude: result.longitude,
      } as unknown as AcademicInfo,
    };
    const updated = await updateSchool(id, updates);
    if (updated) {
      school.value = updated;
      editedBasicInfo.value.address = String(
        updated.academic_info?.address || "",
      );
      editedBasicInfo.value.website = String(updated.website || "");
    }
  }
};

onMounted(async () => {
  fetchPreferences();
  school.value = await getSchool(id);
  if (school.value) {
    editedNotes.value = school.value.notes || "";
    editedPrivateNotes.value = String(myPrivateNote.value || "");
    editedBasicInfo.value = {
      address: String(school.value.academic_info?.address || ""),
      baseball_facility_address: String(
        school.value.academic_info?.baseball_facility_address || "",
      ),
      mascot: String(school.value.academic_info?.mascot || ""),
      undergrad_size: String(school.value.academic_info?.undergrad_size || ""),
      distance_from_home:
        typeof school.value.academic_info?.distance_from_home === "number"
          ? school.value.academic_info.distance_from_home
          : null,
      website: String(school.value.website || ""),
      twitter_handle: String(school.value.twitter_handle || ""),
      instagram_handle: String(school.value.instagram_handle || ""),
    };
    await fetchCoaches(id);
    await fetchDocuments();
    await loadFitScore();
  }
});
</script>
