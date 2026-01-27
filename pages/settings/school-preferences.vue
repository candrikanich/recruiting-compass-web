<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink
          to="/settings"
          class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back to Settings
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-slate-900">
          School Preferences
        </h1>
        <p class="text-slate-600">
          Set your criteria for finding the ideal schools
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
        <p class="text-slate-600">Loading preferences...</p>
      </div>

      <div v-else class="space-y-8">
        <!-- Templates -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">
            Start from a Template
          </h2>
          <p class="text-sm text-gray-600 mb-4">
            Choose a template to quickly set up your preferences
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              v-for="template in TEMPLATES"
              :key="template.id"
              @click="applyTemplate(template)"
              :class="[
                'p-4 border-2 rounded-lg text-left transition',
                appliedTemplate === template.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-400',
              ]"
            >
              <div class="flex items-center gap-3 mb-2">
                <span class="text-2xl">{{ template.icon }}</span>
                <h3 class="font-semibold text-gray-900">{{ template.name }}</h3>
              </div>
              <p class="text-sm text-gray-600">{{ template.description }}</p>
            </button>
          </div>
        </div>

        <!-- Preferences List -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-xl font-bold text-gray-900">Your Preferences</h2>
              <p class="text-sm text-gray-600">
                Drag to reorder. Top items are highest priority.
              </p>
            </div>
            <button
              @click="showAddPreference = true"
              class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              + Add Preference
            </button>
          </div>

          <!-- Empty State -->
          <div
            v-if="preferences.length === 0"
            class="text-center py-12 text-gray-500"
          >
            <p>No preferences set yet.</p>
            <p class="text-sm mt-2">
              Choose a template above or add preferences manually.
            </p>
          </div>

          <!-- Preferences List (Draggable) -->
          <div v-else class="space-y-3">
            <div
              v-for="(pref, index) in preferences"
              :key="pref.id"
              :draggable="true"
              @dragstart="handleDragStart(index)"
              @dragover.prevent
              @drop="handleDrop(index)"
              @dragenter.prevent
              :class="[
                'flex items-center gap-4 p-4 rounded-lg border-2 transition cursor-move',
                dragOverIndex === index
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 bg-gray-50',
              ]"
            >
              <!-- Drag Handle -->
              <div class="text-gray-400">
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 8h16M4 16h16"
                  />
                </svg>
              </div>

              <!-- Priority Number -->
              <div
                class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm"
              >
                {{ index + 1 }}
              </div>

              <!-- Preference Details -->
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900">{{
                    getPreferenceLabel(pref)
                  }}</span>
                  <span
                    v-if="pref.is_dealbreaker"
                    class="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800"
                  >
                    Dealbreaker
                  </span>
                </div>
                <p class="text-sm text-gray-600">
                  {{ getPreferenceValue(pref) }}
                </p>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2">
                <button
                  @click="toggleDealbreaker(index)"
                  :class="[
                    'px-3 py-1 text-xs font-medium rounded transition',
                    pref.is_dealbreaker
                      ? 'bg-red-100 text-red-800 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  ]"
                >
                  {{ pref.is_dealbreaker ? "Required" : "Optional" }}
                </button>
                <button
                  @click="removePreference(index)"
                  class="p-1 text-gray-400 hover:text-red-600 transition"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Add Preference Modal -->
        <div
          v-if="showAddPreference"
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          @click.self="showAddPreference = false"
        >
          <div
            class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div class="p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-4">
                Add Preference
              </h3>

              <!-- Category Selection -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >Category</label
                >
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="cat in CATEGORIES"
                    :key="cat.value"
                    @click="
                      newPreference.category = cat.value as PreferenceCategory
                    "
                    :class="[
                      'px-4 py-2 rounded-lg font-medium text-sm transition border',
                      newPreference.category === cat.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400',
                    ]"
                  >
                    {{ cat.label }}
                  </button>
                </div>
              </div>

              <!-- Type Selection -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >Preference Type</label
                >
                <select
                  v-model="newPreference.type"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select type...</option>
                  <option
                    v-for="type in getTypesForCategory(newPreference.category)"
                    :key="type.value"
                    :value="type.value"
                  >
                    {{ type.label }}
                  </option>
                </select>
              </div>

              <!-- Value Input (Dynamic based on type) -->
              <div v-if="newPreference.type" class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >Value</label
                >

                <!-- Distance Input -->
                <div
                  v-if="newPreference.type === 'max_distance_miles'"
                  class="flex items-center gap-2"
                >
                  <input
                    v-model.number="newPreference.value"
                    type="number"
                    min="50"
                    max="3000"
                    placeholder="e.g., 500"
                    class="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <span class="text-gray-600">miles</span>
                </div>

                <!-- Division Multi-Select -->
                <div
                  v-else-if="newPreference.type === 'division'"
                  class="flex flex-wrap gap-2"
                >
                  <button
                    v-for="div in DIVISIONS"
                    :key="div"
                    @click="toggleArrayValue(div)"
                    :class="[
                      'px-3 py-1 rounded font-medium text-sm transition border',
                      (newPreference.value || []).includes(div)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300',
                    ]"
                  >
                    {{ div }}
                  </button>
                </div>

                <!-- Conference Type Multi-Select -->
                <div
                  v-else-if="newPreference.type === 'conference_type'"
                  class="flex flex-wrap gap-2"
                >
                  <button
                    v-for="conf in CONFERENCE_TYPES"
                    :key="conf"
                    @click="toggleArrayValue(conf)"
                    :class="[
                      'px-3 py-1 rounded font-medium text-sm transition border',
                      (newPreference.value || []).includes(conf)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300',
                    ]"
                  >
                    {{ conf }}
                  </button>
                </div>

                <!-- Academic Rating -->
                <div v-else-if="newPreference.type === 'min_academic_rating'">
                  <select
                    v-model.number="newPreference.value"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option :value="1">1 - Basic</option>
                    <option :value="2">2 - Good</option>
                    <option :value="3">3 - Very Good</option>
                    <option :value="4">4 - Excellent</option>
                    <option :value="5">5 - Elite</option>
                  </select>
                </div>

                <!-- School Size -->
                <div v-else-if="newPreference.type === 'school_size'">
                  <select
                    v-model="newPreference.value"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="small">Small (&lt;5,000 students)</option>
                    <option value="medium">Medium (5,000-15,000)</option>
                    <option value="large">Large (15,000-30,000)</option>
                    <option value="very_large">Very Large (&gt;30,000)</option>
                  </select>
                </div>

                <!-- Boolean -->
                <div
                  v-else-if="newPreference.type === 'scholarship_required'"
                  class="flex gap-4"
                >
                  <label class="flex items-center gap-2">
                    <input
                      type="radio"
                      :value="true"
                      v-model="newPreference.value"
                    />
                    <span>Yes, required</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input
                      type="radio"
                      :value="false"
                      v-model="newPreference.value"
                    />
                    <span>Not required</span>
                  </label>
                </div>

                <!-- Regions -->
                <div
                  v-else-if="newPreference.type === 'preferred_regions'"
                  class="flex flex-wrap gap-2"
                >
                  <button
                    v-for="region in REGIONS"
                    :key="region"
                    @click="toggleArrayValue(region)"
                    :class="[
                      'px-3 py-1 rounded font-medium text-sm transition border',
                      (newPreference.value || []).includes(region)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300',
                    ]"
                  >
                    {{ region }}
                  </button>
                </div>

                <!-- Text Input Default -->
                <input
                  v-else
                  v-model="newPreference.value"
                  type="text"
                  placeholder="Enter value..."
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <!-- Dealbreaker Toggle -->
              <div class="mb-6">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="newPreference.is_dealbreaker"
                    class="w-4 h-4 rounded border-gray-300"
                  />
                  <span class="text-sm text-gray-700">
                    Mark as dealbreaker (schools without this will show a
                    warning)
                  </span>
                </label>
              </div>

              <!-- Actions -->
              <div class="flex justify-end gap-3">
                <button
                  @click="showAddPreference = false"
                  class="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  @click="addPreference"
                  :disabled="
                    !newPreference.type || newPreference.value === undefined
                  "
                  class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Preference
                </button>
              </div>
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
            @click="handleSave"
            :disabled="saving"
            class="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {{ saving ? "Saving..." : "Save Preferences" }}
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useToast } from "~/composables/useToast";
import type { SchoolPreference, SchoolPreferences } from "~/types/models";

definePageMeta({
  middleware: "auth",
});

const { isLoading, error, getSchoolPreferences, setSchoolPreferences } =
  usePreferenceManager();
const { showToast } = useToast();

const CATEGORIES = [
  { value: "location", label: "Location" },
  { value: "academic", label: "Academic" },
  { value: "program", label: "Program" },
  { value: "custom", label: "Custom" },
];

const PREFERENCE_TYPES = {
  location: [
    { value: "max_distance_miles", label: "Maximum Distance (miles)" },
    { value: "preferred_regions", label: "Preferred Regions" },
    { value: "preferred_states", label: "Preferred States" },
  ],
  academic: [
    { value: "min_academic_rating", label: "Minimum Academic Rating" },
    { value: "school_size", label: "School Size" },
  ],
  program: [
    { value: "division", label: "Division" },
    { value: "conference_type", label: "Conference Type" },
    { value: "scholarship_required", label: "Scholarship Required" },
  ],
  custom: [
    { value: "must_have", label: "Must Have (custom tag)" },
    { value: "nice_to_have", label: "Nice to Have (custom tag)" },
  ],
};

const DIVISIONS = ["D1", "D2", "D3", "NAIA", "JUCO"];
const CONFERENCE_TYPES = [
  "Power 4",
  "Group of 5",
  "Mid-Major",
  "Small Conference",
];
const REGIONS = [
  "Northeast",
  "Southeast",
  "Midwest",
  "Southwest",
  "West Coast",
  "Pacific Northwest",
];

const TEMPLATES = [
  {
    id: "d1_power",
    name: "D1 Power Conference",
    icon: "🏆",
    description: "Focus on top-tier D1 programs with competitive baseball",
    preferences: [
      {
        category: "program",
        type: "division",
        value: ["D1"],
        is_dealbreaker: true,
      },
      {
        category: "program",
        type: "conference_type",
        value: ["Power 4"],
        is_dealbreaker: false,
      },
      {
        category: "program",
        type: "scholarship_required",
        value: true,
        is_dealbreaker: false,
      },
    ],
  },
  {
    id: "academic_excellence",
    name: "Academic Excellence",
    icon: "📚",
    description: "Prioritize academics with strong graduation rates",
    preferences: [
      {
        category: "academic",
        type: "min_academic_rating",
        value: 4,
        is_dealbreaker: true,
      },
      {
        category: "academic",
        type: "school_size",
        value: "medium",
        is_dealbreaker: false,
      },
      {
        category: "program",
        type: "division",
        value: ["D1", "D3"],
        is_dealbreaker: false,
      },
    ],
  },
  {
    id: "close_to_home",
    name: "Close to Home",
    icon: "🏠",
    description: "Distance-focused, regional schools within driving distance",
    preferences: [
      {
        category: "location",
        type: "max_distance_miles",
        value: 300,
        is_dealbreaker: true,
      },
    ],
  },
  {
    id: "best_fit",
    name: "Best Fit (Balanced)",
    icon: "⚖️",
    description: "Balanced mix of academics, athletics, and location",
    preferences: [
      {
        category: "location",
        type: "max_distance_miles",
        value: 500,
        is_dealbreaker: false,
      },
      {
        category: "academic",
        type: "min_academic_rating",
        value: 3,
        is_dealbreaker: false,
      },
      {
        category: "program",
        type: "division",
        value: ["D1", "D2", "D3"],
        is_dealbreaker: false,
      },
    ],
  },
];

const preferences = ref<SchoolPreference[]>([]);
const appliedTemplate = ref<string | null>(null);
const showAddPreference = ref(false);
const saving = ref(false);
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

type PreferenceCategory = "location" | "academic" | "program" | "custom";

const newPreference = ref<{
  category: PreferenceCategory;
  type: string;
  value: any;
  is_dealbreaker: boolean;
}>({
  category: "location",
  type: "",
  value: undefined,
  is_dealbreaker: false,
});

const getTypesForCategory = (category: string) => {
  return PREFERENCE_TYPES[category as keyof typeof PREFERENCE_TYPES] || [];
};

const getPreferenceLabel = (pref: SchoolPreference) => {
  const types =
    PREFERENCE_TYPES[pref.category as keyof typeof PREFERENCE_TYPES] || [];
  const typeObj = types.find((t) => t.value === pref.type);
  return typeObj?.label || pref.type;
};

const getPreferenceValue = (pref: SchoolPreference) => {
  if (Array.isArray(pref.value)) {
    return pref.value.join(", ");
  }
  if (typeof pref.value === "boolean") {
    return pref.value ? "Yes" : "No";
  }
  if (pref.type === "max_distance_miles") {
    return `${pref.value} miles`;
  }
  if (pref.type === "min_academic_rating") {
    const ratings = ["", "Basic", "Good", "Very Good", "Excellent", "Elite"];
    return ratings[pref.value] || pref.value;
  }
  return String(pref.value);
};

const toggleArrayValue = (val: string) => {
  if (!Array.isArray(newPreference.value.value)) {
    newPreference.value.value = [];
  }
  const idx = newPreference.value.value.indexOf(val);
  if (idx >= 0) {
    newPreference.value.value.splice(idx, 1);
  } else {
    newPreference.value.value.push(val);
  }
};

const applyTemplate = (template: (typeof TEMPLATES)[0]) => {
  appliedTemplate.value = template.id;
  preferences.value = template.preferences.map((p, i) => ({
    id: `${template.id}-${i}-${Date.now()}`,
    category: p.category as "location" | "academic" | "program" | "custom",
    type: p.type,
    value: p.value,
    priority: i + 1,
    is_dealbreaker: p.is_dealbreaker,
  }));
};

const addPreference = () => {
  const pref: SchoolPreference = {
    id: `custom-${Date.now()}`,
    category: newPreference.value.category,
    type: newPreference.value.type,
    value: newPreference.value.value,
    priority: preferences.value.length + 1,
    is_dealbreaker: newPreference.value.is_dealbreaker,
  };
  preferences.value.push(pref);
  appliedTemplate.value = null;

  // Reset form
  newPreference.value = {
    category: "location",
    type: "",
    value: undefined,
    is_dealbreaker: false,
  };
  showAddPreference.value = false;
};

const removePreference = (index: number) => {
  preferences.value.splice(index, 1);
  appliedTemplate.value = null;
};

const toggleDealbreaker = (index: number) => {
  preferences.value[index].is_dealbreaker =
    !preferences.value[index].is_dealbreaker;
};

// Drag and Drop handlers
const handleDragStart = (index: number) => {
  dragIndex.value = index;
};

const handleDrop = (targetIndex: number) => {
  if (dragIndex.value === null || dragIndex.value === targetIndex) {
    dragIndex.value = null;
    dragOverIndex.value = null;
    return;
  }

  const item = preferences.value[dragIndex.value];
  preferences.value.splice(dragIndex.value, 1);
  preferences.value.splice(targetIndex, 0, item);

  // Update priorities
  preferences.value.forEach((p, i) => {
    p.priority = i + 1;
  });

  appliedTemplate.value = null;
  dragIndex.value = null;
  dragOverIndex.value = null;
};

const handleSave = async () => {
  saving.value = true;
  try {
    const data: SchoolPreferences = {
      preferences: preferences.value,
      template_used: appliedTemplate.value || undefined,
      last_updated: new Date().toISOString(),
    };
    await setSchoolPreferences(data);
    showToast("School preferences saved successfully", "success");
  } catch (err) {
    console.error("Failed to save school preferences:", err);
    showToast("Failed to save school preferences", "error");
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  const schoolPrefs = getSchoolPreferences();
  if (schoolPrefs?.preferences) {
    preferences.value = [...schoolPrefs.preferences];
    appliedTemplate.value = schoolPrefs.template_used || null;
  }
});
</script>
