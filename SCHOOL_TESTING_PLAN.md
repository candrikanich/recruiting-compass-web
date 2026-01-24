# School Functionality Comprehensive Testing Plan

**Target Coverage:** 80% overall with 90%+ on critical paths
**Scope:** Composables, Stores, Components, Utilities, API Endpoints
**Test Framework:** Vitest (unit/integration), Playwright (E2E)
**Documentation:** Test organization follows project structure

---

## 1. TEST STRUCTURE & ORGANIZATION

### Directory Layout

```
tests/
├── unit/
│   ├── composables/
│   │   ├── useSchools.spec.ts          [EXISTS - expand coverage]
│   │   ├── useSchoolMatching.spec.ts   [NEW - high priority]
│   │   ├── useSchoolLogos.spec.ts      [NEW]
│   ├── stores/
│   │   ├── schools.spec.ts             [NEW]
│   ├── utils/
│   │   ├── schoolSize.spec.ts          [NEW]
│   │   ├── sanitization.spec.ts        [NEW]
│   ├── components/
│   │   ├── School/
│   │   │   ├── SchoolCard.spec.ts      [NEW]
│   │   │   ├── SchoolLogo.spec.ts      [NEW]
│   │   │   ├── SchoolForm.spec.ts      [NEW]
│   ├── api/                             [NEW - server endpoints]
│   │   ├── schools-fit-score.spec.ts
├── fixtures/
│   ├── schools.fixture.ts              [NEW - test data factories]
├── e2e/
│   ├── schools-crud.spec.ts            [NEW]
│   ├── schools-matching.spec.ts        [NEW]
```

---

## 2. UNIT TEST SPECIFICATIONS BY AREA

### 2.1 Composables: `useSchools`

**File:** `tests/unit/composables/useSchools.spec.ts` (EXPAND EXISTING)

#### Current Coverage Status

- Exists with basic tests for CRUD
- Missing: Sanitization validation, edge cases on concurrent ops, ranking correctness

#### Test Cases to Add

| Test Case                       | Category    | Priority | Details                                                       |
| ------------------------------- | ----------- | -------- | ------------------------------------------------------------- |
| **Sanitization on Create**      | Create      | HIGH     | XSS injection in notes/pros/cons; verify sanitization applied |
| **Sanitization on Update**      | Update      | HIGH     | HTML tags stripped; verify safe output                        |
| **Batch Ranking Correctness**   | Ranking     | HIGH     | 10+ schools reordered; verify all rankings sequential 1..N    |
| **Ranking Persistence**         | Ranking     | HIGH     | Rankings survive fetch after update                           |
| **Concurrent Create Ops**       | Concurrency | MEDIUM   | Fire 5 simultaneous creates; all succeed, no race conditions  |
| **Favorite Toggle Idempotence** | State       | MEDIUM   | Toggle multiple times; final state matches expected           |
| **Empty School List Edge Case** | Edge        | LOW      | Fetch with 0 schools; verify empty array, no crashes          |
| **Null/Undefined in Pros/Cons** | Edge        | MEDIUM   | Some pros/cons null/undefined; filtered correctly             |
| **Large Description Updates**   | Edge        | MEDIUM   | 10KB+ description; verify truncation/limits applied           |

#### Example Test: Sanitization on Create

```typescript
it("should sanitize XSS in notes during school creation", async () => {
  const maliciousData = {
    name: "Test University",
    notes: "<img src=x onerror=\"alert('XSS')\" />",
    pros: ['<script>alert("XSS")</script>'],
    cons: ['<iframe src="evil.com"></iframe>'],
    // ... other required fields
  };

  // Mock sanitizeHtml to show it's called
  vi.mock("~/utils/validation/sanitize", () => ({
    sanitizeHtml: (html: string) => html.replace(/<[^>]*>/g, ""),
  }));

  const { createSchool } = useSchools();
  const result = await createSchool(maliciousData);

  // Verify no HTML tags in result
  expect(result.notes).not.toContain("<");
  expect(result.pros[0]).not.toContain("<");
  expect(result.cons[0]).not.toContain("<");
});
```

#### Example Test: Batch Ranking

```typescript
it("should maintain sequential rankings for all schools after batch update", async () => {
  const schools = Array.from({ length: 15 }, (_, i) =>
    createMockSchool({ id: `school-${i}`, ranking: null }),
  );
  const shuffled = [...schools].sort(() => Math.random() - 0.5);

  mockQuery.upsert.mockResolvedValue({ error: null });

  const { updateRanking, schools: schoolsRef } = useSchools();
  await updateRanking(shuffled);

  // Verify rankings are sequential
  schoolsRef.value.forEach((school, index) => {
    expect(school.ranking).toBe(index + 1);
  });
});
```

---

### 2.2 Composables: `useSchoolMatching`

**File:** `tests/unit/composables/useSchoolMatching.spec.ts` (NEW - HIGH PRIORITY)

#### Critical Path Tests (90%+ coverage target)

| Test Case                                           | Priority | Coverage                                        |
| --------------------------------------------------- | -------- | ----------------------------------------------- |
| **calculateMatchScore: No Preferences**             | HIGH     | Return 0, no dealbreakers                       |
| **calculateMatchScore: All Match**                  | HIGH     | 100% score when all prefs match                 |
| **calculateMatchScore: All Miss with Dealbreakers** | HIGH     | Dealbreaker flag set correctly                  |
| **Weight Calculation**                              | HIGH     | Priority 1 weight=10, Priority 5 weight=5, etc. |
| **evaluatePreference: Distance**                    | HIGH     | Within/outside max_distance_miles               |
| **evaluatePreference: Division**                    | HIGH     | D1/D2/D3 matching logic                         |
| **evaluatePreference: Conference Type**             | HIGH     | Power 4/Group of 5/Mid-Major classification     |
| **getAcademicRating: Admission Rate Bands**         | HIGH     | Rates map to 1-5 correctly                      |
| **evaluateSchoolSize: All Categories**              | MEDIUM   | Small/medium/large/very_large buckets           |
| **evaluateRegion: Northeast/Southeast/etc**         | MEDIUM   | Region state mapping                            |
| **evaluateState: Abbreviation & Full Names**        | MEDIUM   | CA, california both work                        |
| **getMatchBadge: Score Thresholds**                 | MEDIUM   | 80+=Great, 60+=Good, dealbreaker=Dealbreaker    |
| **Missing Academic Data Fallback**                  | MEDIUM   | Default to 3 when no rating available           |
| **Missing Location Data**                           | MEDIUM   | Can't evaluate distance → return true           |

#### Example Test: Match Score Calculation

```typescript
it("should calculate correct match score with weighted preferences", () => {
  const school = createMockSchool({
    division: "D1",
    conference: "SEC",
    location: "Florida",
    academic_info: { admission_rate: 0.2 },
  });

  const preferences = [
    { type: "division", value: ["D1"], priority: 1, is_dealbreaker: false }, // weight=10, match
    { type: "division", value: ["D2"], priority: 2, is_dealbreaker: false }, // weight=9, miss
    {
      type: "conference_type",
      value: ["Power 4"],
      priority: 3,
      is_dealbreaker: false,
    }, // weight=8, match
  ];

  const { calculateMatchScore } = useSchoolMatching();
  const result = calculateMatchScore(school);

  // Expected: (10 + 8) / (10 + 9 + 8) = 18/27 = 66.67 ≈ 67%
  expect(result.score).toBe(67);
  expect(result.matchedCriteria).toContain("division");
  expect(result.missedCriteria).toContain("division"); // 2nd occurrence
});
```

#### Example Test: Dealbreaker Detection

```typescript
it("should flag dealbreakers and prevent match", () => {
  const school = createMockSchool({ division: "D3" });
  const preferences = [
    {
      type: "division",
      value: ["D1"],
      priority: 1,
      is_dealbreaker: true,
    },
  ];

  const { calculateMatchScore } = useSchoolMatching();
  const result = calculateMatchScore(school);

  expect(result.hasDealbreakers).toBe(true);
  expect(result.dealbreakers).toContain("division");
});
```

---

### 2.3 Composables: `useSchoolLogos`

**File:** `tests/unit/composables/useSchoolLogos.spec.ts` (NEW)

#### Core Test Cases

| Test Case                           | Priority | Details                                |
| ----------------------------------- | -------- | -------------------------------------- |
| **Cache Hit: TTL Valid**            | HIGH     | Return cached URL without refetch      |
| **Cache Miss: TTL Expired**         | HIGH     | Refetch after 7 days; update cache     |
| **extractDomain: From Website URL** | HIGH     | Parse domain from school.website       |
| **extractDomain: From School Name** | MEDIUM   | Fallback: name→slug→domain.edu         |
| **Fetch from Database First**       | HIGH     | Check favicon_url column before API    |
| **Fetch from API Fallback**         | HIGH     | Call /api/schools/favicon if DB empty  |
| **Persist to Database**             | MEDIUM   | Save fetched favicon back to DB        |
| **Concurrent Fetch Prevention**     | MEDIUM   | Only one fetch per school at a time    |
| **Fetch Multiple: Parallel**        | MEDIUM   | All schools fetched in parallel        |
| **Batch Missing Logos**             | LOW      | Only fetch schools without favicon_url |
| **Logo Fetch Error Handling**       | MEDIUM   | Graceful fallback on API error         |
| **Display Logo Fallback**           | LOW      | Return GENERIC_SCHOOL_ICON when no URL |

#### Example Test: Cache Management

```typescript
it("should return cached logo within TTL without refetch", async () => {
  const school = createMockSchool();
  const mockUrl = "https://example.edu/favicon.ico";

  const { fetchSchoolLogo, getSchoolLogoCached } = useSchoolLogos();

  // Mock successful fetch
  vi.mocked($fetch).mockResolvedValue({ faviconUrl: mockUrl });

  // First fetch
  const url1 = await fetchSchoolLogo(school);
  expect(url1).toBe(mockUrl);

  // Second fetch should use cache
  vi.clearAllMocks();
  const url2 = await fetchSchoolLogo(school);

  // Verify API was NOT called again
  expect($fetch).not.toHaveBeenCalled();
  expect(url2).toBe(mockUrl);
  expect(getSchoolLogoCached(school.id)).toBe(mockUrl);
});
```

---

### 2.4 Stores: `useSchoolStore` (Pinia)

**File:** `tests/unit/stores/schools.spec.ts` (NEW)

#### Store Action Coverage

| Action                      | Priority | Test Focus                                        |
| --------------------------- | -------- | ------------------------------------------------- |
| **fetchSchools**            | HIGH     | Guard against duplicate fetches (isFetched flag)  |
| **getSchool**               | HIGH     | Single school fetch with user ownership check     |
| **createSchool**            | HIGH     | Sanitization, user_id injection, local state sync |
| **updateSchool**            | HIGH     | Local state update correctness, sanitization      |
| **deleteSchool**            | HIGH     | Clear selectedSchoolId if deleted                 |
| **toggleFavorite**          | MEDIUM   | State toggle via updateSchool                     |
| **updateRanking**           | HIGH     | Batch operation correctness                       |
| **setSelectedSchool**       | LOW      | State mutation                                    |
| **setFilters/resetFilters** | LOW      | Filter state management                           |

#### Store Getter Coverage

| Getter                | Priority | Test Focus                            |
| --------------------- | -------- | ------------------------------------- |
| **selectedSchool**    | HIGH     | Return null if not found; match by ID |
| **filteredSchools**   | HIGH     | Apply division/state/verified filters |
| **favoriteSchools**   | MEDIUM   | Only is_favorite=true items           |
| **schoolsByStatus**   | MEDIUM   | Filter by status type                 |
| **schoolsByDivision** | MEDIUM   | Filter by division                    |
| **hasSchools**        | LOW      | Return true if length>0               |

#### Example Test: Store Fetch Guard

```typescript
it("should not refetch if isFetched and schools exist", async () => {
  const { fetchSchools } = useSchoolStore();

  // First fetch succeeds
  mockQuery.order.mockResolvedValue({
    data: [createMockSchool()],
    error: null,
  });
  await fetchSchools();
  expect(mockSupabase.from).toHaveBeenCalledTimes(1);

  // Second fetch should be guarded
  vi.clearAllMocks();
  await fetchSchools();
  expect(mockSupabase.from).not.toHaveBeenCalled();
});
```

---

### 2.5 Utilities: `schoolSize.ts`

**File:** `tests/unit/utils/schoolSize.spec.ts` (NEW)

#### Test Matrix

| Function              | Test Case        | Input        | Expected Output             |
| --------------------- | ---------------- | ------------ | --------------------------- |
| **getCarnegieSize**   | Null/Undefined   | null         | null                        |
| **getCarnegieSize**   | Zero             | 0            | null                        |
| **getCarnegieSize**   | Very Small       | 500          | 'Very Small'                |
| **getCarnegieSize**   | Small            | 3000         | 'Small'                     |
| **getCarnegieSize**   | Medium           | 7000         | 'Medium'                    |
| **getCarnegieSize**   | Large            | 15000        | 'Large'                     |
| **getCarnegieSize**   | Very Large       | 30000        | 'Very Large'                |
| **getCarnegieSize**   | Boundary: 999    | 999          | 'Very Small'                |
| **getCarnegieSize**   | Boundary: 1000   | 1000         | 'Small'                     |
| **getCarnegieSize**   | Boundary: 4999   | 4999         | 'Small'                     |
| **getCarnegieSize**   | Boundary: 5000   | 5000         | 'Medium'                    |
| **getSizeColorClass** | Valid Small      | 'Small'      | 'bg-blue-100 text-blue-700' |
| **getSizeColorClass** | Valid Very Large | 'Very Large' | 'bg-red-100 text-red-700'   |
| **getSizeColorClass** | Null             | null         | 'bg-gray-100 text-gray-700' |
| **getSizeColorClass** | Unknown          | 'Unknown'    | 'bg-gray-100 text-gray-700' |

---

### 2.6 Utilities: Sanitization

**File:** `tests/unit/utils/sanitization.spec.ts` (NEW - verify with existing sanitize.ts)

#### XSS Prevention Coverage

| Attack Vector       | Input                                           | Expected Output                  |
| ------------------- | ----------------------------------------------- | -------------------------------- |
| **Script Tag**      | `<script>alert('xss')</script>`                 | No `<script>` tags               |
| **Image Onerror**   | `<img src=x onerror="alert()">`                 | No event handlers                |
| **Iframe**          | `<iframe src="evil.com"></iframe>`              | No `<iframe>` tags               |
| **SVG XSS**         | `<svg onload="alert()"></svg>`                  | No event handlers                |
| **Data Attributes** | `<div data-x="alert()"></div>`                  | Safe data attributes             |
| **Safe HTML: Bold** | `<b>Important</b>`                              | Allowed or stripped consistently |
| **Safe HTML: Link** | `<a href="https://safe.com">Link</a>`           | URL validated or stripped        |
| **Nested Tags**     | `<div><script><img onerror="x"></script></div>` | All dangerous tags removed       |
| **Entity Encoding** | `&lt;script&gt;`                                | Decoded but not executed         |

---

## 3. COMPONENT TESTING SPECIFICATIONS

### 3.1 SchoolCard.vue

**File:** `tests/unit/components/School/SchoolCard.spec.ts` (NEW)

#### Test Cases

| Test Case                        | Type        | Priority | Details                                        |
| -------------------------------- | ----------- | -------- | ---------------------------------------------- |
| **Render: Basic Props**          | Rendering   | HIGH     | School name, location, division visible        |
| **Render: With Fit Score**       | Rendering   | HIGH     | fit_score badge displays correctly             |
| **Render: Fit Score Coloring**   | Rendering   | MEDIUM   | Color class matches score (70+, 50+, <50)      |
| **Click Event**                  | Emit        | HIGH     | @click emitted when card clicked               |
| **Click with Stats**             | Emit        | HIGH     | stats displayed (coaches count, interactions)  |
| **Toggle Favorite: Unfavorited** | Emit        | HIGH     | @toggle emitted, star icon shows               |
| **Toggle Favorite: Favorited**   | Emit        | HIGH     | Star icon filled, unfavorite works             |
| **Stop Propagation**             | Interaction | MEDIUM   | .stop on favorite button prevents parent click |
| **Navigation**                   | Interaction | MEDIUM   | emit('click') calls navigate()                 |
| **Null Location**                | Edge        | LOW      | v-if skips location section safely             |
| **Missing Conference**           | Edge        | LOW      | v-if skips conference badge                    |
| **Fit Score Edge: 0**            | Edge        | LOW      | Score badge shows "0/100"                      |
| **Fit Score Edge: 100**          | Edge        | LOW      | Score badge shows "100/100"                    |
| **Fit Score Edge: Null**         | Edge        | LOW      | Badge hidden; hasFitScore=false                |

#### Example Test: Fit Score Badge

```typescript
it("should display fit score badge with correct color class", async () => {
  const wrapper = mount(SchoolCard, {
    props: {
      school: createMockSchool({ fit_score: 85 }),
    },
  });

  const badge = wrapper.find('[data-testid="fit-score"]');
  expect(badge.text()).toContain("85/100");
  expect(badge.classes()).toContain("bg-emerald-100");
  expect(badge.classes()).toContain("text-emerald-700");
});
```

---

### 3.2 SchoolLogo.vue

**File:** `tests/unit/components/School/SchoolLogo.spec.ts` (NEW)

#### Test Cases

| Test Case                          | Priority | Details                                                 |
| ---------------------------------- | -------- | ------------------------------------------------------- |
| **Render: Logo Image**             | HIGH     | <img> visible when logoUrl exists                       |
| **Render: Fallback Icon**          | HIGH     | Icon shown when no logoUrl                              |
| **Render: Loading Spinner**        | HIGH     | Spinner shows while isLoading=true                      |
| **Size Variants: All 5**           | HIGH     | xs/sm/md/lg/xl all render with correct sizes            |
| **Fetch on Mount**                 | HIGH     | fetchSchoolLogo called when mounted (fetchOnMount=true) |
| **Skip Fetch: fetchOnMount=false** | MEDIUM   | No fetch when prop is false                             |
| **Watch School ID**                | MEDIUM   | Refetch when school.id changes                          |
| **Handle Image Error**             | MEDIUM   | imageError=true when image fails; show fallback         |
| **Cache Integration**              | HIGH     | Use getSchoolLogoCached before fetching                 |
| **Loading State Management**       | MEDIUM   | isLoading computed correctly                            |
| **Icon Extraction**                | MEDIUM   | First letter of school name used as icon                |
| **Icon Fallback**                  | LOW      | Emoji fallback when no name                             |
| **Size Pixels Computed**           | LOW      | sizePixels returns correct px values                    |
| **Font Size Computed**             | LOW      | fallbackFontSize correct for each size                  |

#### Example Test: Size Variants

```typescript
it.each([
  { size: "xs", pixels: "24px", font: "12px" },
  { size: "sm", pixels: "32px", font: "16px" },
  { size: "md", pixels: "48px", font: "24px" },
  { size: "lg", pixels: "64px", font: "32px" },
  { size: "xl", pixels: "96px", font: "48px" },
])(
  "should render $size variant with correct dimensions",
  async ({ size, pixels, font }) => {
    const wrapper = mount(SchoolLogo, {
      props: {
        school: createMockSchool(),
        size: size as any,
        fetchOnMount: false,
      },
    });

    expect(wrapper.classes()).toContain(`logo-${size}`);
    expect(wrapper.vm.sizePixels).toBe(pixels);
    expect(wrapper.vm.fallbackFontSize).toBe(font);
  },
);
```

---

### 3.3 SchoolForm.vue

**File:** `tests/unit/components/School/SchoolForm.spec.ts` (NEW)

#### Form Validation & Submission

| Test Case                           | Priority | Details                                                  |
| ----------------------------------- | -------- | -------------------------------------------------------- |
| **Render: All Fields**              | HIGH     | Name, location, division, conference, pros, cons visible |
| **Validation: Required Name**       | HIGH     | Error shown if name empty on submit                      |
| **Validation: Division Enum**       | HIGH     | Only valid divisions accepted                            |
| **Submit: Valid Data**              | HIGH     | Form submission event fires with cleaned data            |
| **Submit: Sanitization**            | HIGH     | Notes/pros/cons sanitized before emit                    |
| **Pro/Con Array Management**        | MEDIUM   | Add/remove pros and cons dynamically                     |
| **Auto-fill: College Autocomplete** | MEDIUM   | Integration with college search API                      |
| **Reset Form**                      | MEDIUM   | Reset button clears all fields                           |
| **Loading State**                   | MEDIUM   | Submit button disabled while loading                     |
| **Error Display**                   | MEDIUM   | API errors shown to user                                 |
| **Null Values: Optional Fields**    | LOW      | Optional fields can be null                              |
| **Max Length: Description**         | LOW      | Truncate or warn on oversized input                      |

---

## 4. API ENDPOINT TESTING SPECIFICATIONS

### 4.1 POST /api/schools/[id]/fit-score

**File:** `tests/unit/api/schools-fit-score.spec.ts` (NEW)

#### Endpoint Tests

| Test Case                              | Priority | Details                                          |
| -------------------------------------- | -------- | ------------------------------------------------ |
| **Authorization: No Token**            | HIGH     | Return 401 Unauthorized                          |
| **Authorization: Invalid Token**       | HIGH     | Return 401 Unauthorized                          |
| **Authorization: Parent Role**         | HIGH     | Return 403 Forbidden (parent can't write)        |
| **Validation: Missing School ID**      | HIGH     | Return 400 Bad Request                           |
| **Validation: Invalid athleticFit**    | HIGH     | Return 400 if >40 or <0                          |
| **Validation: Invalid academicFit**    | HIGH     | Return 400 if >25 or <0                          |
| **Validation: Invalid opportunityFit** | HIGH     | Return 400 if >20 or <0                          |
| **Validation: Invalid personalFit**    | HIGH     | Return 400 if >15 or <0                          |
| **School Ownership Check**             | HIGH     | Return 404 if school not owned by user           |
| **Calculate Fit Score**                | HIGH     | Score correctly calculated from inputs           |
| **Update Database**                    | HIGH     | fit_score and fit_score_data updated             |
| **Audit Logging**                      | MEDIUM   | CRUD action logged with user ID                  |
| **Return Response Format**             | MEDIUM   | Return success=true, data with schoolId/fitScore |
| **Partial Updates**                    | MEDIUM   | Only provided fields updated (others unchanged)  |
| **All Zeros Input**                    | LOW      | Score correctly calculated when all 0            |
| **Max Values Input**                   | LOW      | Score=100 when all max values provided           |

#### Example Test: Fit Score Calculation

```typescript
it("should calculate correct fit score from components", async () => {
  const event = createH3Event({
    method: "POST",
    path: "/api/schools/school-1/fit-score",
  });

  // Mock body
  readBody.mockResolvedValue({
    athleticFit: 30, // 30/40
    academicFit: 20, // 20/25
    opportunityFit: 15, // 15/20
    personalFit: 10, // 10/15
  });

  // Mock school ownership
  mockSupabase
    .from("schools")
    .select()
    .eq()
    .single()
    .mockResolvedValue({ data: { id: "school-1" }, error: null });

  // Mock fit score calculation: 75/100
  calculateFitScore.mockReturnValue({
    score: 75,
    breakdown: {
      athleticFit: 30,
      academicFit: 20,
      opportunityFit: 15,
      personalFit: 10,
    },
  });

  const result = await handler(event);

  expect(result.data.fitScore.score).toBe(75);
  expect(mockSupabase.from("schools").update).toHaveBeenCalledWith(
    expect.objectContaining({ fit_score: 75 }),
  );
});
```

---

### 4.2 GET /api/schools/[id]/fit-score

**File:** Tests in `schools-fit-score.spec.ts`

#### Tests

| Test Case                        | Priority | Details                                                            |
| -------------------------------- | -------- | ------------------------------------------------------------------ |
| **Authorization: No Token**      | HIGH     | Return 401                                                         |
| **Authorization: Invalid Token** | HIGH     | Return 401                                                         |
| **Validation: Missing ID**       | HIGH     | Return 400                                                         |
| **School Ownership Check**       | HIGH     | Return 404 if not owned                                            |
| **Return Fit Score**             | HIGH     | Return stored fit_score value                                      |
| **Return Fit Score Data**        | HIGH     | Return breakdown (athleticFit, academicFit, etc.)                  |
| **Null Fit Score**               | MEDIUM   | Handle when fit_score not yet calculated                           |
| **Response Format**              | MEDIUM   | Return success=true, data object with schoolId/schoolName/fitScore |

---

## 5. INTEGRATION TEST SPECIFICATIONS

### 5.1 Composable + Store Integration

**File:** `tests/integration/school-composable-store.spec.ts` (NEW)

#### Scenarios

| Scenario                             | Priority | Flow                                                           |
| ------------------------------------ | -------- | -------------------------------------------------------------- |
| **useSchools + useSchoolStore Sync** | HIGH     | Both composables share same data; verify consistency           |
| **Create School Full Flow**          | HIGH     | useSchools.createSchool → updateStore → local state sync       |
| **Update School Full Flow**          | HIGH     | useSchools.updateSchool → store updates → UI reflects          |
| **Delete + Selection**               | HIGH     | Delete school → clear if selected → store updates              |
| **Fetch + Filter**                   | MEDIUM   | useSchoolStore.fetchSchools → apply filteredSchools getter     |
| **Ranking Persistence**              | MEDIUM   | updateRanking in composable → store reflects → survives reload |

#### Example Test: Create + Store Sync

```typescript
it("should sync created school between composable and store", async () => {
  const { createSchool } = useSchools();
  const schoolStore = useSchoolStore();

  mockQuery.single.mockResolvedValue({
    data: createMockSchool(),
    error: null,
  });

  // Create via composable
  const created = await createSchool({ ...schoolData });

  // Verify it's in composable's schools
  const composableSchools = useSchools().schools;
  expect(composableSchools.value).toContainEqual(created);

  // Verify it's in store (if they share state)
  // or manually sync via action
  await schoolStore.fetchSchools();
  expect(schoolStore.schools).toContainEqual(created);
});
```

---

## 6. E2E TEST SPECIFICATIONS (Playwright)

### 6.1 School CRUD Workflows

**File:** `tests/e2e/schools-crud.spec.ts` (NEW)

#### User Workflows

| Workflow            | Priority | Steps                                                    |
| ------------------- | -------- | -------------------------------------------------------- |
| **Create School**   | HIGH     | Navigate → Form → Submit → Verify in list                |
| **Update School**   | HIGH     | Click → Edit → Save → Verify changes                     |
| **Delete School**   | HIGH     | Click → Confirm → Verify removed from list               |
| **Favorite Toggle** | MEDIUM   | Click star → Toggle state → Persist on reload            |
| **Search & Filter** | MEDIUM   | Filter by division/state → Results correct               |
| **Batch Reorder**   | HIGH     | Drag schools to reorder → Save → Verify ranking persists |

#### Example Test: Create School E2E

```typescript
test("should create a new school and display in list", async ({ page }) => {
  // Navigate to schools page
  await page.goto("/schools");

  // Click "Add School" button
  await page.click('[data-testid="add-school-btn"]');

  // Fill form
  await page.fill('[data-testid="school-name"]', "Florida State University");
  await page.selectOption('[data-testid="division"]', "D1");
  await page.selectOption('[data-testid="conference"]', "ACC");
  await page.fill('[data-testid="location"]', "Tallahassee, FL");

  // Submit
  await page.click('[data-testid="submit-btn"]');

  // Verify in list
  await expect(page.locator("text=Florida State University")).toBeVisible();
});
```

---

### 6.2 School Matching Workflows

**File:** `tests/e2e/schools-matching.spec.ts` (NEW)

#### User Workflows

| Workflow                  | Priority | Steps                                          |
| ------------------------- | -------- | ---------------------------------------------- |
| **Set Preferences**       | HIGH     | Configure preferences → Save → See badges      |
| **View Fit Scores**       | HIGH     | Scores display on cards → Color coding matches |
| **Dealbreaker Warning**   | HIGH     | Dealbreaker pref set → Warning badge shown     |
| **Filter by Match Score** | MEDIUM   | Filter ≥80% → Only matched schools             |

---

## 7. TEST FIXTURES & MOCK DATA

### 7.1 School Factory

**File:** `tests/fixtures/schools.fixture.ts` (NEW)

```typescript
export function createMockSchool(overrides: Partial<School> = {}): School {
  return {
    id: overrides.id || `school-${Math.random().toString(36).substr(2, 9)}`,
    user_id: overrides.user_id || "user-123",
    name: overrides.name || "Test University",
    location: overrides.location || "Boston, MA",
    city: overrides.city || "Boston",
    state: overrides.state || "MA",
    division: overrides.division || "D1",
    conference: overrides.conference || "ACC",
    ranking: overrides.ranking || null,
    is_favorite: overrides.is_favorite ?? false,
    website: overrides.website || "https://test.edu",
    favicon_url: overrides.favicon_url || null,
    twitter_handle: overrides.twitter_handle || "@testuniv",
    instagram_handle: overrides.instagram_handle || "testuniv",
    status: overrides.status || "researching",
    notes: overrides.notes || "Great program",
    pros: overrides.pros || ["Good facilities"],
    cons: overrides.cons || ["Far from home"],
    private_notes: overrides.private_notes || null,
    offer_details: overrides.offer_details || null,
    academic_info: overrides.academic_info || {
      admission_rate: 0.25,
      enrollment: 12000,
      gpa_requirement: 3.5,
    },
    amenities: overrides.amenities || null,
    created_by: overrides.created_by || "user-123",
    updated_by: overrides.updated_by || "user-123",
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
    ...overrides,
  };
}

export function createMockSchoolPreference(
  overrides: Partial<SchoolPreference> = {},
): SchoolPreference {
  return {
    id: overrides.id || `pref-${Math.random().toString(36).substr(2, 9)}`,
    category: overrides.category || "location",
    type: overrides.type || "max_distance_miles",
    value: overrides.value ?? 300,
    priority: overrides.priority ?? 1,
    is_dealbreaker: overrides.is_dealbreaker ?? false,
    ...overrides,
  };
}
```

---

## 8. TEST EXECUTION STRATEGY

### 8.1 Local Development

```bash
# Run all unit tests
npm run test

# Run specific test file
npm run test -- tests/unit/composables/useSchoolMatching.spec.ts

# Run with UI
npm run test:ui

# Check coverage
npm run test:coverage -- --include='**/composables/useSchool*.ts' --include='**/stores/schools.ts'
```

### 8.2 CI/CD Pipeline

```yaml
# In GitHub Actions (or similar)
- name: Run type check
  run: npm run type-check

- name: Run lint
  run: npm run lint

- name: Run unit tests
  run: npm run test -- --reporter=verbose
  env:
    NODE_OPTIONS: --max-old-space-size=2048

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
```

### 8.3 Coverage Targets

```
Overall Target: 80% line coverage
School Functionality Breakdown:
├── Composables (useSchools, useSchoolMatching, useSchoolLogos): 85%+
├── Stores (useSchoolStore): 85%+
├── Components (SchoolCard, SchoolLogo, SchoolForm): 75%+
├── Utilities (schoolSize, sanitization): 90%+
├── API endpoints (fit-score): 85%+
└── Critical paths (CRUD, fit score calc, matching): 95%+
```

---

## 9. KEY TESTING PATTERNS & UTILITIES

### 9.1 Mocking Supabase

```typescript
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
};

mockSupabase.from.mockReturnValue(mockQuery);
mockQuery.select.mockResolvedValue({ data: schoolData, error: null });
```

### 9.2 Setting Active Pinia

```typescript
beforeEach(() => {
  const pinia = createPinia();
  setActivePinia(pinia);
  userStore.user = { id: "user-123", email: "test@example.com" };
});
```

### 9.3 Component Testing with Mount

```typescript
const wrapper = mount(SchoolCard, {
  props: {
    school: createMockSchool(),
    stats: { coaches: 5, interactions: 12 },
  },
  global: {
    stubs: { SchoolLogo: true },
  },
});

expect(wrapper.find("h3").text()).toContain("Test University");
```

---

## 10. TRACKING & NEXT STEPS

### Coverage Expansion Roadmap

1. **Phase 1 (Immediate):** useSchoolMatching (high-priority matching logic)
2. **Phase 2 (Week 1):** useSchoolLogos, SchoolCard, SchoolLogo components
3. **Phase 3 (Week 2):** SchoolForm, API endpoints, integration tests
4. **Phase 4 (Week 3):** E2E workflows, refinement to 80%+ coverage

### Success Criteria

- All critical path tests passing
- 80%+ overall coverage
- 0 flaky tests
- CI pipeline passing on every commit
- Documentation complete for test patterns

---

## 11. TROUBLESHOOTING & COMMON ISSUES

### Issue: "User not authenticated" in tests

**Solution:** Ensure `beforeEach` sets `userStore.user` with valid ID

### Issue: Mocked Supabase queries not resolving

**Solution:** Call `.mockResolvedValue()` on final method (single(), order(), etc.)

### Issue: Component refs not updating in tests

**Solution:** Call `await wrapper.vm.$nextTick()` after state changes

### Issue: Concurrent test failures

**Solution:** Use `beforeEach` to reset mocks; avoid shared state between tests
