# Phase 4-7 Implementation: Next Steps

**Current Status:** 40% Complete (Database + Composable Foundations)
**Last Updated:** 2026-01-31

---

## 🎯 What's Been Completed This Session

### Database Layer (100% Complete)

1. ✅ **Migration 021** - Family unit schema
   - 3 new tables (family_units, family_members, user_notes)
   - 7 columns added (family_unit_id on data tables)
   - 4 helper functions
   - Complete RLS policy overhaul (family-based access)

2. ✅ **Migration 022** - Data backfill
   - Safe migration with backup tables
   - Validation queries included
   - Rollback script provided

3. ✅ **Documentation**
   - `FAMILY_UNITS_MIGRATION.md` - Comprehensive migration guide
   - `FAMILY_UNITS_IMPLEMENTATION_STATUS.md` - Full implementation tracker
   - This file - Next steps guide

### Composable Layer (65% Complete)

1. ✅ **useActiveFamily()** - NEW
   - Central family context provider
   - Handles student/parent switching
   - Clean API for family-scoped queries

2. ✅ **useUserNotes()** - NEW
   - Private per-user notes management
   - CRUD operations (create, read, update, delete)
   - Caching built-in

3. ✅ **useSchools()** - UPDATED
   - Switched from user_id to family_unit_id filtering
   - All CRUD methods updated
   - Student creation scoped to family

### Code Quality

- ✅ **Type Checking:** Zero errors
- ✅ **Linting:** Zero errors
- ✅ **All composables follow project patterns**

---

## 📋 Immediate Next Steps (After This Session)

### 1. Apply Database Migrations (DO THIS FIRST)

```bash
# Option A: Supabase Web Console (simplest)
# 1. Go to SQL Editor
# 2. Run migration 021_create_family_units.sql (copy-paste entire contents)
# 3. Run migration 022_backfill_family_data.sql (copy-paste entire contents)
# 4. Review validation output

# Option B: Supabase CLI
supabase db push

# After migrations:
npx supabase gen types typescript --local > types/database.ts
```

**Why First:** All composables depend on these tables existing. TypeScript types must be regenerated.

---

### 2. Update Remaining Composables (3-4 hours)

#### 2a. Update useCoaches.ts

Same pattern as useSchools - this is copy-paste + search-replace:

```typescript
// Replace in useCoaches.ts:
// .eq("user_id", userStore.user.id)
// with
// .eq("family_unit_id", activeFamily.activeFamilyId.value)

// Also:
// - Import useActiveFamily
// - Add family_unit_id to create operations
// - Update all query filters
```

Affected methods:

- fetchCoaches()
- getCoach()
- createCoach()
- updateCoach()
- deleteCoach()

**Files to modify:**

- `composables/useCoaches.ts`

#### 2b. Update useInteractions.ts

Additional consideration: Add student-only creation check

```typescript
// In createInteraction(), add:
if (!activeFamily.activeAthleteId.value) {
  throw new Error("No athlete in context");
}

// Ensure check for student role (already exists with logged_by)
const isStudent = userStore.user?.role === "student";
if (!isStudent) {
  throw new Error("Only students can create interactions");
}
```

Affected methods:

- fetchInteractions()
- createInteraction() - add student check
- updateInteraction()
- deleteInteraction()

**Files to modify:**

- `composables/useInteractions.ts`

#### 2c. Update useAccountLinks.ts

**CRITICAL:** Add family creation on link confirmation

When `confirmLinkAsInitiator()` succeeds, create family structure:

```typescript
// In confirmLinkAsInitiator(), after link confirmation:
const { data: family, error: familyError } = await supabase
  .from("family_units")
  .select("id")
  .eq("student_user_id", linkData.player_user_id)
  .single();

if (!family) {
  // Family doesn't exist yet - create it (might be first parent)
  // Get student user
  const { data: student } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", linkData.player_user_id)
    .single();

  const { data: newFamily } = await supabase
    .from("family_units")
    .insert({
      student_user_id: linkData.player_user_id,
      family_name: student?.full_name
        ? `${student.full_name}'s Family`
        : "Family",
    })
    .select()
    .single();

  // Add student to family
  await supabase.from("family_members").insert({
    family_unit_id: newFamily.id,
    user_id: linkData.player_user_id,
    role: "student",
  });
}

// Add confirming parent to family
await supabase
  .from("family_members")
  .insert({
    family_unit_id: family.id,
    user_id: userStore.user.id,
    role: "parent",
  })
  .onConflict("family_unit_id,user_id")
  .ignore();
```

**Files to modify:**

- `composables/useAccountLinks.ts`

---

### 3. Build UI Components (6-8 hours)

#### 3a. AthleteSelector.vue (Parent Switching)

**File:** `components/AthleteSelector.vue`

```vue
<template>
  <div class="flex items-center gap-2">
    <label>Viewing as: </label>
    <select
      v-if="isParent"
      v-model="selectedAthleteId"
      @change="handleSwitch"
      class="px-3 py-2 border rounded"
    >
      <option
        v-for="athlete in accessibleAthletes"
        :key="athlete.athleteId"
        :value="athlete.athleteId"
      >
        {{ athlete.familyName }} - {{ athlete.athleteName }}
      </option>
    </select>
    <span v-else class="text-gray-600">
      {{ userStore.user?.full_name }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useActiveFamily } from "~/composables/useActiveFamily";
import { useUserStore } from "~/stores/user";

const activeFamily = useActiveFamily();
const userStore = useUserStore();
const selectedAthleteId = ref<string>("");

const isParent = computed(() => userStore.user?.role === "parent");
const accessibleAthletes = computed(() => activeFamily.getAccessibleAthletes());

const handleSwitch = async () => {
  await activeFamily.switchAthlete(selectedAthleteId.value);
};

onMounted(() => {
  selectedAthleteId.value = activeFamily.activeAthleteId.value || "";
});
</script>
```

**Usage:** Add to top navigation/header (all pages)

#### 3b. PrivateNotesCard.vue (User Notes Display)

**File:** `components/PrivateNotesCard.vue`

```vue
<template>
  <div
    v-if="showCard"
    class="border-l-4 border-blue-500 bg-blue-50 p-4 rounded"
  >
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-blue-900">Your Private Notes</h3>
      <button
        v-if="!editing"
        @click="startEdit"
        class="text-xs text-blue-600 hover:text-blue-800"
      >
        {{ noteContent ? "Edit" : "Add Notes" }}
      </button>
    </div>

    <div v-if="!editing" class="mt-2 text-sm text-blue-800">
      {{ noteContent || "No private notes yet. Add your own thoughts here." }}
    </div>

    <div v-else class="mt-2 space-y-2">
      <textarea
        v-model="editedContent"
        class="w-full p-2 border rounded text-sm"
        rows="4"
        placeholder="Your private notes..."
      />
      <div class="flex gap-2">
        <button
          @click="saveNote"
          :disabled="saving"
          class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {{ saving ? "Saving..." : "Save" }}
        </button>
        <button
          @click="cancelEdit"
          class="px-3 py-1 text-sm border rounded hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useUserNotes } from "~/composables/useUserNotes";
import { useUserStore } from "~/stores/user";

interface Props {
  entityType: "school" | "coach" | "interaction";
  entityId: string;
}

const props = defineProps<Props>();
const userStore = useUserStore();
const userNotes = useUserNotes();

const noteContent = ref("");
const editing = ref(false);
const editedContent = ref("");
const saving = ref(false);

const showCard = computed(() => {
  return !userStore.isAdmin; // Show for non-admins (students/parents)
});

const startEdit = () => {
  editedContent.value = noteContent.value;
  editing.value = true;
};

const cancelEdit = () => {
  editing.value = false;
  editedContent.value = "";
};

const saveNote = async () => {
  saving.value = true;
  const success = await userNotes.saveNote(
    props.entityType,
    props.entityId,
    editedContent.value,
  );

  if (success) {
    noteContent.value = editedContent.value;
    editing.value = false;
  }

  saving.value = false;
};

onMounted(async () => {
  const note = await userNotes.getNote(props.entityType, props.entityId);
  noteContent.value = note || "";
});
</script>
```

**Usage:**

```vue
<PrivateNotesCard entity-type="school" :entity-id="schoolId" />
```

#### 3c. Update SchoolCard.vue

Add both shared + private notes:

```vue
<!-- After shared notes section, add: -->
<PrivateNotesCard
  v-if="isStudent || isParent"
  entity-type="school"
  :entity-id="school.id"
/>
```

#### 3d. Update pages/schools/index.vue

Add athlete selector at top:

```vue
<template>
  <div>
    <!-- Athlete selector for parents -->
    <AthleteSelector v-if="isParent" />

    <!-- Rest of page -->
  </div>
</template>

<script setup lang="ts">
const isParent = useUserStore().user?.role === "parent";
</script>
```

---

### 4. Create API Endpoints (4-5 hours)

#### 4a. POST /api/account-links/confirm.post.ts

**MODIFY EXISTING** - Add family creation logic

Already has family creation in plan above (useAccountLinks section).

#### 4b. POST /api/family/create.post.ts

**NEW** - Backup family creation (shouldn't be needed normally, but useful for testing)

```typescript
export default defineEventHandler(async (event) => {
  const { studentId, parentIds } = await readBody(event);
  const supabase = useSupabaseServer();

  // Verify student exists and is a student
  const { data: student } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", studentId)
    .single();

  if (!student || student.role !== "student") {
    throw createError({ statusCode: 400, message: "Invalid student" });
  }

  // Create family
  const { data: family, error: familyError } = await supabase
    .from("family_units")
    .insert({
      student_user_id: studentId,
      family_name: `Family ${studentId.slice(0, 8)}`,
    })
    .select()
    .single();

  if (familyError) throw familyError;

  // Add members
  const members = [
    { family_unit_id: family.id, user_id: studentId, role: "student" },
    ...parentIds.map((id: string) => ({
      family_unit_id: family.id,
      user_id: id,
      role: "parent",
    })),
  ];

  const { error: membersError } = await supabase
    .from("family_members")
    .insert(members);

  if (membersError) throw membersError;

  return { family, members };
});
```

#### 4c. GET /api/family/members.get.ts

**NEW** - Fetch family members

```typescript
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = useSupabaseServer();
  const familyId = getQuery(event).familyId as string;

  if (!familyId) {
    throw createError({ statusCode: 400, message: "familyId required" });
  }

  // Verify user has access to family
  const { data: access } = await supabase
    .from("family_members")
    .select("id")
    .eq("family_unit_id", familyId)
    .eq("user_id", user.id)
    .single();

  if (!access) {
    throw createError({ statusCode: 403, message: "No access to family" });
  }

  // Fetch all members
  const { data: members, error } = await supabase
    .from("family_members")
    .select("*, users(id, full_name, email, role)")
    .eq("family_unit_id", familyId);

  if (error) throw error;

  return members;
});
```

---

### 5. Testing Strategy (6-8 hours)

#### Unit Tests - High Priority

- `tests/unit/composables/useActiveFamily.spec.ts`
- `tests/unit/composables/useUserNotes.spec.ts`

#### Integration Tests - Medium Priority

- Family creation via account linking
- Parent viewing student data
- Student creating schools in family

#### E2E Tests - High Priority (User Workflows)

- Parent logs in → switches between kids → views schools
- Student creates school → parent sees it → parents add private notes
- Student can create interactions → parent cannot

---

## ⚠️ Critical Implementation Notes

1. **Migration Safety**
   - Always test migrations in staging FIRST
   - Keep backup tables for 24 hours before cleanup
   - Have rollback plan ready

2. **Family Creation Timing**
   - Happens automatically on account link confirm
   - Also happens retroactively during migration 022
   - Manual creation endpoint for testing/edge cases

3. **activeFamily Initialization**
   - Must call `initializeFamily()` on app mount or login
   - Check that `activeFamilyId.value` is not null before querying
   - Use computed properties for reactivity

4. **Query Patterns**
   - Replace `.eq("user_id", id)` with `.eq("family_unit_id", familyId)`
   - Keep `.eq("user_id", id)` for delete operations (creator check)
   - Always verify family_unit_id != null in RLS policies

5. **Parent Viewing Student**
   - Use `route.query.athlete_id` for explicit athlete context
   - Fallback to localStorage for session persistence
   - Show "Viewing as parent" banner for clarity

---

## 📊 Remaining Effort Estimates

| Task                                           | Hours    | Priority | Blocker     |
| ---------------------------------------------- | -------- | -------- | ----------- |
| Apply migrations + regenerate types            | 0.5      | CRITICAL | None        |
| Update 3 composables (Coach/Interaction/Links) | 3        | HIGH     | Migrations  |
| Build 3 UI components                          | 7        | HIGH     | Composables |
| Create 3 API endpoints                         | 4        | MEDIUM   | Composables |
| Write & run tests                              | 8        | MEDIUM   | All above   |
| **Total Remaining**                            | **22.5** | —        | —           |
| **Grand Total Session**                        | **~30**  | —        | —           |

---

## ✅ Final Checklist Before Starting Next Session

- [ ] Read `FAMILY_UNITS_IMPLEMENTATION_STATUS.md` for context
- [ ] Read `FAMILY_UNITS_MIGRATION.md` before applying migrations
- [ ] Apply migrations in staging FIRST
- [ ] Verify migration validation output (100% backfill)
- [ ] Regenerate types: `npx supabase gen types typescript --local > types/database.ts`
- [ ] Run `npm run type-check` and `npm run lint`
- [ ] Start with updateCoaches.ts (simplest)
- [ ] Then updateInteractions.ts (add student check)
- [ ] Then updateAccountLinks.ts (family creation - most complex)
- [ ] Build UI components
- [ ] Test thoroughly before merging

---

## 🎯 Success Criteria (End State)

**When this is complete:**

- ✓ Parents can switch between kids in UI
- ✓ Parents see all schools/coaches of each kid
- ✓ Students can't see family selection UI
- ✓ Students create interactions, parents cannot
- ✓ Private notes are truly private
- ✓ Shared notes visible to family
- ✓ All tests passing
- ✓ Zero type errors
- ✓ Zero lint warnings
- ✓ Query performance < 200ms
