# iOS Phase 6 Specs - Handoff Document

**Created:** February 10, 2026
**Status:** 3 of 13 specs completed
**Next Steps:** Complete remaining 10 specs for Phase 6 (Documents, Reports, Social, Legal)

---

## Context

We are creating iOS page specifications for Phase 6 of The Recruiting Compass iOS app. These specs translate the Nuxt/Vue web app features into native iOS implementations.

### Project Background

- **Dual Codebase:** Nuxt/TypeScript web app (source of truth) + SwiftUI iOS app
- **Current Phase:** Phase 6 - Polish & Edge Cases (Week 7-8)
- **Priority Order:** Events → Documents → Reports → Social → Legal
- **Template:** `/planning/iOS_PAGE_SPEC_TEMPLATE.md`
- **Example Specs:** Phase 5 specs in `/planning/iOS_SPEC_Phase5_*.md`

---

## ✅ Completed Specs (3/13)

### Events Section (All 3 Complete)

1. **Events List** (`iOS_SPEC_Phase6_EventsList.md`)
   - Calendar view with event indicators
   - Filters: type, status, date range
   - Search by name/location
   - Sort options
   - Delete events
   - Navigate to create/detail

2. **Create Event** (`iOS_SPEC_Phase6_CreateEvent.md`)
   - Multi-section form (Event Info, Date/Time, Location, Details, Performance)
   - Required fields: type, name, start_date
   - School dropdown with "Add new school" inline
   - Intelligent defaults (end date = start date, end time = start + 1hr)
   - "Get Directions" integration (Apple Maps)
   - Form validation

3. **Event Detail** (`iOS_SPEC_Phase6_EventDetail.md`)
   - View all event details
   - Edit event (modal)
   - Delete event
   - Mark as attended (triggers quick interaction logging)
   - Add/remove coaches present
   - Log performance metrics
   - Export metrics
   - Get directions

---

## 📝 Remaining Specs (10/13)

### Priority Order (as specified by user)

1. **Events** ✅ COMPLETE
2. **Documents** (3 pages) ⬅️ START HERE
3. **Reports** (2 pages)
4. **Social** (3 pages)
5. **Legal** (2 pages)

---

## Documents Section (3 pages) - NEXT

### 1. Documents List (`/documents/index.vue`)

**Key Features:**

- Upload documents (videos, transcripts, resumes, recommendation letters, questionnaires, stats sheets)
- Statistics cards: Total Documents, Shared Documents, Most Common Type, Total Storage
- Filter by: type, school, shared status
- View modes: Grid or List
- Sort by: newest, oldest, name, type, most shared
- Search documents
- Delete documents
- Navigate to document detail

**Web Implementation Details:**

- Document types: `highlight_video`, `transcript`, `resume`, `rec_letter`, `questionnaire`, `stats_sheet`
- Upload form fields: type (required), title (required), school (optional), version (number), description, file upload
- File type restrictions per document type
- Uses Supabase Storage for file uploads
- Composable: `useDocuments` (assumed, need to verify)
- Filter/sort pattern similar to Events List

**iOS Considerations:**

- File picker integration (UIDocumentPickerViewController or SwiftUI PhotosPicker for videos/images)
- Progress indicator during upload
- File size limits and validation
- Thumbnail generation for videos/images
- Grid view = 2-column on iPhone, 3-column on iPad
- List view = single column with thumbnails

### 2. Document Detail (`/documents/[id].vue`)

**Key Features:**

- View document metadata (type badge, title, description, version, school, upload date, file type)
- Document preview:
  - Video: VideoPlayer component
  - Image: Full-size image view
  - PDF: Inline viewer (iframe in web, PDFKit in iOS)
  - Other: Download button
- Edit document metadata (inline form: title, school, description)
- Delete document
- Share document (generate shareable link)
- Version history:
  - List all versions with dates
  - Mark current version
  - View previous versions
  - Restore previous version
  - Upload new version

**Web Implementation Details:**

- Document preview logic based on `file_type` or `file_url` extension
- Version control: `document_versions` table (or `documents` table with version field)
- Share functionality generates temporary access token/link
- Edit updates metadata only (not file)

**iOS Considerations:**

- AVPlayerViewController for video playback
- PDFKit for PDF viewing
- UIImage for image display
- Share sheet (UIActivityViewController) for iOS native sharing
- Version history as expandable section or separate sheet
- Upload new version opens file picker → increments version number

### 3. Document Viewer (`/documents/view.vue`)

**Key Features:**

- Fullscreen document viewer (minimal UI)
- Optimized for viewing documents without distraction
- Navigation controls (previous/next if applicable)
- Close/back button
- Share button
- Download button

**Web Implementation Details:**

- Similar to Document Detail preview section but fullscreen
- May accept query params for direct document access
- Supports same file types as detail page

**iOS Considerations:**

- Modal fullscreen presentation
- Dismiss gesture (swipe down)
- Toolbar with share/download actions
- Picture-in-picture for videos
- Zoom/pan for images and PDFs

---

## Reports Section (2 pages)

### 4. Reports Dashboard (`/reports/index.vue`)

**Key Features:**

- Analytics overview page
- Summary metrics cards
- Charts/graphs for trends
- Export functionality (PDF/CSV)
- Date range filters
- Metric type filters

**iOS Considerations:**

- Use Swift Charts (iOS 16+) or third-party library (e.g., DGCharts)
- Responsive grid layout for metric cards
- Pull-to-refresh for updated data
- Export via share sheet

### 5. Timeline Report (`/reports/timeline.vue`)

**Key Features:**

- Progress tracking over time
- Visual timeline representation
- Phase milestones
- Task completion tracking
- Date-based filtering

**iOS Considerations:**

- Custom timeline view (vertical scrolling)
- Milestone markers
- Swipe gestures for timeline navigation
- Detail view for each milestone/event

---

## Social Section (3 pages)

### 6. Social Feed (`/social/index.vue`)

**Key Features:**

- Timeline of network activity
- Posts/updates from connections
- Like/comment functionality
- Filter by connection type
- Search users/posts

**iOS Considerations:**

- Infinite scroll for feed
- Pull-to-refresh
- Like/comment interactions
- User avatars
- Link previews for shared content

### 7. Social Analytics (`/social/analytics.vue`)

**Key Features:**

- Engagement metrics
- Connection growth over time
- Post performance
- Profile views
- Charts/graphs

**iOS Considerations:**

- Similar to Reports Dashboard (charts)
- Metric cards
- Date range filters
- Export functionality

### 8. Coach Social Profile (`/social/coach/[id].vue`)

**Key Features:**

- Public coach profile view
- Coach bio/description
- Recent activity
- Connection status
- Contact options (if connected)
- Follow/unfollow

**iOS Considerations:**

- Header with coach photo/name
- Segmented control for tabs (About, Activity, Stats)
- Action buttons (Connect, Message)
- Privacy controls (what info is visible)

---

## Legal Section (2 pages)

### 9. Terms of Service (`/legal/terms.vue`)

**Key Features:**

- Legal text display
- Native iOS scrollable view
- Sections with headers
- "Last Updated" date
- Accept/Decline flow (if first-time user)

**iOS Considerations:**

- ScrollView with styled text (Markdown or AttributedString)
- Navigation bar with close button
- Section headers for easy navigation
- Link handling (tap links to open Safari)
- Accessibility support (VoiceOver)

### 10. Privacy Policy (`/legal/privacy.vue`)

**Key Features:**

- Privacy policy text display
- Similar to Terms of Service
- Data collection disclosures
- User rights section

**iOS Considerations:**

- Same implementation pattern as Terms
- May include "Manage Privacy Settings" button
- Links to settings page for permissions

---

## Template & Patterns

### Spec Template Structure

All specs must follow the 12-section template (`iOS_PAGE_SPEC_TEMPLATE.md`):

1. **Overview** - Purpose, key actions, success criteria
2. **User Flows** - Primary flow, alternative flows, error scenarios
3. **Data Models** - Swift structs, enums, related models
4. **API Integration** - Supabase endpoints, auth, request/response examples
5. **State Management** - SwiftUI @State, @Published, computed properties
6. **UI/UX Details** - Layout structure, design system, interactive elements
7. **Dependencies** - Frameworks, libraries, external services
8. **Error Handling & Edge Cases** - Network errors, data errors, user errors
9. **Testing Checklist** - Happy path, error tests, edge cases, performance
10. **Known Limitations & Gotchas** - Web vs iOS differences
11. **Links & References** - Web implementation files, composables, API docs
12. **Sign-Off** - Reviewer, verification date, readiness status

### Common Patterns Across Specs

**Data Fetching:**

```swift
@State var items: [Item] = []
@State var isLoading = false
@State var error: String? = nil

func fetchItems() async {
  isLoading = true
  defer { isLoading = false }

  do {
    let response = try await supabase
      .from("table")
      .select("*")
      .eq("user_id", userId)
      .execute()
    items = response.data
  } catch {
    self.error = error.localizedDescription
  }
}
```

**Supabase API Pattern:**

```
GET: .from("table").select("*").eq("id", id).single()
POST: .from("table").insert([data]).select().single()
PUT: .from("table").update(data).eq("id", id).select().single()
DELETE: .from("table").delete().eq("id", id)
```

**Form Validation:**

```swift
func validateForm() -> Bool {
  var errors: [String: String] = [:]

  if field.isEmpty {
    errors["field"] = "Field is required"
  }

  self.validationErrors = errors
  return errors.isEmpty
}
```

**Loading States:**

- First Load: Skeleton screens (300ms delay)
- Reload: Pull-to-refresh
- Empty State: Icon + message + CTA
- Error State: Banner + retry button

**Accessibility:**

- VoiceOver labels for all interactive elements
- WCAG AA color contrast (4.5:1)
- Touch targets 44pt minimum
- Dynamic Type support

---

## Key Web Files to Reference

### Documents

- `/pages/documents/index.vue` - List view
- `/pages/documents/[id].vue` - Detail view
- `/pages/documents/view.vue` - Viewer
- `/composables/useDocuments.ts` (if exists)
- `/types/models.ts` - Document interface

### Reports

- `/pages/reports/index.vue`
- `/pages/reports/timeline.vue`
- `/composables/useReports.ts` (if exists)

### Social

- `/pages/social/index.vue`
- `/pages/social/analytics.vue`
- `/pages/social/coach/[id].vue`
- `/composables/useSocial.ts` (if exists)

### Legal

- `/pages/legal/terms.vue`
- `/pages/legal/privacy.vue`

---

## Important Notes from Previous Work

1. **Date Formatting:** Always use ISO 8601 format (`YYYY-MM-DD`) for consistency
2. **Authentication:** All pages use Supabase Auth Token in Keychain
3. **Family Context:** Multi-user support (parent viewing athlete data) - use `useActiveFamily`
4. **Error Handling:** Always try/catch async operations, show user-friendly messages
5. **Validation:** Client-side + server-side (Supabase constraints)
6. **Navigation:** Use NavigationLink or modal presentation based on context
7. **File Uploads:** Use Supabase Storage with progress tracking
8. **Deletion:** Always confirm destructive actions (alert dialog)
9. **State Persistence:** Only persist filters/sort in UserDefaults if explicitly needed
10. **Performance:** Cache data for 5 minutes (stale-while-revalidate pattern)

---

## Testing Requirements

Every spec must include:

**Happy Path Tests:**

- Page loads correctly
- Primary actions work (CRUD operations)
- Navigation works
- Data persists

**Error Tests:**

- Network timeout handling
- 401 (redirect to login)
- 403 (show permission error)
- Empty data (show empty state)
- Server errors (5xx)

**Edge Case Tests:**

- Very long text (truncation)
- Large lists (100+ items, pagination)
- Rapid button taps (prevent duplicates)
- VoiceOver compatibility
- Device size variations
- Dynamic Type scaling

**Performance Tests:**

- Page loads in <2 seconds (4G)
- Scrolling at 60fps
- No memory leaks
- Images load without blocking

---

## Deliverables

Create these 10 files in `/planning/`:

1. `iOS_SPEC_Phase6_DocumentsList.md`
2. `iOS_SPEC_Phase6_DocumentDetail.md`
3. `iOS_SPEC_Phase6_DocumentViewer.md`
4. `iOS_SPEC_Phase6_ReportsDashboard.md`
5. `iOS_SPEC_Phase6_TimelineReport.md`
6. `iOS_SPEC_Phase6_SocialFeed.md`
7. `iOS_SPEC_Phase6_SocialAnalytics.md`
8. `iOS_SPEC_Phase6_CoachSocialProfile.md`
9. `iOS_SPEC_Phase6_TermsOfService.md`
10. `iOS_SPEC_Phase6_PrivacyPolicy.md`

---

## Verification Checklist

Before marking complete, verify:

- [ ] All 10 specs created in `/planning/` directory
- [ ] Each spec follows 12-section template structure
- [ ] Data models defined as Swift structs/enums
- [ ] API endpoints documented with examples
- [ ] UI/UX details include layout, design system, accessibility
- [ ] Testing checklist complete (4 sections)
- [ ] Sign-off section completed
- [ ] File naming follows pattern: `iOS_SPEC_Phase6_[PageName].md`

---

## Next Steps for Fresh Context

1. **Read this handoff document** to understand context
2. **Review template:** `/planning/iOS_PAGE_SPEC_TEMPLATE.md`
3. **Review example completed spec:** `/planning/iOS_SPEC_Phase6_EventsList.md` (comprehensive example)
4. **Start with Documents section:**
   - Read web implementation: `/pages/documents/index.vue`
   - Check composable: `/composables/useDocuments.ts` (if exists)
   - Create `iOS_SPEC_Phase6_DocumentsList.md`
   - Repeat for Document Detail and Viewer
5. **Continue with Reports, Social, Legal** in order
6. **Mark task #1 complete** when all 10 specs created

---

## Questions to Resolve (if any)

- **Documents:** Confirm useDocuments composable exists and its API
- **Reports:** Identify chart library used in web (if any)
- **Social:** Clarify if this is networking features or internal activity tracking
- **Storage:** Confirm Supabase Storage bucket names and permissions

---

## Contact/Context

- **User preference:** Full upload/management for Documents
- **Social networking:** Confirmed as networking features (connecting with other users/coaches)
- **Legal pages:** Native iOS views (not web embeds)
- **Admin pages:** Skipped for iOS MVP

---

**Ready to continue in fresh context.** All necessary information provided above. 🚀
