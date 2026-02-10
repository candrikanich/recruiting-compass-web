# Shared Utilities Guide

This document describes the new reusable shared utilities created for entity name resolution, page states, page filters, and linked athletes.

## New Utilities Created

### 1. `composables/useEntityNames.ts`

Provides reactive computed properties for resolving entity IDs to human-readable names.

**Purpose:** Centralize entity name resolution logic to avoid duplication across pages and components.

**API:**

```typescript
const { getSchoolName, getCoachName, formatCoachName } = useEntityNames();

// Resolve school ID to name (reactive computed)
const schoolName = getSchoolName(schoolId); // "Stanford University"

// Resolve coach ID to formatted name (reactive computed)
const coachName = getCoachName(coachId); // "John Smith"

// Format coach name from separate fields
const formatted = formatCoachName(firstName, lastName); // "Jane Doe"
```

**Features:**

- Reactive computed properties (efficient re-rendering)
- Automatic fallback to "Unknown" for missing data
- Uses `useSchools()` and `useCoaches()` internally
- No manual array passing required

**Usage Example:**

```vue
<template>
  <div class="interaction-card">
    <p>{{ getSchoolName(interaction.school_id) }}</p>
    <p v-if="interaction.coach_id">{{ getCoachName(interaction.coach_id) }}</p>
  </div>
</template>

<script setup lang="ts">
import { useEntityNames } from "~/composables/useEntityNames";

const { getSchoolName, getCoachName } = useEntityNames();
</script>
```

---

### 2. `components/shared/PageState.vue`

Reusable component for managing loading, error, empty, and content states.

**Purpose:** Eliminate duplicated state UI patterns across pages.

**Props:**

```typescript
interface Props {
  loading?: boolean; // Show loading spinner
  error?: string | null; // Show error message
  isEmpty?: boolean; // Show empty state
  loadingMessage?: string; // Customize loading text (default: "Loading...")
  emptyIcon?: Component; // HeroIcon component for empty state
  emptyTitle?: string; // Title for empty state
  emptyMessage?: string; // Description for empty state
}
```

**Slots:**

- `default` - Content to display when data exists
- `empty-action` - Action button/link for empty state (optional)

**Features:**

- Built-in accessibility (role, aria-live, aria-atomic)
- Matches existing design system (white bg, rounded, border, shadow)
- Automatic state management (only one state visible at a time)
- Icon support for visual appeal

**Usage Example:**

```vue
<template>
  <PageState
    :loading="loading"
    :error="error"
    :isEmpty="schools.length === 0"
    empty-title="No schools yet"
    empty-message="Add your first school to get started"
    :empty-icon="PlusIcon"
  >
    <div class="space-y-4">
      <SchoolCard v-for="school in schools" :key="school.id" :school="school" />
    </div>

    <template #empty-action>
      <NuxtLink to="/schools/add" class="text-blue-600 hover:underline">
        Add your first school
      </NuxtLink>
    </template>
  </PageState>
</template>

<script setup lang="ts">
import PageState from "~/components/shared/PageState.vue";
import { PlusIcon } from "@heroicons/vue/24/outline";

const { schools, loading, error } = useSchools();
</script>
```

---

### 3. `composables/usePageFilters.ts`

Generic composable for managing page filter state (search, filters, sort).

**Purpose:** Provide consistent filter management with optional localStorage persistence.

**Type Parameters:**

```typescript
// T: Union type of available sort options
type SchoolSortOption = "name" | "status" | "rankingScore";
```

**API:**

```typescript
const { searchQuery, filters, sortBy, clearFilters } =
  usePageFilters<SchoolSortOption>({
    defaultSort: "name",
    storageKey: "schools-filters", // Optional: persists to localStorage
  });

// Update filters
searchQuery.value = "Stanford";
filters.value.status = "interested";
sortBy.value = "rankingScore";

// Clear all filters
clearFilters(); // Resets to defaults
```

**Features:**

- Generic type support for sort options
- Optional localStorage persistence
- Reactive refs for two-way binding
- Automatic JSON serialization/deserialization

**Usage Example:**

```vue
<template>
  <div>
    <input v-model="searchQuery" placeholder="Search..." />

    <select v-model="sortBy">
      <option value="name">Name</option>
      <option value="status">Status</option>
      <option value="rankingScore">Ranking Score</option>
    </select>

    <button @click="clearFilters">Clear Filters</button>

    <SchoolList :schools="filteredSchools" />
  </div>
</template>

<script setup lang="ts">
import { usePageFilters } from "~/composables/usePageFilters";
import { computed } from "vue";

type SchoolSortOption = "name" | "status" | "rankingScore";

const { searchQuery, filters, sortBy, clearFilters } =
  usePageFilters<SchoolSortOption>({
    defaultSort: "name",
    storageKey: "schools-filters",
  });

const { schools } = useSchools();

const filteredSchools = computed(() => {
  return schools.value
    .filter((school) => {
      // Apply search filter
      if (searchQuery.value && !school.name.includes(searchQuery.value)) {
        return false;
      }
      // Apply status filter
      if (filters.value.status && school.status !== filters.value.status) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Apply sort
      if (sortBy.value === "name") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
});
</script>
```

---

### 4. `composables/useLinkedAthletes.ts`

Fetches and manages linked athlete accounts for parent users.

**Purpose:** Extract and reuse linked athletes fetching logic (extracted from interactions page).

**API:**

```typescript
const { linkedAthletes, loading, error, fetchLinkedAthletes } =
  useLinkedAthletes();

// Fetch athletes for a parent user
await fetchLinkedAthletes(parentUserId);

// Access results
console.log(linkedAthletes.value); // User[]
console.log(loading.value); // boolean
console.log(error.value); // string | null
```

**Features:**

- Multi-step account linking support
- Graceful handling of edge cases
- Proper error states and messages
- Type-safe Supabase error handling

**Process:**

1. Query account_links for linked athlete IDs
2. Extract and filter null IDs
3. Fetch full user records from users table
4. Populate reactive ref

**Usage Example:**

```vue
<template>
  <div>
    <!-- Loading state -->
    <p v-if="loading">Loading athletes...</p>

    <!-- Error state -->
    <p v-else-if="error" class="text-red-600">{{ error }}</p>

    <!-- Content -->
    <div v-else-if="linkedAthletes.length > 0" class="space-y-4">
      <AthleteCard
        v-for="athlete in linkedAthletes"
        :key="athlete.id"
        :athlete="athlete"
      />
    </div>

    <!-- Empty state -->
    <p v-else class="text-slate-600">No linked athletes</p>
  </div>
</template>

<script setup lang="ts">
import { useLinkedAthletes } from "~/composables/useLinkedAthletes";
import { useUserStore } from "~/stores/user";
import { onMounted } from "vue";

const userStore = useUserStore();
const { linkedAthletes, loading, error, fetchLinkedAthletes } =
  useLinkedAthletes();

onMounted(async () => {
  if (userStore.isParent && userStore.user?.id) {
    await fetchLinkedAthletes(userStore.user.id);
  }
});
</script>
```

---

## Integration Examples

### Complete Page Example Using All Utilities

```vue
<template>
  <div class="page">
    <h1>My Interactions</h1>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <input v-model="searchQuery" placeholder="Search..." />
      <select v-model="sortBy">
        <option value="date">Date</option>
        <option value="school">School</option>
      </select>
      <button @click="clearFilters">Clear</button>
    </div>

    <!-- Linked Athletes Filter (Parents Only) -->
    <div v-if="isParent && linkedAthletes.length > 0">
      <select v-model="filters.athleteId">
        <option value="">All Athletes</option>
        <option
          v-for="athlete in linkedAthletes"
          :key="athlete.id"
          :value="athlete.id"
        >
          {{ athlete.first_name }} {{ athlete.last_name }}
        </option>
      </select>
    </div>

    <!-- Content -->
    <PageState
      :loading="loading"
      :error="error"
      :isEmpty="interactions.length === 0"
      empty-title="No interactions"
      empty-message="Log your first interaction"
      :empty-icon="ChatBubbleIcon"
    >
      <div class="space-y-4">
        <InteractionCard
          v-for="interaction in filteredInteractions"
          :key="interaction.id"
          :interaction="interaction"
          :school-name="getSchoolName(interaction.school_id)"
          :coach-name="
            interaction.coach_id
              ? getCoachName(interaction.coach_id)
              : undefined
          "
        />
      </div>

      <template #empty-action>
        <NuxtLink to="/interactions/add" class="text-blue-600"
          >Log Interaction</NuxtLink
        >
      </template>
    </PageState>
  </div>
</template>

<script setup lang="ts">
import { useInteractions } from "~/composables/useInteractions";
import { useEntityNames } from "~/composables/useEntityNames";
import { usePageFilters } from "~/composables/usePageFilters";
import { useLinkedAthletes } from "~/composables/useLinkedAthletes";
import { useUserStore } from "~/stores/user";
import PageState from "~/components/shared/PageState.vue";
import { ChatBubbleIcon } from "@heroicons/vue/24/outline";
import { computed, onMounted } from "vue";

type InteractionSortOption = "date" | "school" | "coach";

const userStore = useUserStore();
const { interactions, loading, error } = useInteractions();
const { getSchoolName, getCoachName } = useEntityNames();
const { searchQuery, filters, sortBy, clearFilters } =
  usePageFilters<InteractionSortOption>({
    defaultSort: "date",
    storageKey: "interactions-filters",
  });
const { linkedAthletes, fetchLinkedAthletes } = useLinkedAthletes();

const isParent = computed(() => userStore.isParent);

onMounted(async () => {
  if (isParent.value && userStore.user?.id) {
    await fetchLinkedAthletes(userStore.user.id);
  }
});

const filteredInteractions = computed(() => {
  return interactions.value
    .filter((interaction) => {
      // Search filter
      if (
        searchQuery.value &&
        !interaction.subject?.includes(searchQuery.value)
      ) {
        return false;
      }
      // Athlete filter (for parents)
      if (
        filters.value.athleteId &&
        interaction.user_id !== filters.value.athleteId
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy.value === "date") {
        return (
          new Date(b.occurred_at || b.created_at).getTime() -
          new Date(a.occurred_at || a.created_at).getTime()
        );
      }
      if (sortBy.value === "school") {
        return getSchoolName(a.school_id).localeCompare(
          getSchoolName(b.school_id),
        );
      }
      return 0;
    });
});
</script>
```

---

## Key Benefits

1. **DRY Principle**: Eliminates duplicated entity name resolution, filter management, and state UI patterns
2. **Type Safety**: All utilities fully typed with TypeScript generics where appropriate
3. **Accessibility**: PageState component includes proper ARIA attributes
4. **Reactivity**: Composables return reactive refs/computed for efficient Vue reactivity
5. **Flexibility**: Utilities are generic enough to work across multiple pages and contexts
6. **Persistence**: Optional localStorage support for filter preferences
7. **Maintainability**: Single source of truth for common patterns

---

## Migration Guide

### Before (Duplicated):

```vue
<script setup>
const getSchoolName = (schoolId: string | undefined): string => {
  if (!schoolId) return "Unknown";
  const school = schools.value.find((s) => s.id === schoolId);
  return school?.name || "Unknown";
};
</script>
```

### After (Reusable):

```vue
<script setup>
const { getSchoolName } = useEntityNames();
// Single composable call, used everywhere
</script>
```

---

## Testing Recommendations

- **useEntityNames**: Unit test with mock schools/coaches data
- **PageState**: Component test verifying all four state conditions (loading, error, empty, content)
- **usePageFilters**: Unit test localStorage persistence and filter clearing
- **useLinkedAthletes**: Integration test with mock Supabase responses

---

## Notes

- All utilities follow Vue 3 Composition API patterns
- Compatible with existing project architecture
- No modifications to existing pages (can be adopted incrementally)
- Each utility is independently usable (no hard dependencies between them)
