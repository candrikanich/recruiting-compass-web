# iOS Explainer: Add School — All API Calls

**Updated:** March 2026 (post family-unit symmetric redesign)
**Companion spec:** `iOS_SPEC_Phase3_AddSchool.md` (full UI/UX/validation reference)

This document focuses entirely on the **sequence of API calls** the iOS app must make when adding a new school, what data each call needs, and what it returns.

---

## Big Picture: Call Sequence

There are **four distinct phases**:

```
1. College Search (autocomplete)     → Web App Proxy → College Scorecard API
2. NCAA Lookup                       → LOCAL (bundled JSON, no network)
3. Favicon / Logo Preview            → NCAA database (logos) or deferred post-create
4. School Create                     → Supabase directly
5. Favicon Persist (post-create)     → Web App Proxy → fetches + writes to DB
```

Phases 1–3 happen **before** the user taps "Add School."
Phase 4 is the actual creation.
Phase 5 is fire-and-forget after creation.

---

## Phase 1: College Autocomplete Search

**When:** User types ≥3 characters in the search field (debounce 300ms).

**Who handles it:** The Recruiting Compass web app's server-side proxy. **Do NOT call College Scorecard directly from iOS** — the API key lives on the server.

### Call

```
GET https://{webAppBaseUrl}/api/colleges/search
    ?q=Florida
    &fields=id,school.name,school.city,school.state,school.school_url,location.lat,location.lon,latest.admissions.admission_rate.overall,latest.student.size,latest.cost.tuition.in_state,latest.cost.tuition.out_of_state
    &per_page=10

Authorization: Bearer {supabaseAccessToken}
```

- `q` = search query (minimum 3 chars, required if `id` not present)
- `fields` = exact comma-separated list shown above — **include all of these**
- `per_page` = 10 (max allowed by proxy: 20)

### Response

```json
{
  "results": [
    {
      "id": 134130,
      "school.name": "University of Florida",
      "school.city": "Gainesville",
      "school.state": "FL",
      "school.school_url": "www.ufl.edu",
      "location.lat": 29.6516,
      "location.lon": -82.3248,
      "latest.student.size": 52218,
      "latest.admissions.admission_rate.overall": 0.296,
      "latest.cost.tuition.in_state": 6381,
      "latest.cost.tuition.out_of_state": 28658
    }
  ],
  "metadata": { "total": 1, "page": 0, "per_page": 10 }
}
```

### What to extract for display

Show in autocomplete dropdown: `school.name`, `school.city`, `school.state`

### Error handling

| Status | Meaning | User message |
|--------|---------|-------------|
| 400 | `q` too short | Don't show (debounce handles it) |
| 429 | Rate limited | "Too many searches. Please wait." |
| 503 | Scorecard down | "College search unavailable. Use manual entry." |

---

## Phase 2: College Enrichment — When User Selects a School

When the user taps a result from the dropdown, fire **both** of these in parallel:

### 2a. Re-fetch Scorecard Detail (for academic data)

This is the same endpoint as Phase 1, but now use the school's `id` to get a precise single result.

```
GET https://{webAppBaseUrl}/api/colleges/search
    ?id=134130
    &fields=id,school.name,school.city,school.state,school.school_url,location.lat,location.lon,latest.admissions.admission_rate.overall,latest.student.size,latest.cost.tuition.in_state,latest.cost.tuition.out_of_state

Authorization: Bearer {supabaseAccessToken}
```

**Why:** The autocomplete search returns up to 10 results, so lat/lng and academic data may be present already from Phase 1. However, fetching by exact ID is more reliable and is what the web implementation does (`fetchByName` → stored in `scorecardData`, `fetchById` also available).

**In practice:** Since the search results already include all needed fields, you can **skip this second fetch** and use the data from the Phase 1 result that the user selected. Cache it keyed on the lowercased school name.

Data to extract and store in `scorecardData`:

| JSON field | Swift property | Use |
|-----------|---------------|-----|
| `location.lat` | `latitude: Double?` | Stored in `academic_info.latitude` |
| `location.lon` | `longitude: Double?` | Stored in `academic_info.longitude` |
| `latest.student.size` | `studentSize: Int?` | Stored in `academic_info.student_size` |
| `latest.admissions.admission_rate.overall` | `admissionRate: Double?` | Stored in `academic_info.admission_rate` |
| `latest.cost.tuition.in_state` | `tuitionInState: Int?` | Stored in `academic_info.tuition_in_state` |
| `latest.cost.tuition.out_of_state` | `tuitionOutOfState: Int?` | Stored in `academic_info.tuition_out_of_state` |
| `school.school_url` | `website: String?` | Prepend `http://` if no protocol |
| `school.city` + `school.state` | `location: String` | Format as `"{city}, {state}"` |

**Silent failure:** If this call fails, the school creation still proceeds — `academic_info` will be empty.

### 2b. NCAA Division Lookup — LOCAL, No Network

**No API call.** The NCAA database is bundled in the app as a JSON resource.

Bundle file: export `data/ncaaSchools.json` from the web repo.
Format: `{ "D1": [{name, conference}], "D2": [...], "D3": [...] }`

```swift
// Lookup algorithm (mirror the web implementation exactly):
func lookupDivision(schoolName: String) -> NcaaLookupResult? {
    let normalized = normalize(schoolName)
    for division in [D1, D2, D3] {
        for school in database[division] {
            if matches(normalized, normalize(school.name)) {
                return NcaaLookupResult(
                    division: division,
                    conference: school.conference,
                    logo: nil  // Logo not in this database
                )
            }
        }
    }
    return nil
}
```

**Normalization rules** (must match web exactly):

```
1. Lowercase
2. Remove " main campus" (with preceding dash/space)
3. Remove " at {location}" — e.g., "Kent State at Kent" → "Kent State"
4. Remove trailing "(Location)" — e.g., "School (Location)" → "School"
5. Remove: university, college, institute, state, campus, technical, polytechnic
6. Trim whitespace
```

**Matching rules** (in order, stop on first match):

1. Exact match of normalized strings
2. If both normalized strings are >8 chars: one contains the other
3. Fuzzy: Levenshtein distance ≤ 2, if length difference is ≤ 3

**Result:** `{ division: "D1", conference: "SEC" }` or `nil`

**Auto-fill behavior:**
- If NCAA lookup returns a result → auto-fill Division and Conference fields with "(auto-filled)" badge
- If lookup fails → fields stay empty, user fills manually
- Logo from NCAA lookup: the web implementation returns `logo` as a URL. The current bundled `ncaaSchools.json` does **not** include logo URLs. School logos are fetched separately (see Phase 5).

**Cache in memory:** Session-scoped `[String: NcaaLookupResult]` dictionary keyed on normalized name.

---

## Phase 3: School Logo Preview (Before Creation)

**Status:** The web app's NCAA database does NOT include logo URLs in `ncaaSchools.json`. The logo field on `NcaaLookupResult` is populated in the web implementation only when the external NCAA API is called — **that flow is not used** in the current web implementation.

**Current web behavior:**
- No logo is shown on the "Add School" form itself
- Logos are fetched asynchronously **after** the school is created (Phase 5)
- The selected college confirmation card (`pages/schools/new.vue`) renders `schoolLogo` only if it is set — but in the current implementation, it is only set if `ncaaResult.logo` is truthy, which it never is for bundled data

**iOS recommendation:** Do not attempt to show a logo preview before school creation. Skip Phase 3 entirely. The logo appears in the school detail view after Phase 5 completes.

---

## Phase 4: Create School in Supabase

**When:** User taps "Add School" and passes validation + duplicate check.

**Direct Supabase client call** — no web app proxy needed.

### Insert

```swift
let response = try await supabase
    .from("schools")
    .insert([
        // Required
        "name": formState.name.trimmingCharacters(in: .whitespaces),
        "status": formState.status.rawValue,  // "researching" default
        "is_favorite": false,
        "pros": [] as [String],
        "cons": [] as [String],

        // From autocomplete (optional, set to nil if not available)
        "location": formState.location,               // "Gainesville, FL"
        "division": formState.division?.rawValue,      // "D1"
        "conference": formState.conference,            // "SEC"
        "website": formState.website,                  // "https://ufl.edu"

        // Manual fields
        "twitter_handle": formState.twitterHandle,
        "instagram_handle": formState.instagramHandle,
        "notes": formState.notes,

        // Academic info from College Scorecard (nil if not available)
        "academic_info": encodeAcademicInfo(scorecardData),

        // Identity/ownership — CRITICAL for family-based access control
        "user_id": familyManager.dataOwnerUserId,      // Athlete's user ID
        "family_unit_id": familyManager.activeFamilyId, // Family unit UUID
        "created_by": authManager.currentUserId,        // Who tapped "Add"
        "updated_by": authManager.currentUserId,
    ])
    .select()
    .single()
    .execute()
```

### `academic_info` JSON structure

This is stored as a JSONB column. Only include non-nil fields.

```json
{
  "student_size": 52218,
  "admission_rate": 0.296,
  "tuition_in_state": 6381,
  "tuition_out_of_state": 28658,
  "latitude": 29.6516,
  "longitude": -82.3248
}
```

If no Scorecard data is available, pass `nil` (or omit the key entirely).

### `user_id` vs `family_unit_id` — Important Distinction

| Field | Value | Meaning |
|-------|-------|---------|
| `user_id` | `familyManager.dataOwnerUserId` | The **athlete's** user ID (whose recruiting data this is) |
| `family_unit_id` | `familyManager.activeFamilyId` | The family unit (parent can see all family schools) |
| `created_by` | `authManager.currentUserId` | Who actually tapped "Add" (could be parent or athlete) |

These can be different if a parent is adding a school on behalf of their athlete. Do NOT use `authManager.currentUserId` for `user_id`.

### Response

```json
{
  "id": "uuid-string",
  "name": "University of Florida",
  "location": "Gainesville, FL",
  "division": "D1",
  "conference": "SEC",
  "website": "https://ufl.edu",
  "status": "researching",
  "is_favorite": false,
  "family_unit_id": "family-uuid",
  "user_id": "athlete-user-uuid",
  "created_at": "2026-03-03T...",
  "updated_at": "2026-03-03T...",
  ...
}
```

### Error handling

| Error | Meaning | User message |
|-------|---------|-------------|
| 401 | Token expired | Redirect to login |
| 403 | RLS violation (wrong family) | "Permission denied" |
| 409 | Unique constraint | "A school with this name already exists" |
| 5xx | Server error | "Failed to create school. Try again." |

### On success

1. Append `newSchool` to the local schools cache
2. Navigate to the school detail view for `newSchool.id`
3. Fire Phase 5 (fire-and-forget, do NOT await)

---

## Phase 5: Fetch and Persist School Logo (Fire-and-Forget)

**When:** Immediately after school creation succeeds.
**Wait for it?** No — navigate first, then trigger this in background.

The school's `favicon_url` column starts as `nil`. This phase fetches a favicon/logo URL and writes it back to Supabase.

### Call

```
GET https://{webAppBaseUrl}/api/schools/favicon
    ?schoolDomain={domain}
    &schoolId={newSchool.id}

Authorization: Bearer {supabaseAccessToken}
```

- `schoolDomain`: Extract from `newSchool.website`. Strip `https://`, `www.`, trailing `/`.
  - Example: `"https://www.ufl.edu"` → `"ufl.edu"`
  - Fallback if no website: construct `{lowercased-no-spaces-name}.edu` (best-effort)
- `schoolId`: The UUID returned by Phase 4

### What the server does

The server tries multiple favicon sources in order until one responds with HTTP 200:

1. `https://www.google.com/s2/favicons?sz=256&domain={domain}` — best quality
2. `https://{domain}/apple-touch-icon.png`
3. `https://www.{domain}/apple-touch-icon.png`
4. `https://{domain}/apple-touch-icon-precomposed.png`
5. `https://www.google.com/s2/favicons?sz=128&domain={domain}`
6. `https://icons.duckduckgo.com/ip3/{domain}.ico`
7. `https://{domain}/favicon.ico`
8. `https://www.{domain}/favicon.ico`

Returns the first working URL.

### Response

```json
{
  "success": true,
  "faviconUrl": "https://www.google.com/s2/favicons?sz=256&domain=ufl.edu",
  "domain": "ufl.edu",
  "schoolId": "uuid-string",
  "timestamp": "2026-03-03T..."
}
```

`faviconUrl` may be `null` if no favicon is found.

### After the call

1. **If `faviconUrl` is non-null:** Update the school in Supabase:

```swift
try await supabase
    .from("schools")
    .update(["favicon_url": faviconUrl])
    .eq("id", newSchool.id)
    .execute()
```

2. Update the school in the local cache with the new `favicon_url`.
3. The school detail view should reactively display the logo once it's set.

**If the call fails:** Silently log it. The school still exists and works fine — just shows a fallback icon (🏫 or initials).

---

## Summary: What Calls Go Where

| Call | Target | Auth | Blocking? |
|------|--------|------|-----------|
| College autocomplete search | Web App Proxy (`/api/colleges/search?q=`) | Bearer token | Yes (debounced) |
| Scorecard enrichment (selection) | Same proxy (`?id=`) or reuse Phase 1 data | Bearer token | Yes (parallel with NCAA) |
| NCAA division lookup | **LOCAL** JSON bundle | None | Yes (parallel with Scorecard) |
| School create | Supabase directly | Supabase session | Yes |
| Favicon fetch + persist | Web App Proxy (`/api/schools/favicon`) | Bearer token | **No (fire-and-forget)** |

---

## Duplicate Detection (Pre-Submit, Local Only)

Before calling Supabase, check the cached schools list locally. No network call needed.

### Priority order: name → domain → NCAA ID

```swift
// 1. Name: case-insensitive exact match
schools.first { $0.name.lowercased() == input.name.lowercased() }

// 2. Domain: extract hostname, strip www., compare
func domain(from url: String?) -> String? {
    guard let url, let host = URL(string: url)?.host else { return nil }
    return host.replacingOccurrences(of: "^www\\.", with: "", options: .regularExpression)
}
schools.first { domain($0.website) == domain(input.website) }

// 3. NCAA ID: not collected in the add form — skip for now
```

If duplicate found → show dialog with `matchType` badge, wait for user decision.

---

## College Scorecard API Key

The API key (`collegeScorecardApiKey`) is a **server-side secret** in the web app's runtime config. The iOS app **must not** have its own copy. Always route Scorecard calls through `/api/colleges/search` on the web app server.

---

## Required Context Before Submitting

The iOS app must have these values ready before the Supabase insert:

| Value | Source | Notes |
|-------|--------|-------|
| `activeFamilyId` | FamilyManager / session | Required for `family_unit_id` |
| `dataOwnerUserId` | FamilyManager | The athlete's user ID, not the logged-in user |
| `currentUserId` | AuthManager | For `created_by` / `updated_by` |
| Supabase access token | Auth session | For all authenticated calls |

If `activeFamilyId` or `dataOwnerUserId` is nil, block submission and show an error — do not attempt the insert.

---

## References

- Full UI spec: `planning/iOS_SPEC_Phase3_AddSchool.md`
- Web page: `pages/schools/new.vue`
- Web composables: `useSchools.ts`, `useCollegeData.ts`, `useNcaaLookup.ts`, `useSchoolLogos.ts`
- Server endpoints: `server/api/colleges/search.get.ts`, `server/api/schools/favicon.ts`
- Types: `types/models.ts` (School, AcademicInfo), `types/api.ts` (CollegeSearchResult)
- NCAA data: `data/ncaaSchools.json` (bundle this in the iOS app)
