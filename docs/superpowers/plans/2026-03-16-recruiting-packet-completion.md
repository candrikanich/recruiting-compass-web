# Recruiting Packet Feature — Completion Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken recruiting packet feature so that generated packets contain real athlete data from the database, and add the two missing data fields (video links, core courses) needed to fulfill the original user story.

**Architecture:** The composable `useRecruitingPacket` currently queries non-existent `user_profiles`/`athlete_profiles` tables. Fix it to read from `usePreferenceManager` (which reads `user_preferences` category=`player`) and `userStore`. Then add `video_links` and `core_courses` to `PlayerDetails` (stored in `user_preferences` JSON automatically) and add UI for them in the Player Details settings page.

**Tech Stack:** Vue 3 / Nuxt 4, TypeScript strict, Supabase (via `usePreferenceManager`), Vitest (unit tests), Playwright (E2E)

---

## Current State Summary

### What works
- Dashboard widget renders Generate/Email buttons
- Email modal UI (`EmailRecruitingPacketModal.vue`)
- Email API endpoint (`server/api/recruiting-packet/email.post.ts`) — auth, rate limiting, Resend integration
- HTML export template (`utils/recruitingPacketExport.ts`) — cover page, athlete profile, schools, activity

### What is broken / missing

| Issue | Severity | Root Cause |
|---|---|---|
| `fetchAthleteData()` queries `user_profiles` + `athlete_profiles` — tables that do not exist | **Critical** | Athlete info never loads; packet generates with blank/fallback data |
| Social media mapping: composable expects `[{platform, handle}]` array; DB stores flat fields | **High** | No social links appear in packet |
| Height/weight formatting: stored as integers (`height_inches`, `weight_lbs`), need display strings | **High** | Raw numbers or blank shown |
| `fitScore` column in schools table still referenced — removed by migration `20260315000003` | **Medium** | Conditional column logic is dead code / confusing |
| `video_links` field missing from `PlayerDetails` type, DB (user_preferences JSON), and UI | **Medium** | User story 10.1 requires Hudl/YouTube/Vimeo links in packet |
| `core_courses` field missing from `PlayerDetails` type, DB, and UI | **Medium** | User story 10.1 requires core courses in packet |
| Default email body hardcodes "Baseball Player" regardless of athlete's sport | **Low** | User's configured `primary_sport` not used |

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `composables/useRecruitingPacket.ts` | **Modify** | Fix `fetchAthleteData()` — remove broken table queries; read from `usePreferenceManager` + `userStore`; fix height/weight formatting; fix social media mapping |
| `utils/recruitingPacketExport.ts` | **Modify** | Remove dead `fitScore` column; update `AthletePacketData` to match what we now send |
| `types/models.ts` | **Modify** | Add `video_links` and `core_courses` to `PlayerDetails` |
| `pages/settings/player-details.vue` | **Modify** | Add Video Links section (under Athletics tab) and Core Courses section (under Academics tab) |
| `tests/unit/composables/useRecruitingPacket.spec.ts` | **Modify** | Update mocks to match new data source; add tests for height/weight formatting and social mapping |
| `tests/unit/utils/recruitingPacketExport.spec.ts` | **Modify** | Remove fitScore tests; add tests for video links and core courses rendering |

---

## Chunk 1: Fix Core Data Pipeline

### Task 1: Fix `fetchAthleteData()` — the critical bug

**Context:** `useRecruitingPacket` calls `.from("user_profiles").select("*, athletes:athlete_profiles(*)")` — these tables don't exist in the DB (not in `types/database.ts`). The correct data source is `usePreferenceManager()` which reads `user_preferences` with `category = "player"`. The composable already calls `useUserStore`, `useSchools`, `useCoaches`, `useInteractions` at the top — add `usePreferenceManager` the same way.

**Files:**
- Modify: `composables/useRecruitingPacket.ts`
- Modify: `tests/unit/composables/useRecruitingPacket.spec.ts`

**What the data shape looks like after the fix:**
```typescript
// From userStore.user (User type in types/models.ts):
// { id, email, full_name, profile_photo_url, phone, gpa, sat_score, graduation_year, ... }

// From usePreferenceManager().getPlayerDetails() (PlayerDetails type):
// { height_inches, weight_lbs, positions[], school_name, graduation_year, gpa, sat_score, act_score,
//   twitter_handle, instagram_handle, tiktok_handle, ... }
```

**Height formatting helper** (add at top of composable, near other helpers):
```typescript
const formatHeight = (inches: number | undefined): string | undefined => {
  if (!inches) return undefined;
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return remainingInches > 0 ? `${feet}'${remainingInches}"` : `${feet}'0"`;
};
```

**Social media mapping** (flat → array format the export util expects):
```typescript
const buildSocialMedia = (details: PlayerDetails | null) => {
  const links: Array<{ platform: "instagram" | "twitter" | "tiktok"; handle: string }> = [];
  if (details?.instagram_handle) links.push({ platform: "instagram", handle: details.instagram_handle });
  if (details?.twitter_handle) links.push({ platform: "twitter", handle: details.twitter_handle });
  if (details?.tiktok_handle) links.push({ platform: "tiktok", handle: details.tiktok_handle });
  return links;
};
```

**New `fetchAthleteData()` implementation:**
```typescript
const fetchAthleteData = async (): Promise<AthletePacketData> => {
  if (!userStore.user) throw new Error("No user logged in");

  // Load preferences explicitly — composable may be called before the player-details
  // page has been visited, so preferences might not be loaded yet.
  await playerPrefs.loadPreferences();
  const details = getPlayerDetails();

  const position = details?.positions?.[0] ?? details?.primary_position;

  return {
    id: userStore.user.id,
    email: userStore.user.email,
    full_name: userStore.user.full_name || "Athlete",
    profile_photo_url: userStore.user.profile_photo_url,
    height: formatHeight(details?.height_inches),
    weight: details?.weight_lbs ? `${details.weight_lbs} lbs` : undefined,
    position,
    high_school: details?.school_name ?? details?.high_school,
    school_name: details?.school_name,
    graduation_year: details?.graduation_year,
    gpa: details?.gpa,
    sat_score: details?.sat_score,
    act_score: details?.act_score,
    video_links: details?.video_links ?? [],
    social_media: buildSocialMedia(details),
    core_courses: details?.core_courses ?? [],
  };
};
```

**Where to get `playerPrefs` and `getPlayerDetails`:**
```typescript
// Near the top of useRecruitingPacket(), alongside other composable calls:
const { playerPrefs, getPlayerDetails } = usePreferenceManager();
// Note: usePreferenceManager initializes playerPrefs = useUserPreferencesV2("player")
// and exposes getPlayerDetails() — check composable exports to confirm these names
```

> **Note for implementer:** Open `composables/usePreferenceManager.ts` and verify what is returned from the function. `playerPrefs` may or may not be exported — if not, call `loadPreferences()` by fetching the user_preferences directly via Supabase with `category = 'player'`, then parse with `validatePlayerDetails()` from `utils/preferenceValidation.ts`.

- [ ] **Step 1a: Write failing test for `fetchAthleteData` using correct mocks**

In `tests/unit/composables/useRecruitingPacket.spec.ts`, replace the existing Supabase mock (which mocks `user_profiles`) with a mock of `usePreferenceManager`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useRecruitingPacket } from "~/composables/useRecruitingPacket";
import { useUserStore } from "~/stores/user";
import { useSchools } from "~/composables/useSchools";
import { useCoaches } from "~/composables/useCoaches";
import { useInteractions } from "~/composables/useInteractions";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useNuxtApp } from "#app";
import type { PlayerDetails } from "~/types/models";

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: vi.fn() }),
}));
vi.mock("~/stores/user");
vi.mock("~/composables/useSchools");
vi.mock("~/composables/useCoaches");
vi.mock("~/composables/useInteractions");
vi.mock("~/composables/usePreferenceManager");

const mockPlayerDetails: PlayerDetails = {
  height_inches: 74,   // 6'2"
  weight_lbs: 190,
  positions: ["Pitcher"],
  school_name: "Central High",
  graduation_year: 2025,
  gpa: 3.8,
  sat_score: 1450,
  act_score: 33,
  twitter_handle: "jsmith",
  instagram_handle: "johnsmith",
  tiktok_handle: "",
  video_links: [{ platform: "hudl", url: "https://hudl.com/v/123", title: "Highlights" }],
  core_courses: ["AP Chemistry", "AP Calculus"],
};

describe("useRecruitingPacket - fetchAthleteData", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useUserStore).mockReturnValue({
      user: {
        id: "user-1",
        email: "john@example.com",
        full_name: "John Smith",
        profile_photo_url: null,
      },
    } as any);

    vi.mocked(usePreferenceManager).mockReturnValue({
      playerPrefs: { loadPreferences: vi.fn().mockResolvedValue(undefined) },
      getPlayerDetails: vi.fn().mockReturnValue(mockPlayerDetails),
    } as any);

    vi.mocked(useSchools).mockReturnValue({ schools: { value: [] } } as any);
    vi.mocked(useCoaches).mockReturnValue({ coaches: { value: [] } } as any);
    vi.mocked(useInteractions).mockReturnValue({ interactions: { value: [] } } as any);
  });

  it("formats height from inches to feet/inches string", async () => {
    const { generatePacket } = useRecruitingPacket();
    const result = await generatePacket();
    expect(result.data.athlete.height).toBe("6'2\"");
  });

  it("formats weight with lbs suffix", async () => {
    const { generatePacket } = useRecruitingPacket();
    const result = await generatePacket();
    expect(result.data.athlete.weight).toBe("190 lbs");
  });

  it("maps social media flat fields to platform array", async () => {
    const { generatePacket } = useRecruitingPacket();
    const result = await generatePacket();
    expect(result.data.athlete.social_media).toContainEqual({ platform: "twitter", handle: "jsmith" });
    expect(result.data.athlete.social_media).toContainEqual({ platform: "instagram", handle: "johnsmith" });
    // empty tiktok_handle should be excluded
    expect(result.data.athlete.social_media).not.toContainEqual(expect.objectContaining({ platform: "tiktok" }));
  });

  it("passes video_links from PlayerDetails to packet data", async () => {
    const { generatePacket } = useRecruitingPacket();
    const result = await generatePacket();
    expect(result.data.athlete.video_links).toHaveLength(1);
    expect(result.data.athlete.video_links![0].platform).toBe("hudl");
  });

  it("passes core_courses from PlayerDetails to packet data", async () => {
    const { generatePacket } = useRecruitingPacket();
    const result = await generatePacket();
    expect(result.data.athlete.core_courses).toEqual(["AP Chemistry", "AP Calculus"]);
  });

  it("uses first position from positions array", async () => {
    const { generatePacket } = useRecruitingPacket();
    const result = await generatePacket();
    expect(result.data.athlete.position).toBe("Pitcher");
  });
});
```

- [ ] **Step 1b: Run test to confirm it fails**

```bash
cd /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-web
npm test -- tests/unit/composables/useRecruitingPacket.spec.ts
```

Expected: FAIL (composable still uses old Supabase table query)

- [ ] **Step 1c: Implement the fix in `useRecruitingPacket.ts`**

1. Remove `import { useSupabase } from "./useSupabase"` (no longer needed in this composable)
2. Add `import { usePreferenceManager } from "./usePreferenceManager"`
3. Inside the composable function, add:
   ```typescript
   const { playerPrefs, getPlayerDetails } = usePreferenceManager();
   ```
4. Add `formatHeight` and `buildSocialMedia` helpers (code above)
5. Replace `fetchAthleteData` with the new implementation (code above)
6. In `getDefaultEmailBody()`, replace the hardcoded sport:
   ```typescript
   // Before:
   const position = generatedData.value?.athlete.position || "Baseball Player";
   // After:
   const position = generatedData.value?.athlete.position || "Athlete";
   ```

> **Important:** If `playerPrefs` is not exported from `usePreferenceManager`, read `composables/usePreferenceManager.ts` — it calls `useUserPreferencesV2("player")` internally. You can either: (a) export `playerPrefs` from `usePreferenceManager`, or (b) call `useUserPreferencesV2("player")` directly inside `useRecruitingPacket` and call `loadPreferences()` on it, then pass the result to `validatePlayerDetails()`.

- [ ] **Step 1d: Run tests to confirm they pass**

```bash
npm test -- tests/unit/composables/useRecruitingPacket.spec.ts
```

Expected: All tests PASS

- [ ] **Step 1e: Run full test suite to catch regressions**

```bash
npm test
```

Expected: No new failures

- [ ] **Step 1f: Commit**

```bash
git add composables/useRecruitingPacket.ts tests/unit/composables/useRecruitingPacket.spec.ts
git commit -m "fix: read recruiting packet athlete data from user_preferences instead of non-existent tables"
```

---

### Task 2: Remove dead `fitScore` column from packet export

**Context:** Migration `20260315000003_remove_fit_score_from_schools.sql` removed `fit_score` from the `schools` table. The export util in `utils/recruitingPacketExport.ts` still conditionally renders a `fitScore` column in the schools table (`${tier.some((s) => s.fitScore) ? "<th>Fit Score</th>" : ""}`). Since `fitScore` never populates, this is dead code that should be removed for cleanliness. Also, the `SchoolPacketData` interface still has `fitScore?: number` — leave it typed but stop rendering it.

**Files:**
- Modify: `utils/recruitingPacketExport.ts`
- Modify: `tests/unit/utils/recruitingPacketExport.spec.ts`

- [ ] **Step 2a: Read the test file to understand what's being tested**

```bash
cat tests/unit/utils/recruitingPacketExport.spec.ts
```

- [ ] **Step 2b: Add a test asserting fitScore column is NOT rendered**

In `tests/unit/utils/recruitingPacketExport.spec.ts`, add:

```typescript
it("does not render a fit score column in the schools table", () => {
  const data: RecruitingPacketData = {
    athlete: { id: "a1", email: "a@b.com", full_name: "Test Athlete" },
    schools: {
      tier_a: [{ id: "s1", name: "Test U", location: "CO", division: "D1", conference: "Pac-12", status: "recruited", fitScore: 85 }],
      tier_b: [],
      tier_c: [],
    },
    activitySummary: { totalSchools: 1, totalInteractions: 0, interactionBreakdown: { emails: 0, calls: 0, camps: 0, visits: 0, other: 0 } },
  };
  const html = generateRecruitingPacketHTML(data);
  expect(html).not.toContain("Fit Score");
});
```

- [ ] **Step 2c: Run test to confirm it fails**

```bash
npm test -- tests/unit/utils/recruitingPacketExport.spec.ts
```

Expected: FAIL (Fit Score column is currently rendered when `fitScore` is provided)

- [ ] **Step 2d: Remove fitScore column from `renderSchoolTier` in `recruitingPacketExport.ts`**

In `utils/recruitingPacketExport.ts`, in the `renderSchoolTier` function:

```typescript
// REMOVE this line from <thead>:
${tier.some((s) => s.fitScore) ? "<th>Fit Score</th>" : ""}

// REMOVE this line from each <tr>:
${school.fitScore ? `<td>${school.fitScore}%</td>` : ""}
```

- [ ] **Step 2e: Run tests to confirm pass**

```bash
npm test -- tests/unit/utils/recruitingPacketExport.spec.ts
```

- [ ] **Step 2f: Commit**

```bash
git add utils/recruitingPacketExport.ts tests/unit/utils/recruitingPacketExport.spec.ts
git commit -m "fix: remove fitScore column from recruiting packet schools table (removed from DB)"
```

---

## Chunk 2: Add Missing Data Fields

### Task 3: Add `video_links` and `core_courses` to `PlayerDetails` type

**Context:** `VideoLink` and `SocialMediaHandle` types already exist in `utils/recruitingPacketExport.ts`. Import them into `types/models.ts` or duplicate the `VideoLink` type inline. The data is stored in `user_preferences` JSON blob automatically when `setPlayerDetails()` is called — no migration needed.

**Files:**
- Modify: `types/models.ts`

- [ ] **Step 3a: Add the types**

In `types/models.ts`, inside the `PlayerDetails` interface (after the social media fields):

```typescript
export interface VideoLink {
  platform: "hudl" | "youtube" | "vimeo";
  url: string;
  title?: string;
}

// In PlayerDetails interface, add:
video_links?: VideoLink[];
core_courses?: string[];
```

> **Note:** `VideoLink` is also defined in `utils/recruitingPacketExport.ts`. To avoid duplication, either:
> (a) Import `VideoLink` from `recruitingPacketExport.ts` into `models.ts` (risk of circular imports — check first), or
> (b) Define `VideoLink` in `types/models.ts` and import it into `recruitingPacketExport.ts`.
> Prefer option (b): move the type to `types/models.ts` and update the import in `recruitingPacketExport.ts`.

- [ ] **Step 3b: Update import in `recruitingPacketExport.ts`**

```typescript
// Add VideoLink import from models:
import type { VideoLink } from "~/types/models";
// Remove the local VideoLink interface definition
```

- [ ] **Step 3c: Run type check**

```bash
npm run type-check
```

Expected: Clean (0 errors)

- [ ] **Step 3d: Commit**

```bash
git add types/models.ts utils/recruitingPacketExport.ts
git commit -m "feat: add video_links and core_courses to PlayerDetails type"
```

---

### Task 4: Add Video Links UI to Player Details settings page

**Context:** The player-details page (`pages/settings/player-details.vue`) has an "Athletics" tab. Add a "Video Links" section there with add/remove functionality for Hudl, YouTube, and Vimeo links. Saving uses the existing `setPlayerDetails()` pattern already used throughout the page.

**Files:**
- Modify: `pages/settings/player-details.vue`

The page already handles auto-save via `triggerSave`. Add video_links to the form state and include it when calling `setPlayerDetails`.

- [ ] **Step 4a: Add `video_links` to the form state**

Find the `const form = ref({` block in the `<script setup>` section. Add:

```typescript
video_links: [] as VideoLink[],
```

Import `VideoLink` from `~/types/models` at the top.

- [ ] **Step 4b: Populate `video_links` from player details on mount**

Find where `playerDetails` is loaded (around line 684 where `initializeHeight` is called). Add:

```typescript
form.value.video_links = playerDetails.video_links ?? [];
```

- [ ] **Step 4c: Include `video_links` in the `triggerSave` payload**

Find where `setPlayerDetails` is called (likely in a `save` or `triggerSave` function). Add `video_links: form.value.video_links` to the payload.

- [ ] **Step 4d: Add Video Links section to the Athletics tab template**

In the Athletics tab (`v-show="currentTab === 'athletics'"`), after the existing social media section, add:

```html
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
        v-model="link.platform"
        :disabled="isParentRole"
        @change="triggerSave"
        class="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
      >
        <option value="hudl">Hudl</option>
        <option value="youtube">YouTube</option>
        <option value="vimeo">Vimeo</option>
      </select>
      <input
        v-model="link.url"
        :disabled="isParentRole"
        type="url"
        placeholder="https://..."
        @blur="triggerSave"
        class="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
      />
      <input
        v-model="link.title"
        :disabled="isParentRole"
        type="text"
        placeholder="Title (optional)"
        @blur="triggerSave"
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
      v-if="!isParentRole && form.video_links.length < 5"
      @click="addVideoLink"
      type="button"
      class="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 py-2"
    >
      <PlusIcon class="w-4 h-4" />
      Add Video Link
    </button>
    <p v-if="form.video_links.length >= 5" class="text-xs text-slate-500">Maximum 5 video links.</p>
  </div>
</div>
```

- [ ] **Step 4e: Add the `addVideoLink` and `removeVideoLink` methods**

```typescript
const addVideoLink = () => {
  form.value.video_links.push({ platform: "hudl", url: "", title: "" });
};

const removeVideoLink = (idx: number) => {
  form.value.video_links.splice(idx, 1);
  triggerSave();
};
```

- [ ] **Step 4f: Add `XMarkIcon` and `PlusIcon` to icon imports**

In the existing icon import block (around line 491):

```typescript
import {
  // ... existing icons ...
  XMarkIcon,
  PlusIcon,
} from "@heroicons/vue/24/outline";
```

- [ ] **Step 4g: Run type-check**

```bash
npm run type-check
```

Expected: Clean

- [ ] **Step 4h: Manual verification**

```bash
npm run dev
```

Navigate to `/settings/player-details` → Athletics tab → verify the Video Links section renders, add/remove works, and auto-saves.

- [ ] **Step 4i: Commit**

```bash
git add pages/settings/player-details.vue
git commit -m "feat: add video links section to player details athletics tab"
```

---

### Task 5: Add Core Courses UI to Player Details academics tab

**Context:** Core courses are a simple list of strings (course names). Add them to the Academics tab with an add/remove tag-style UI. Saved via the existing `setPlayerDetails` pattern.

**Files:**
- Modify: `pages/settings/player-details.vue`

- [ ] **Step 5a: Add `core_courses` to form state**

```typescript
core_courses: [] as string[],
```

- [ ] **Step 5b: Populate on mount**

```typescript
form.value.core_courses = playerDetails.core_courses ?? [];
```

- [ ] **Step 5c: Include in save payload**

Add `core_courses: form.value.core_courses` to the `setPlayerDetails` call.

- [ ] **Step 5d: Add Core Courses section to Academics tab template**

Find the Academics tab (`v-show="currentTab === 'academics'"`). Add after the existing academic scores:

```html
<!-- Core Courses -->
<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
  <div class="p-5 border-b border-slate-100 bg-slate-50/50">
    <h2 class="text-base font-bold text-slate-900">Core Courses</h2>
    <p class="text-xs text-slate-500 font-medium">AP, honors, or notable courses recruiters should know about.</p>
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
        >
          <XMarkIcon class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <div v-if="!isParentRole && form.core_courses.length < 20" class="flex gap-2">
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
  </div>
</div>
```

- [ ] **Step 5e: Add methods and state for core courses**

```typescript
const newCourseInput = ref("");

const addCourse = () => {
  const trimmed = newCourseInput.value.trim();
  if (!trimmed || form.value.core_courses.includes(trimmed)) return;
  form.value.core_courses.push(trimmed);
  newCourseInput.value = "";
  triggerSave();
};

const removeCourse = (idx: number) => {
  form.value.core_courses.splice(idx, 1);
  triggerSave();
};
```

- [ ] **Step 5f: Run type-check**

```bash
npm run type-check
```

- [ ] **Step 5g: Manual verification**

```bash
npm run dev
```

Navigate to `/settings/player-details` → Academics tab → verify Core Courses section renders, add/remove works (press Enter or click Add), saves correctly.

- [ ] **Step 5h: Commit**

```bash
git add pages/settings/player-details.vue
git commit -m "feat: add core courses section to player details academics tab"
```

---

## Chunk 3: Verification and Tests

### Task 6: Verify full recruiting packet flow end-to-end

**Goal:** Confirm the full packet generation flow works with real data. Run existing E2E tests and verify manually.

- [ ] **Step 6a: Run existing E2E tests**

```bash
npm run test:e2e -- tests/e2e/recruiting-packet.spec.ts
```

Note which tests pass and which fail. E2E tests require auth — if running without a seeded user, some tests may be skipped or need a test account.

- [ ] **Step 6b: Run full unit test suite**

```bash
npm run test
```

Expected: All tests pass (no regressions from Tasks 1–5)

- [ ] **Step 6c: Run type-check and lint**

```bash
npm run type-check && npm run lint
```

Expected: Clean

- [ ] **Step 6d: Manual smoke test**

```bash
npm run dev
```

1. Log in as an athlete with data filled in at `/settings/player-details`
2. Navigate to `/dashboard`
3. Click **Generate Packet** — confirm popup opens with:
   - Correct athlete name, photo, height/weight, position
   - Social media links (not empty)
   - School list (with correct tier grouping)
   - Activity summary (counts correct)
   - No "Fit Score" column
4. Click **Email to Coach** — confirm modal opens with coach list pre-populated
5. Test the email send flow with a real or test email

- [ ] **Step 6e: Final commit (if any last cleanup)**

```bash
git add .
git commit -m "feat: complete recruiting packet feature — real athlete data, video links, core courses"
```

---

## Unresolved Questions

1. **`usePreferenceManager` exports:** Does `usePreferenceManager` export `playerPrefs` directly, or does it only expose `getPlayerDetails()`? Open the file and check line ~400 (the return object). If `playerPrefs` is not exported, you'll need to call `useUserPreferencesV2("player")` directly inside `useRecruitingPacket` to get the `loadPreferences` method.

2. **PDF vs HTML attachment:** The email endpoint sends an HTML blob named `.pdf`. This is misleading — coaches will receive a file named `John_Smith_RecruitingPacket.pdf` that is actually an HTML file. True PDF generation requires a headless browser or a service like Browserless. For now this is acceptable, but should be tracked as tech debt. Consider renaming the extension to `.html` until real PDF is implemented.

3. **Video link UI in existing tabs vs new tab:** The plan places video links in the Athletics tab, but if the Athletics tab is getting long, consider a dedicated "Media" tab. Review the current Athletics tab length before implementing.

4. **Sport-aware email body:** The default body uses `generatedData.value?.athlete.position` as the sport description. If `primary_sport` is added to `PlayerDetails` (currently it IS in PlayerDetails), use it in the email body instead:
   ```typescript
   const sport = generatedData.value?.athlete.primary_sport || "baseball";
   ```
   But `AthletePacketData` doesn't currently include `primary_sport`. Should it? Check the user story — the email body mentions "collegiate baseball opportunities" which suggests sport-specific text.
