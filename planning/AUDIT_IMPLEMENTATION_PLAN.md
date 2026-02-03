# Audit Implementation Plan

## The Recruiting Compass — Complete Fix Roadmap

**Created**: February 2, 2026
**Audit Baseline**: Captured at 3 breakpoints (desktop, tablet, mobile)
**Total Estimated Effort**: 30-40 hours across 3 phases
**Success Criteria**: All issues resolved, visual regression testing passed

---

## Overview

This plan consolidates all findings from the MVP audit (Performance, Accessibility, SEO, Code Quality) into a structured roadmap with:

- Specific actionable tasks
- Estimated effort per task
- Dependency relationships
- Success verification steps
- Code examples where applicable

**Phases:**

- **Phase 1 (Week 1)**: Critical quick wins (2-3 hours) - High impact
- **Phase 2 (Week 2-3)**: Major improvements (5-8 hours) - Medium effort
- **Phase 3 (Month 2)**: Long-term refactoring (20-30 hours) - Ongoing

---

## Phase 1: Critical Quick Wins (Week 1)

**Time: 2-3 hours | Impact: HIGH | Dependencies: None**

### Goal

Implement immediately fixable issues with maximum search visibility and accessibility impact.

---

### 1.1 SEO: Add Page Titles

**Effort**: 15 minutes | **Priority**: CRITICAL | **Impact**: Massive SEO improvement
**Files to modify**: All pages

**Current state**: All page `<title>` tags are empty (blank)

**Task**:
Add unique, descriptive titles to each page using Vue's `definePageMeta`:

```typescript
// pages/dashboard/index.vue
definePageMeta({
  title: "Dashboard - The Recruiting Compass",
});

// pages/coaches/index.vue
definePageMeta({
  title: "Coaches - Manage & Track Coach Communications",
});

// pages/schools/index.vue
definePageMeta({
  title: "Schools - Build Your College Recruiting List",
});

// pages/interactions/index.vue
definePageMeta({
  title: "Interactions - Log Coach & School Conversations",
});
```

**Guidelines**:

- Keep titles <60 characters
- Include primary keyword (app name or page topic)
- Make each title unique
- Include action verbs where possible ("Manage", "Track", "Build")

**Verification**:

- [ ] Open each page in browser
- [ ] Check DevTools → Elements → `<title>` tag is populated
- [ ] Title is displayed in browser tab
- [ ] Title appears in search results preview (use Google Search Console)

**Success metrics**:

- 4/4 MVP pages have non-empty titles
- Titles follow 60-character guideline
- No duplicate titles

---

### 1.2 SEO: Add Meta Descriptions

**Effort**: 20 minutes | **Priority**: CRITICAL | **Impact**: Improves search CTR

**Current state**: Zero meta description tags on any page

**Task**:
Add unique meta descriptions using `definePageMeta`:

```typescript
// pages/dashboard/index.vue
definePageMeta({
  title: "Dashboard - The Recruiting Compass",
  description:
    "Track coaches, schools, interactions, and offers in one place. Monitor your college recruiting pipeline.",
});

// pages/coaches/index.vue
definePageMeta({
  title: "Coaches - Manage & Track Coach Communications",
  description:
    "Search, filter, and manage coaches by role, last contact, and responsiveness. Track all recruiting interactions.",
});

// pages/schools/index.vue
definePageMeta({
  title: "Schools - Build Your College Recruiting List",
  description:
    "Discover colleges that match your profile. Filter by division, status, distance, and fit score.",
});

// pages/interactions/index.vue
definePageMeta({
  title: "Interactions - Log Coach & School Conversations",
  description:
    "Log emails, calls, texts, and in-person visits with coaches. Track sentiment and follow-ups.",
});
```

**Guidelines**:

- Keep descriptions 150-160 characters
- Include primary keywords naturally
- Make them compelling (they appear in search results)
- Each should be unique
- Include a call-to-action or benefit

**Verification**:

- [ ] Check DevTools → Elements → `<meta name="description">`
- [ ] Verify each page has a unique description
- [ ] Test length (copy to character counter: 150-160 chars)
- [ ] Check Google Search Console preview

**Success metrics**:

- 4/4 MVP pages have meta descriptions
- Each description 150-160 characters
- No duplicates

---

### 1.3 SEO: Create robots.txt

**Effort**: 10 minutes | **Priority**: CRITICAL | **Impact**: Guides search engine crawling

**Current state**: 404 when accessing `/robots.txt`

**Task**:
Create `/public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /login
Disallow: /signup
Disallow: /reset-password
Disallow: /verify-email

Sitemap: https://qa.myrecruitingcompass.com/sitemap.xml
```

**Verification**:

- [ ] File exists at `/public/robots.txt`
- [ ] Navigate to `https://qa.myrecruitingcompass.com/robots.txt` → Returns file contents
- [ ] No 404 errors
- [ ] Blocks sensitive paths (admin, api, auth)

**Success metrics**:

- robots.txt accessible via HTTP
- Correct allow/disallow rules
- Sitemap URL included

---

### 1.4 SEO: Add Language Attribute

**Effort**: 5 minutes | **Priority**: HIGH | **Impact**: Helps search engines understand page language

**Current state**: `<html>` tag has no `lang` attribute

**Task**:
Update `nuxt.config.ts` or `app.vue`:

```typescript
// In nuxt.config.ts or app.vue
app: {
  head: {
    htmlAttrs: {
      lang: "en";
    }
  }
}
```

Or if using `app.vue` directly:

```html
<template>
  <div>
    <!-- content -->
  </div>
</template>

<script setup>
  useHead({
    htmlAttrs: {
      lang: "en",
    },
  });
</script>
```

**Verification**:

- [ ] View page source
- [ ] Confirm `<html lang="en">` at top

**Success metrics**:

- `<html>` tag has `lang="en"` attribute

---

### 1.5 Accessibility: Fix Navigation Link Contrast

**Effort**: 10 minutes | **Priority**: CRITICAL | **Impact**: WCAG 2.1 AA requirement

**Current state**: Navigation links have 2.77:1 contrast ratio (need 4.5:1)

**Files**: `components/Navbar.vue`

**Task**:
Identify navigation link color and increase contrast. Options:

**Option A: Darken text color**

```vue
<!-- Before -->
<style scoped>
.nav-link {
  color: #5b6b7e; /* Light gray - 2.77:1 */
}
</style>

<!-- After -->
<style scoped>
.nav-link {
  color: #2d3748; /* Darker gray - 4.5:1+ */
}
</style>
```

**Option B: Lighten background**

```vue
<style scoped>
.nav-link {
  color: #5b6b7e; /* Keep as is */
  background: #f7fafc; /* Lighter background */
}
</style>
```

**Verification**:

- [ ] Use browser accessibility inspector
- [ ] Check contrast ratio (should be ≥4.5:1)
- [ ] Visually confirm text is readable
- [ ] Test on both light and dark backgrounds
- [ ] Use WebAIM contrast checker: https://webaim.org/resources/contrastchecker/

**Success metrics**:

- Contrast ratio ≥4.5:1 for all nav links
- No visual regression (still looks professional)

---

### 1.6 Accessibility: Add aria-labels to Icon Buttons

**Effort**: 10 minutes | **Priority**: CRITICAL | **Impact**: Screen reader users can understand buttons

**Current state**: 2 icon buttons (notification bell, menu) have no accessible names

**Files**: `components/Navbar.vue`

**Task**:
Add `aria-label` attributes:

```vue
<!-- Before -->
<button class="notification-btn">
  <BellIcon />
</button>

<!-- After -->
<button class="notification-btn" aria-label="View notifications">
  <BellIcon />
</button>

<!-- Menu button -->
<!-- Before -->
<button class="menu-btn">
  <ChevronIcon />
</button>

<!-- After -->
<button class="menu-btn" aria-label="Open navigation menu">
  <ChevronIcon />
</button>
```

**Verification**:

- [ ] Use browser accessibility inspector
- [ ] Check that buttons have accessible names
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Verify announcement matches intent

**Success metrics**:

- Both icon buttons have aria-label attributes
- Labels are descriptive (not "button" or "icon")

---

### 1.7 Accessibility: Add Labels to Form Inputs

**Effort**: 30-45 minutes | **Priority**: CRITICAL | **Impact**: Screen readers can identify input purposes

**Current state**: 10+ form inputs across 3 pages have no associated labels

**Pages affected**:

- Schools page: 7 inputs (search, fit score, distance, division, status, state, favorites, tier, sort)
- Coaches page: 5 inputs (search, role, last contact, responsiveness, sort)
- Interactions page: 5 inputs (search, type, direction, sentiment, time period)

**Task**:
For each input, either:

1. Add visible `<label>` element + `for` attribute, or
2. Add `aria-label` for hidden labels

**Example (visible label)**:

```vue
<!-- Schools page search -->
<div class="form-group">
  <label for="school-search">Find Schools</label>
  <input
    id="school-search"
    type="text"
    placeholder="Search by name or location..."
  />
</div>
```

**Example (hidden label with aria-label)**:

```vue
<!-- If you want label only for screen readers -->
<input
  id="fit-score-min"
  type="range"
  min="0"
  max="100"
  aria-label="Minimum fit score"
/>
```

**Breakdown by page**:

**Schools page (7 inputs)**:

- Search input → `<label>` or aria-label
- Fit Score min slider → aria-label="Minimum fit score"
- Fit Score max slider → aria-label="Maximum fit score"
- Distance slider → aria-label="Maximum distance"
- Division dropdown → `<label>` or aria-label
- Status dropdown → `<label>` or aria-label
- State dropdown → `<label>` or aria-label
- Favorites dropdown → `<label>` or aria-label
- Tier dropdown → `<label>` or aria-label
- Sort dropdown → `<label>` or aria-label

**Coaches page (5 inputs)**:

- Search input → `<label>` or aria-label
- Role dropdown → `<label>` or aria-label
- Last Contact dropdown → `<label>` or aria-label
- Responsiveness dropdown → `<label>` or aria-label
- Sort By dropdown → `<label>` or aria-label

**Interactions page (5 inputs)**:

- Search input → `<label>` or aria-label
- Type dropdown → `<label>` or aria-label
- Direction dropdown → `<label>` or aria-label
- Sentiment dropdown → `<label>` or aria-label
- Time Period dropdown → `<label>` or aria-label

**Verification**:

- [ ] Use accessibility inspector
- [ ] Verify all inputs have associated labels
- [ ] Test with screen reader
- [ ] Check that labels are descriptive
- [ ] Ensure `for` attribute matches input `id`

**Success metrics**:

- 17+ inputs across 3 pages have labels
- No unlabeled form inputs remain
- Screen reader announces purpose of each input

---

### 1.8 Security: Run npm audit fix

**Effort**: 5 minutes | **Priority**: HIGH | **Impact**: Fix jsPDF vulnerabilities

**Current state**: 2 security vulnerabilities in jsPDF (safe fix available)

**Task**:

```bash
npm audit fix
```

**Verification**:

- [ ] No errors during installation
- [ ] Run `npm audit` again
- [ ] Verify jsPDF vulnerabilities resolved
- [ ] Check that xlsx still has 2 vulnerabilities (no fix available)
- [ ] Run `npm run build` to ensure build still works

**Success metrics**:

- jsPDF vulnerabilities resolved
- Build completes without errors

---

### 1.9 Code Quality: Add .eslintignore for Build Artifacts

**Effort**: 5 minutes | **Priority**: MEDIUM | **Impact**: Cleaner linting output

**Current state**: 7,650 ESLint violations in `.vercel/output/` (generated minified build)

**Task**:
Create/update `.eslintignore`:

```
node_modules/
.nuxt/
dist/
.vercel/
build/
```

**Verification**:

- [ ] File `.eslintignore` exists in project root
- [ ] Run `npm run lint` → violations drop from 7,770 to ~120
- [ ] Focus remaining violations on source code only

**Success metrics**:

- Build artifacts excluded from linting
- ESLint output focuses on actionable violations

---

## Phase 1 Summary

| Task                       | Effort        | Priority | Status |
| -------------------------- | ------------- | -------- | ------ |
| 1.1 Add page titles        | 15 min        | CRITICAL | —      |
| 1.2 Add meta descriptions  | 20 min        | CRITICAL | —      |
| 1.3 Create robots.txt      | 10 min        | CRITICAL | —      |
| 1.4 Add language attribute | 5 min         | HIGH     | —      |
| 1.5 Fix nav contrast       | 10 min        | CRITICAL | —      |
| 1.6 Add aria-labels        | 10 min        | CRITICAL | —      |
| 1.7 Add form labels        | 30-45 min     | CRITICAL | —      |
| 1.8 Run npm audit fix      | 5 min         | HIGH     | —      |
| 1.9 Add .eslintignore      | 5 min         | MEDIUM   | —      |
| **TOTAL**                  | **2-3 hours** | —        | —      |

**Phase 1 Timeline**: 1 day
**Expected Impact**:

- ✅ SEO: Page titles + descriptions dramatically improve search visibility
- ✅ Accessibility: Critical WCAG violations resolved (contrast, labels)
- ✅ Security: jsPDF vulnerabilities patched
- ✅ Code: Cleaner linting output

---

## Phase 2: Major Improvements (Week 2-3)

**Time: 5-8 hours | Impact: MEDIUM | Dependencies: Phase 1 complete**

### Goal

Complete accessibility compliance, optimize performance quick wins, and improve code quality.

---

### 2.1 Accessibility: Add Page Title Tags

**Effort**: 20 minutes | **Priority**: HIGH | **Dependency**: 1.1 complete

**Current state**: All pages have empty `<title>` tags in HTML head

**Task**:
Ensure Nuxt is rendering page titles in `<head>` section. Add to each page:

```typescript
definePageMeta({
  title: "Dashboard - The Recruiting Compass",
});
```

And ensure Nuxt config includes:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  app: {
    head: {
      title: "The Recruiting Compass",
    },
  },
});
```

**Verification**:

- [ ] DevTools → Elements → Check `<head>` section
- [ ] `<title>` tag is populated on each page
- [ ] Title changes when navigating between pages

**Success metrics**:

- 4/4 MVP pages have non-empty `<title>` tags
- Titles are unique per page

---

### 2.2 Accessibility: Fix Heading Hierarchy

**Effort**: 1 hour | **Priority**: HIGH | **Dependency**: None

**Current state**: Heading hierarchy has skips (H1 → H3) breaking semantic structure

**Files affected**: Dashboard, Schools, Coaches (possibly others)

**Example from Dashboard**:

```html
<h1>Dashboard</h1>
<!-- Missing H2 here -->
<h3>Interaction Trends (30 Days)</h3>
<h3>School Pipeline</h3>
```

**Task**:
For each page, ensure proper heading hierarchy:

```html
<!-- Before -->
<h1>Dashboard</h1>
<h3>Interaction Trends (30 Days)</h3>
<h3>School Pipeline</h3>

<!-- After -->
<h1>Dashboard</h1>
<h2>Key Metrics</h2>
<h3>Interaction Trends (30 Days)</h3>
<h3>School Pipeline</h3>
<h2>Analytics</h2>
<h3>Performance Metrics</h3>
<h3>Recent Activity</h3>
```

**Pages to fix**:

- `pages/dashboard/index.vue`
- `pages/schools/index.vue`
- `pages/coaches/index.vue`
- `pages/interactions/index.vue`
- Any other pages with heading skips

**Verification**:

- [ ] Use accessibility inspector
- [ ] Verify H1 → H2 → H3 → ... hierarchy
- [ ] No heading skips
- [ ] Test with screen reader

**Success metrics**:

- No heading hierarchy violations
- Screen readers announce proper structure

---

### 2.3 Accessibility: Add aria-live Regions for Dynamic Content

**Effort**: 1 hour | **Priority**: HIGH | **Dependency**: None

**Current state**: Dynamic content loads without announcing changes to screen readers

**Pages affected**: All pages with loading spinners, data updates

**Examples**:

- "Loading coaches..." message
- Filter results update
- Data refresh

**Task**:
Add aria-live regions to announce dynamic content:

```vue
<!-- Loading state -->
<div
  v-if="loading"
  role="status"
  aria-live="polite"
  aria-label="Loading content"
>
  <span class="spinner"></span>
  Loading coaches...
</div>

<!-- Results update -->
<div role="status" aria-live="polite" aria-atomic="true">
  {{ coachCount }} coaches found
</div>

<!-- Error messages -->
<div v-if="error" role="alert" aria-live="assertive">
  {{ error }}
</div>
```

**Breakdown by page**:

**Coaches page**:

- "Loading coaches..." message
- "0 coaches found" message
- Results count update

**Schools page**:

- "0 results found" message
- Filter update announcements

**Interactions page**:

- "Loading interactions..." message
- Interaction count updates

**Verification**:

- [ ] Test with screen reader
- [ ] Verify announcements for: loading, results, errors
- [ ] aria-live="polite" for non-urgent (loading)
- [ ] aria-live="assertive" for urgent (errors)

**Success metrics**:

- All dynamic content changes announced
- Screen reader users notified of updates

---

### 2.4 Performance: Lazy-Load Leaflet Map Library

**Effort**: 30 minutes | **Priority**: MEDIUM | **Impact**: Save 15 KB CSS

**Current state**: Leaflet CSS (15 KB) loads on all pages, even when map is invisible

**Task**:
Only load Leaflet on pages that use it (e.g., school locations map):

```vue
<!-- Current: Leaflet always loaded -->
<!-- pages/dashboard/index.vue -->

<!-- After: Lazy load only when needed -->
<template>
  <div>
    <!-- ... other content ... -->
    <div v-if="showMap">
      <LazyMapComponent />
    </div>
  </div>
</template>

<script setup>
const showMap = ref(false);
</script>
```

Or use dynamic imports:

```typescript
const MapComponent = defineAsyncComponent(
  () => import("~/components/SchoolLocationMap.vue"),
);
```

**Verification**:

- [ ] Build and check bundle size
- [ ] Confirm Leaflet CSS not loaded on Dashboard/Coaches/Interactions
- [ ] Verify Leaflet loads when navigating to pages with maps
- [ ] Test map functionality still works

**Success metrics**:

- 15 KB CSS savings on non-map pages
- Map loads correctly on pages that need it

---

### 2.5 Performance: Purge Unused Tailwind CSS

**Effort**: 1 hour | **Priority**: MEDIUM | **Impact**: Save 20 KB

**Current state**: Tailwind CSS bundle includes all utilities (97 KB)

**Task**:
Configure Tailwind to purge unused classes:

```javascript
// tailwind.config.js
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./pages/**/*.{js,vue,ts}",
    "./composables/**/*.{js,vue,ts}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

And ensure build processes CSS:

```bash
npm run build
```

**Verification**:

- [ ] Build project: `npm run build`
- [ ] Check bundle size reduction
- [ ] Test all pages render correctly
- [ ] Verify no missing styles
- [ ] Use DevTools to inspect computed styles

**Success metrics**:

- CSS bundle reduced by 20-30 KB
- All pages display correctly
- No missing styles

---

### 2.6 Performance: Optimize Chunk Consolidation

**Effort**: 30 minutes | **Priority**: MEDIUM | **Impact**: Save 10 KB, reduce HTTP requests

**Current state**: 75+ JavaScript chunks with fragmentation

**Task**:
Configure Vite to consolidate smaller chunks:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep large vendors separate
          vue: ["vue"],
          supabase: ["@supabase/supabase-js"],
          chart: ["chart.js"],
          // Group smaller utils
          utils: ["./composables/useSupabase.ts", "./utils/validators.ts"],
        },
      },
    },
  },
});
```

**Verification**:

- [ ] Build project
- [ ] Check chunk count and sizes
- [ ] Verify total bundle size decreased
- [ ] Test page load performance
- [ ] Use DevTools Network tab

**Success metrics**:

- Chunk fragmentation reduced
- Total bundle size optimized
- Page load time improved

---

### 2.7 Code Quality: Fix TypeScript Supabase 'never' Type Errors

**Effort**: 1.5 hours | **Priority**: HIGH | **Dependency**: None

**Current state**: 7 Supabase 'never' type errors preventing type safety

**Root cause**: `.insert()` operations return `never` type when auto-inference fails

**Task**:
Apply type casting pattern to all Supabase operations:

```typescript
// Before
const { error } = await supabase
  .from("recommendations")
  .insert({ school_id, player_user_id, notes });

// After (with type casting)
const response = await supabase
  .from("recommendations")
  .insert({ school_id, player_user_id, notes });
const { error } = response as {
  data: unknown;
  error: PostgrestError | null;
};
```

**Files to fix**:

- `pages/recommendations/index.vue` (3 errors)
- `pages/schools/[schoolId]/coaches/[coachId].vue` (4 errors)
- `pages/signup.vue` (check for similar patterns)

**Verification**:

- [ ] Run `npm run type-check`
- [ ] Verify 7 errors eliminated
- [ ] TypeScript passes
- [ ] Test functionality still works

**Success metrics**:

- 7 TypeScript errors resolved
- Type safety enabled for Supabase operations
- No runtime errors

---

### 2.8 Code Quality: Fix Null/Undefined Type Mismatches

**Effort**: 1 hour | **Priority**: HIGH | **Dependency**: None

**Current state**: 12 null/undefined type errors from form values and optional params

**Files affected**:

- `pages/schools/[id]/index.vue` (8 errors)
- `pages/interactions/index.vue`
- `pages/reset-password.vue`

**Task**:
Add null-safety narrowing:

```typescript
// Before
const submitForm = async (formData) => {
  await updateSchool(formData.name); // name could be undefined
};

// After
const submitForm = async (formData) => {
  if (!formData.name) {
    throw new Error("School name is required");
  }
  await updateSchool(formData.name); // TypeScript knows name is string
};
```

**Or use optional chaining**:

```typescript
// Before
await api.update(student.email);

// After
if (student?.email) {
  await api.update(student.email);
}
```

**Verification**:

- [ ] Run `npm run type-check`
- [ ] Verify 12 errors eliminated
- [ ] Test form submissions work
- [ ] Verify error handling works

**Success metrics**:

- 12 null/undefined errors resolved
- Proper error handling in place
- Type safety improved

---

### 2.9 Code Quality: Fix Readonly Ref Assignment Errors

**Effort**: 15 minutes | **Priority**: MEDIUM | **Dependency**: None

**Current state**: 2 readonly ref assignment errors in password/email pages

**Files**:

- `pages/forgot-password.vue`
- `pages/verify-email.vue`
- `pages/reset-password.vue`

**Task**:
Change readonly ref returns to mutable refs:

```typescript
// Before (composable returns readonly)
export const usePasswordReset = () => {
  const email = readonly(ref(""));
  return { email };
};

// In component
const { email } = usePasswordReset();
email.value = "user@example.com"; // ERROR: readonly

// After (return mutable ref)
export const usePasswordReset = () => {
  const email = ref("");
  return { email };
};

// In component
const { email } = usePasswordReset();
email.value = "user@example.com"; // OK
```

**Verification**:

- [ ] Run `npm run type-check`
- [ ] Verify 2 errors eliminated
- [ ] Test password reset form
- [ ] Test email verification form

**Success metrics**:

- 2 readonly errors resolved
- Forms work correctly

---

### 2.10 Code Quality: Consolidate Duplicate Type Exports

**Effort**: 30 minutes | **Priority**: MEDIUM | **Dependency**: None

**Current state**: Types exported from multiple files, causing import confusion

**Duplicates identified**:

- `UseActiveFamilyReturn` (from useActiveFamily.ts and useFamilyContext.ts)
- `FormattedHistoryEntry` (from useProfile.ts and useProfileEditHistory.ts)

**Task**:
Create centralized type files:

```typescript
// types/family.ts (new file)
export type UseActiveFamilyReturn = {
  activeFamilyId: Ref<string | null>;
  activeFamilyName: ComputedRef<string | null>;
  switchFamily: (familyId: string) => Promise<void>;
};

// types/profile.ts (new file)
export type FormattedHistoryEntry = {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedAt: Date;
  changedBy: string;
};
```

Update imports:

```typescript
// composables/useActiveFamily.ts
import type { UseActiveFamilyReturn } from "~/types/family";

// composables/useFamilyContext.ts
import type { UseActiveFamilyReturn } from "~/types/family";
```

**Verification**:

- [ ] Create `/types/family.ts` and `/types/profile.ts`
- [ ] Update all imports
- [ ] Run `npm run type-check` → no new errors
- [ ] Test functionality

**Success metrics**:

- No duplicate type exports
- Single source of truth for each type
- Cleaner imports

---

## Phase 2 Summary

| Task                      | Effort        | Priority | Status |
| ------------------------- | ------------- | -------- | ------ |
| 2.1 Add page title tags   | 20 min        | HIGH     | —      |
| 2.2 Fix heading hierarchy | 1 hour        | HIGH     | —      |
| 2.3 Add aria-live regions | 1 hour        | HIGH     | —      |
| 2.4 Lazy-load Leaflet     | 30 min        | MEDIUM   | —      |
| 2.5 Purge unused Tailwind | 1 hour        | MEDIUM   | —      |
| 2.6 Optimize chunks       | 30 min        | MEDIUM   | —      |
| 2.7 Fix Supabase types    | 1.5 hours     | HIGH     | —      |
| 2.8 Fix null/undefined    | 1 hour        | HIGH     | —      |
| 2.9 Fix readonly refs     | 15 min        | MEDIUM   | —      |
| 2.10 Consolidate types    | 30 min        | MEDIUM   | —      |
| **TOTAL**                 | **5-8 hours** | —        | —      |

**Phase 2 Timeline**: 1-2 sprints (1-2 weeks)
**Expected Impact**:

- ✅ Accessibility: WCAG 2.1 AA compliance achieved
- ✅ Performance: 60+ KB bundle savings
- ✅ Code Quality: TypeScript errors resolved, types consolidated

---

## Phase 3: Long-Term Refactoring (Month 2+)

**Time: 20-30 hours | Impact: HIGH | Dependencies: Phase 2 complete**

### Goal

Optimize performance significantly, improve code maintainability, establish long-term patterns.

---

### 3.1 Performance: Code Split by Route

**Effort**: 4-6 hours | **Priority**: HIGH | **Impact**: 30-50% LCP improvement

**Current state**: Monolithic 1.3 MB JavaScript bundle

**Task**:
Configure Nuxt for route-based code splitting:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate large pages
          schools: [
            "./pages/schools/index.vue",
            "./pages/schools/[id]/index.vue",
          ],
          coaches: ["./pages/coaches/index.vue"],
          interactions: ["./pages/interactions/index.vue"],
        },
      },
    },
  },
  // Enable route-level code splitting
  experimental: {
    payloadExtraction: false, // Ensure bundles split by route
  },
});
```

**Verification**:

- [ ] Build project: `npm run build`
- [ ] Check chunk breakdown (should have separate chunks per major route)
- [ ] Monitor bundle sizes per route
- [ ] Test page load times
- [ ] Use Lighthouse to measure LCP improvement

**Expected improvement**: LCP <2.5s (currently 2.5-3.0s)

**Success metrics**:

- Separate chunks for each major route
- Total bundle size reduced to ~800 KB
- LCP <2.5s (meets Core Web Vitals)

---

### 3.2 Performance: Extract Component-Scoped CSS

**Effort**: 2-3 hours | **Priority**: MEDIUM | **Impact**: 40 KB CSS savings

**Current state**: All CSS in single 97 KB bundle

**Task**:
Move component styles to scoped `<style>` blocks:

```vue
<!-- pages/schools/index.vue -->
<template>
  <div class="schools-container">
    <!-- content -->
  </div>
</template>

<style scoped>
.schools-container {
  /* Move component-specific styles here */
}
</style>
```

This allows Vite to tree-shake unused styles per build.

**Verification**:

- [ ] Build and check CSS bundle size
- [ ] Verify styles apply correctly
- [ ] Test responsive design
- [ ] Check for any missing styles

**Success metrics**:

- Component CSS extracted
- CSS bundle reduced by 40 KB
- Page load improved

---

### 3.3 Performance: Implement Service Worker

**Effort**: 2-3 hours | **Priority**: MEDIUM | **Impact**: 2x faster repeat visits

**Current state**: No service worker, zero offline support

**Task**:
Create service worker for caching:

```typescript
// public/sw.js (basic example)
const CACHE_NAME = "recruiting-compass-v1";
const STATIC_ASSETS = ["/", "/index.html", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }),
  );
});
```

Register in app:

```typescript
// app.vue or main entry
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
```

**Verification**:

- [ ] Service worker registers without errors
- [ ] Test offline functionality
- [ ] Verify caching works
- [ ] Check DevTools → Application → Service Workers

**Expected benefit**: 2x faster page load on repeat visits

**Success metrics**:

- Service worker installed
- Offline functionality works
- Repeat visit performance 2x faster

---

### 3.4 Large Files: Refactor schools/[id]/index.vue

**Effort**: 6-8 hours | **Priority**: HIGH | **Impact**: Better maintainability, testability

**Current state**: 1,257 lines, manages multiple concerns (tabs, forms, data fetching)

**Task**:
Extract into smaller, focused components:

```
pages/schools/[id]/index.vue (renamed to SchoolDetail.vue, ~200 lines)
├── Responsibility: Layout, routing, data loading
├── Components used:
│   ├── SchoolHeader.vue (~100 lines)
│   ├── SchoolTabs.vue (~150 lines)
│   ├── SchoolFitAnalysis.vue (~200 lines)
│   ├── SchoolCoachList.vue (~150 lines)
│   └── SchoolNotesEditor.vue (~100 lines)
└── Composable: useSchoolDetail.ts (~150 lines)
```

**Benefits**:

- Easier to test
- Reusable components
- Better performance (can lazy-load tabs)
- Clearer responsibility

**Verification**:

- [ ] All components render correctly
- [ ] Functionality preserved
- [ ] Tests updated
- [ ] Performance improved (smaller initial bundle)

**Success metrics**:

- Single file split into 5 focused components
- Each component <300 lines
- Tests pass
- No functional regressions

---

### 3.5 Large Files: Refactor schools/index.vue

**Effort**: 4-5 hours | **Priority**: HIGH | **Impact**: Better maintainability

**Current state**: 1,256 lines, manages list, filtering, ranking

**Task**:
Extract into smaller components:

```
pages/schools/index.vue (renamed to SchoolsList.vue, ~200 lines)
├── SchoolFilters.vue (~150 lines)
├── SchoolListItem.vue (~100 lines)
├── SchoolListToolbar.vue (~80 lines)
└── Composable: useSchoolFiltering.ts (~150 lines)
```

**Verification**:

- [ ] All filters work
- [ ] List renders correctly
- [ ] Sorting and ranking work
- [ ] Tests updated

**Success metrics**:

- Large file split into focused components
- Better separation of concerns
- Easier to test and maintain

---

### 3.6 Large Composables: Refactor useInteractions.ts

**Effort**: 3-4 hours | **Priority**: MEDIUM | **Impact**: Better code organization

**Current state**: 899 lines, handles CRUD, timeline, exports

**Task**:
Split into focused composables:

```typescript
// composables/useInteractionCRUD.ts (300 lines)
// - Create, read, update, delete interactions
export const useInteractionCRUD = () => {
  // CRUD operations
};

// composables/useInteractionTimeline.ts (250 lines)
// - Timeline view, filtering, sorting
export const useInteractionTimeline = () => {
  // Timeline operations
};

// composables/useInteractionExport.ts (150 lines)
// - CSV/PDF export
export const useInteractionExport = () => {
  // Export operations
};
```

**Verification**:

- [ ] All operations work
- [ ] Tests updated
- [ ] Exports still function
- [ ] No functional regressions

**Success metrics**:

- Large composable split into 3 focused composables
- Each <350 lines
- Better testability

---

### 3.7 Code Quality: Add E2E Tests for Critical Flows

**Effort**: 4-5 hours | **Priority**: MEDIUM | **Dependency**: Phase 2 complete

**Current state**: Unit tests excellent (2836 passing), but E2E tests missing for critical workflows

**Task**:
Add Playwright E2E tests for:

```typescript
// tests/e2e/school-management.spec.ts
test("Complete school management flow", async ({ page }) => {
  // 1. Login
  // 2. Add a new school
  // 3. Update school details
  // 4. Log an interaction with school
  // 5. Verify fit score calculated
  // 6. Delete school
});

// tests/e2e/family-linking.spec.ts
test("Family linking workflow", async ({ page }) => {
  // Multi-step account linking process
});

// tests/e2e/task-progression.spec.ts
test("Task phase progression", async ({ page }) => {
  // Complete task workflow with phase transitions
});
```

**Verification**:

- [ ] Tests pass: `npm run test:e2e`
- [ ] Coverage includes critical paths
- [ ] Tests are stable (no flakiness)

**Success metrics**:

- 3+ E2E test suites added
- Critical user flows covered
- All tests passing

---

### 3.8 Establish TypeScript Strict Patterns

**Effort**: 2-3 hours (ongoing) | **Priority**: MEDIUM | **Dependency**: Phase 2 complete

**Current state**: TypeScript errors resolved, but patterns not documented

**Task**:
Document and enforce patterns for:

1. **Supabase operations**:

```typescript
// Pattern: Always type-cast Supabase responses
const response = await supabase.from("table").insert(data);
const { data: insertedData, error } = response as {
  data: TableType;
  error: PostgrestError | null;
};
if (error) throw error;
```

2. **Null-safety**:

```typescript
// Pattern: Check for null before using
if (!value) {
  throw new Error("Value required");
}
doSomething(value); // TypeScript knows value is not null
```

3. **Async error handling**:

```typescript
// Pattern: Always try/catch async operations
try {
  const result = await fetchData();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  // Handle error
}
```

Add to `/CLAUDE.md`:

```markdown
## TypeScript Patterns

### Supabase Queries

Always use type casting for auto-inferred responses...

### Error Handling

Always wrap async operations in try/catch...

### Null Safety

Always check for null before property access...
```

**Verification**:

- [ ] Patterns documented in CLAUDE.md
- [ ] Team review and approval
- [ ] Enforce via code review

**Success metrics**:

- Clear patterns established
- New code follows patterns
- Consistent codebase

---

### 3.9 SEO: Generate Dynamic Sitemap

**Effort**: 1 hour | **Priority**: HIGH | **Dependency**: None

**Current state**: No sitemap.xml

**Task**:
Create Nitro route for dynamic sitemap:

```typescript
// server/routes/sitemap.xml.ts
export default defineEventHandler(async () => {
  const staticPages = [
    "/dashboard",
    "/coaches",
    "/schools",
    "/interactions",
    "/events",
    "/timeline",
    "/performance",
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${staticPages
        .map(
          (page) => `
        <url>
          <loc>https://qa.myrecruitingcompass.com${page}</loc>
          <lastmod>${new Date().toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>
      `,
        )
        .join("")}
    </urlset>`;

  setHeader("Content-Type", "application/xml");
  return xml;
});
```

**Verification**:

- [ ] Navigate to `/sitemap.xml`
- [ ] Verify XML is valid
- [ ] Submit to Google Search Console

**Success metrics**:

- Valid sitemap.xml generated
- All important pages included
- Search engines can crawl

---

### 3.10 SEO: Add Open Graph Tags

**Effort**: 1.5 hours | **Priority**: MEDIUM | **Dependency**: 1.1, 1.2 complete

**Current state**: No OG tags, social sharing looks broken

**Task**:
Add global OG config + per-page overrides:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  app: {
    head: {
      meta: [
        { property: "og:site_name", content: "The Recruiting Compass" },
        { property: "og:type", content: "website" },
        {
          property: "og:image",
          content: "https://...recruiting-compass-og.png",
        },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@RecruitingCompass" },
      ],
    },
  },
});

// Per-page (pages/schools/index.vue)
definePageMeta({
  title: "Schools - Build Your College Recruiting List",
  ogTitle: "Schools - The Recruiting Compass",
  ogDescription:
    "Discover colleges that match your profile and build your recruiting list.",
  ogImage: "https://...schools-og.png",
});
```

**Verification**:

- [ ] Share page on social media (Twitter, Facebook)
- [ ] Verify OG tags display correctly
- [ ] Use Open Graph Debugger

**Success metrics**:

- OG tags render on all pages
- Social shares display correctly
- Professional appearance on social

---

### 3.11 SEO: Add Structured Data (Schema.org)

**Effort**: 2 hours | **Priority**: MEDIUM | **Dependency**: 3.10 complete

**Current state**: No JSON-LD structured data

**Task**:
Add Schema.org markup:

```typescript
// app.vue or layout
useHead({
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "The Recruiting Compass",
        description: "College recruiting tracker for high school athletes",
        url: "https://recruiting-compass-web-a9wx.vercel.app",
        applicationCategory: "Productivity",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      }),
    },
  ],
});
```

**Per-page schemas**:

- Schools page: CollectionPage schema
- Schools detail: Place schema (if showing college info)
- Interactions: Event schema (logging interactions)

**Verification**:

- [ ] Use Schema.org validator
- [ ] Check for errors
- [ ] Verify rich snippets in search results

**Success metrics**:

- Valid structured data
- No schema validation errors
- Potential for rich snippets

---

## Phase 3 Summary

| Task                         | Effort          | Priority | Status |
| ---------------------------- | --------------- | -------- | ------ |
| 3.1 Code split by route      | 4-6 hours       | HIGH     | —      |
| 3.2 Extract component CSS    | 2-3 hours       | MEDIUM   | —      |
| 3.3 Implement Service Worker | 2-3 hours       | MEDIUM   | —      |
| 3.4 Refactor schools/[id]    | 6-8 hours       | HIGH     | —      |
| 3.5 Refactor schools/index   | 4-5 hours       | HIGH     | —      |
| 3.6 Refactor useInteractions | 3-4 hours       | MEDIUM   | —      |
| 3.7 Add E2E tests            | 4-5 hours       | MEDIUM   | —      |
| 3.8 TypeScript patterns      | 2-3 hours       | MEDIUM   | —      |
| 3.9 Generate sitemap         | 1 hour          | HIGH     | —      |
| 3.10 Add OG tags             | 1.5 hours       | MEDIUM   | —      |
| 3.11 Add structured data     | 2 hours         | MEDIUM   | —      |
| **TOTAL**                    | **20-30 hours** | —        | —      |

**Phase 3 Timeline**: 2-4 weeks (ongoing)
**Expected Impact**:

- ✅ Performance: 50%+ LCP improvement, bundle <500 KB
- ✅ Maintainability: Large files refactored, composables consolidated
- ✅ SEO: Rich snippets enabled, comprehensive schema markup
- ✅ Code quality: TypeScript patterns established, E2E coverage added

---

## Quick Reference: Task Dependencies

```
Phase 1 (No dependencies)
└─ All tasks independent, can be parallelized

Phase 2 (Some dependencies)
├─ 2.1 (Page titles) depends on 1.1
├─ 2.7-2.9 (TypeScript) depend on none
└─ Others independent

Phase 3 (Mostly independent)
├─ 3.9-3.11 (SEO) depend on 1.1, 1.2
├─ 3.1-3.3 (Performance) depend on none
└─ 3.4-3.7 (Refactoring) depend on none
```

**Recommendation**: Complete Phase 1 before starting Phase 2. Can start Phase 3 tasks in parallel with Phase 2.

---

## Verification Checklist

### Before Phase 1

- [ ] Baseline screenshots captured (12 screenshots at 3 breakpoints)
- [ ] All audit reports reviewed
- [ ] Team alignment on priorities

### After Phase 1

- [ ] Run `npm run type-check` → passes
- [ ] Run `npm run lint` → clean output (build artifacts ignored)
- [ ] Run `npm run test` → 2836 tests passing
- [ ] Run `npm run build` → completes without warnings
- [ ] All 4 MVP pages have: title, description, labels
- [ ] No critical accessibility issues
- [ ] robots.txt accessible
- [ ] Re-capture screenshots (same breakpoints) → compare with baselines

### After Phase 2

- [ ] Run full test suite → all pass
- [ ] WCAG 2.1 AA compliance audit → all pass
- [ ] Performance metrics: LCP <2.5s
- [ ] TypeScript errors: 0
- [ ] ESLint clean output

### After Phase 3

- [ ] Bundle size <500 KB
- [ ] Sitemap.xml generated and valid
- [ ] OG tags render correctly on social
- [ ] Schema.org validates without errors
- [ ] E2E tests passing
- [ ] Code review: Large files refactored

---

## Monitoring & Maintenance

### Monthly

- [ ] Check Core Web Vitals (Performance → PageSpeed Insights)
- [ ] Run accessibility audit
- [ ] Review TypeScript errors (`npm run type-check`)

### Quarterly

- [ ] Security audit: `npm audit`
- [ ] Bundle size analysis
- [ ] Test coverage review

### As-needed

- [ ] Update OG tags when content changes
- [ ] Refresh sitemap.xml
- [ ] Monitor search console for indexing issues

---

## Implementation Tips

1. **Phase 1**: Do this in one sitting (2-3 hours). High impact, low effort.
2. **Phase 2**: Spread over 1-2 sprints. Tackle accessibility and TypeScript errors in parallel.
3. **Phase 3**: Ongoing refactoring. Don't block on this; interleave with feature work.
4. **Testing**: After each phase, run full test suite + capture screenshots.
5. **Communication**: Update team on progress in sprint retros.

---

## Related Documents

- **Audit Reports**: `/planning/audits/AUDIT_REPORT_2026-02-02.md`
- **Performance Details**: `/planning/audits/PERFORMANCE_AUDIT.md`
- **Accessibility Details**: `/planning/audits/ACCESSIBILITY_AUDIT_2026-02-02.md`
- **Baseline Screenshots**: `/planning/audits/baseline-2026-02-02/`
- **Audit Design**: `/planning/audits/2026-02-02-mvp-audit-design.md`

---

**Document Created**: February 2, 2026
**Status**: Ready for implementation
**Total Estimated Effort**: 30-40 hours
**Recommended Timeline**: 4-6 weeks (3 phases)
