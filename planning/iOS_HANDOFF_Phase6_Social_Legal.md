# iOS Phase 6 Specs - Handoff Document (Social + Legal)

**Created:** February 10, 2026
**Status:** 5 of 10 specs completed
**Next Steps:** Complete remaining 5 specs for Phase 6 (Social, Legal)

---

## Context

We are creating iOS page specifications for Phase 6 of The Recruiting Compass iOS app. These specs translate the Nuxt/Vue web app features into native iOS implementations.

### Project Background

- **Dual Codebase:** Nuxt/TypeScript web app (source of truth) + SwiftUI iOS app
- **Current Phase:** Phase 6 - Polish & Edge Cases (Week 7-8)
- **Priority Order:** Events ✅ → Documents ✅ → Reports ✅ → **Social → Legal**
- **Template:** `/planning/iOS_PAGE_SPEC_TEMPLATE.md`
- **Example Specs:** Phase 5 specs in `/planning/iOS_SPEC_Phase5_*.md`

---

## ✅ Completed Specs (5/10)

### Documents Section (All 3 Complete)

1. **Documents List** (`iOS_SPEC_Phase6_DocumentsList.md`)
   - Upload documents with type selection, metadata, file validation
   - Statistics cards: Total, Shared, Most Common Type, Storage
   - Filters: search, type, school, shared status
   - Sort: newest, oldest, name, type, most shared
   - View modes: Grid (2-3 column) and List (single column)
   - Delete documents, navigate to detail
   - **Complexity:** High

2. **Document Detail** (`iOS_SPEC_Phase6_DocumentDetail.md`)
   - View full document metadata and preview
   - Video playback (AVPlayerViewController), PDF rendering (PDFView), image zoom
   - Edit metadata (title, description, school)
   - Share with schools (multi-select modal)
   - Version history (view, restore previous versions, upload new version)
   - Delete document with confirmation
   - **Complexity:** High

3. **Document Viewer** (`iOS_SPEC_Phase6_DocumentViewer.md`)
   - Fullscreen, distraction-free viewing experience
   - Minimal UI (toolbar auto-hides)
   - Video playback, PDF scrolling/zooming, image zoom/pan
   - Share via iOS share sheet, download to device
   - Swipe-to-dismiss gesture
   - Optional: Navigate between documents in collection
   - **Complexity:** Medium

### Reports Section (All 2 Complete)

4. **Reports Dashboard** (`iOS_SPEC_Phase6_ReportsDashboard.md`)
   - Generate reports for specific date ranges (custom or presets)
   - Quick presets: Last 7/30/90 days, 6 months, year to date, last year
   - Statistics display: Schools, Coaches, Interactions, Metrics, Response Rate
   - Schools by Status breakdown
   - Export to CSV via iOS share sheet
   - Client-side data aggregation (no server API)
   - **Complexity:** High

5. **Timeline Report** (`iOS_SPEC_Phase6_TimelineReport.md`)
   - Visual swimlane timeline grouped by schools
   - Timeline items from: Events, Interactions, Offers, School Status Changes
   - Filters: date range (3/6/12 months, All Time), school, item type toggles
   - Two views: swimlane (visual) and list (chronological)
   - "Today" marker on timeline
   - Click items to navigate to detail pages
   - Print functionality
   - **Complexity:** High

---

## 📝 Remaining Specs (5/10)

### Priority Order (as specified by user)

1. **Social** (3 specs) ⬅️ START HERE
2. **Legal** (2 specs)

---

## Social Section (3 pages) - NEXT

### 1. Social Feed (`/social/index.vue`)

**Key Features:**

- Timeline of network activity (posts, updates, connections)
- Feed items from connections (other users, coaches)
- Like/comment functionality
- Filter by connection type (Athletes, Coaches, Families)
- Search users/posts
- Infinite scroll for feed
- Pull-to-refresh
- Post creation (optional, if implemented)

**Web Implementation Details:**

- Feed item types: Post, Connection, Achievement, Offer Announcement
- User avatars with profile links
- Like/comment counts
- Timestamp display (relative: "2 hours ago")
- Filter bar with tabs: All, Athletes, Coaches, Families
- Search bar for users/content
- Composable: `useSocial` or `useFeed` (need to verify)
- May use external social API or internal database

**iOS Considerations:**

- Infinite scroll = List with `onAppear` loading more
- Pull-to-refresh = `.refreshable` modifier
- User avatars = AsyncImage with placeholder
- Like button = animated heart (SF Symbol "heart" / "heart.fill")
- Comment sheet = modal presentation
- Link previews = UITextView with link detection or custom view
- Empty state: "Connect with coaches and athletes to see activity"

### 2. Social Analytics (`/social/analytics.vue`)

**Key Features:**

- Engagement metrics dashboard
- Connection growth over time (line chart)
- Post performance (views, likes, comments)
- Profile views counter
- Top connections (most engaged)
- Activity heatmap (optional)
- Date range filter
- Export analytics (CSV/PDF)

**Web Implementation Details:**

- Metrics cards: Total Connections, Profile Views, Engagement Rate, Top Post
- Line chart: Connection growth over time
- Bar chart: Post performance comparison
- Date range selector: Last 7/30/90 days, All Time
- Export button (CSV)
- Composable: `useSocialAnalytics` (need to verify)
- Data source: Internal analytics table or aggregated from social interactions

**iOS Considerations:**

- Use Swift Charts (iOS 16+) for line/bar charts
- Metric cards = 2×2 grid on iPhone, 3×2 on iPad
- Connection growth chart = LineChart with date axis
- Post performance chart = BarChart with post labels
- Date range picker = standard iOS picker
- Export via share sheet (CSV generation)
- Empty state: "Start connecting to see analytics"

### 3. Coach Social Profile (`/social/coach/[id].vue`)

**Key Features:**

- Public coach profile view (if connected or public)
- Coach bio/description
- Recent activity feed
- Connection status (Connected, Pending, Not Connected)
- Contact options (if connected): Message, Email, Phone
- Follow/unfollow button (if not connected)
- Mutual connections counter
- Schools/teams coached (career history)
- Profile stats: Connections, Posts, Following

**Web Implementation Details:**

- Profile header: Avatar, name, title, school
- Bio section: Text bio, location, years of experience
- Activity tab: Recent posts, interactions
- Stats section: Connections, Posts, Following counts
- Action buttons: Connect, Message, Follow/Unfollow
- Privacy controls: What info is visible (based on connection status)
- Composable: `useSocialProfile` or `useCoachProfile` (need to verify)
- Data source: `coaches` table + `social_profiles` table

**iOS Considerations:**

- Header with profile photo (circular, 120pt)
- Segmented control for tabs: About, Activity, Stats
- Connect button = blue filled, Message = blue outline
- Activity feed = List with infinite scroll
- Mutual connections = NavigationLink to connections list
- Privacy states: Full profile (connected), Limited (not connected), Blocked
- Empty states: "This profile is private" or "No activity yet"

---

## Legal Section (2 pages)

### 4. Terms of Service (`/legal/terms.vue`)

**Key Features:**

- Legal text display (Markdown or HTML)
- Native iOS scrollable view
- Sections with headers (e.g., "1. Acceptance of Terms", "2. Use of Service")
- "Last Updated" date at top
- Accept/Decline flow (if first-time user or after update)
- Link handling (tap links to open Safari)
- Print/share functionality (optional)

**Web Implementation Details:**

- Full legal text displayed in scrollable div
- Markdown rendering with section headers
- Last updated timestamp
- No accept/decline buttons (static page)
- May load from CMS or static file
- Composable: None (static content)

**iOS Considerations:**

- ScrollView with Text (AttributedString for styled text)
- Markdown rendering via `AttributedString(markdown:)` (iOS 15+)
- Section headers = `.font(.headline)`
- Navigation bar with close button
- Link detection = `.onTapGesture` or UITextView
- Accept flow = modal with "Accept" / "Decline" buttons (if required)
- Accessibility: VoiceOver should read full text
- Print via UIActivityViewController

### 5. Privacy Policy (`/legal/privacy.vue`)

**Key Features:**

- Privacy policy text display (similar to Terms of Service)
- Data collection disclosures
- User rights section (GDPR, CCPA compliance)
- Contact information for privacy questions
- "Manage Privacy Settings" button (optional, links to settings)
- Last updated date

**Web Implementation Details:**

- Similar to Terms of Service (static legal text)
- Sections: Data Collection, Usage, Sharing, User Rights, Contact
- Markdown rendering
- May include links to settings page
- May load from CMS or static file

**iOS Considerations:**

- Same implementation pattern as Terms of Service
- ScrollView with styled text
- Optional "Manage Settings" button → navigate to app settings
- Links to external resources open in Safari
- Print/share functionality
- Accessibility support (VoiceOver)

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

### Social

- `/pages/social/index.vue` - Feed view
- `/pages/social/analytics.vue` - Analytics dashboard
- `/pages/social/coach/[id].vue` - Coach profile
- `/composables/useSocial.ts` (if exists)
- `/composables/useSocialAnalytics.ts` (if exists)
- `/types/models.ts` - Social models (Post, Connection, etc.)

### Legal

- `/pages/legal/terms.vue` - Terms of Service
- `/pages/legal/privacy.vue` - Privacy Policy
- May use static files: `/public/legal/terms.md` or CMS

---

## Important Notes from Previous Work

1. **Date Formatting:** Always use ISO 8601 format (`YYYY-MM-DD`) for consistency
2. **Authentication:** All pages use Supabase Auth Token in Keychain
3. **Family Context:** Multi-user support (parent viewing athlete data) - use `useActiveFamily`
4. **Error Handling:** Always try/catch async operations, show user-friendly messages
5. **Validation:** Client-side + server-side (Supabase constraints)
6. **Navigation:** Use NavigationLink or modal presentation based on context
7. **File Uploads:** Use Supabase Storage with progress tracking (Documents section pattern)
8. **Deletion:** Always confirm destructive actions (alert dialog)
9. **State Persistence:** Only persist filters/sort in UserDefaults if explicitly needed
10. **Performance:** Cache data for 5 minutes (stale-while-revalidate pattern)

---

## Social-Specific Considerations

1. **User Privacy:** Respect connection status (don't show private data to non-connections)
2. **Profile Visibility:** Public vs Private profiles (check `is_public` flag)
3. **Like/Comment Actions:** Optimistic UI updates (update immediately, revert on error)
4. **Feed Pagination:** Load 20 items at a time, implement infinite scroll
5. **Real-time Updates:** Consider WebSocket or polling for new posts (optional for MVP)
6. **User Avatars:** Use placeholder if no avatar uploaded
7. **Link Previews:** Extract metadata from URLs (title, description, thumbnail)
8. **Moderation:** Report/block functionality (if implemented)

---

## Legal-Specific Considerations

1. **Static Content:** Legal text may be hardcoded or loaded from CMS
2. **Versioning:** Track "Last Updated" date, notify users of changes
3. **Acceptance Tracking:** Store user acceptance in database (`legal_acceptances` table)
4. **Required Acceptance:** Block app usage until ToS accepted (if required)
5. **Markdown Rendering:** Use `AttributedString(markdown:)` for iOS 15+
6. **Link Handling:** External links open in Safari (SFSafariViewController)
7. **Accessibility:** Long documents require good VoiceOver support
8. **Offline Access:** Legal text should be available offline (bundle with app or cache)

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

Create these 5 files in `/planning/`:

1. `iOS_SPEC_Phase6_SocialFeed.md`
2. `iOS_SPEC_Phase6_SocialAnalytics.md`
3. `iOS_SPEC_Phase6_CoachSocialProfile.md`
4. `iOS_SPEC_Phase6_TermsOfService.md`
5. `iOS_SPEC_Phase6_PrivacyPolicy.md`

---

## Verification Checklist

Before marking complete, verify:

- [ ] All 5 specs created in `/planning/` directory
- [ ] Each spec follows 12-section template structure
- [ ] Data models defined as Swift structs/enums
- [ ] API endpoints documented with examples (or static content noted)
- [ ] UI/UX details include layout, design system, accessibility
- [ ] Testing checklist complete (4 sections)
- [ ] Sign-off section completed
- [ ] File naming follows pattern: `iOS_SPEC_Phase6_[PageName].md`

---

## Next Steps for Fresh Context

1. **Read this handoff document** to understand context
2. **Review template:** `/planning/iOS_PAGE_SPEC_TEMPLATE.md`
3. **Review example completed spec:** `/planning/iOS_SPEC_Phase6_DocumentsList.md` (comprehensive example)
4. **Start with Social section:**
   - Read web implementation: `/pages/social/index.vue`
   - Check composable: `/composables/useSocial.ts` (if exists)
   - Create `iOS_SPEC_Phase6_SocialFeed.md`
   - Repeat for Social Analytics and Coach Profile
5. **Continue with Legal section:**
   - Read web implementation: `/pages/legal/terms.vue`
   - Create `iOS_SPEC_Phase6_TermsOfService.md`
   - Repeat for Privacy Policy
6. **Mark Phase 6 complete** when all 10 specs created

---

## Questions to Resolve (if any)

- **Social Feed:** Confirm if posting functionality is implemented (or read-only feed)
- **Social Data Model:** Identify social tables in database (`posts`, `connections`, `social_profiles`, etc.)
- **Legal Content:** Confirm if legal text is hardcoded, CMS-managed, or static files
- **Acceptance Tracking:** Confirm if ToS acceptance is required on first launch
- **Chart Library:** For Social Analytics, confirm chart library availability (use Swift Charts if iOS 16+)

---

## Context/Contact

- **User preference:** Social features are networking features (connecting with other users/coaches)
- **Legal pages:** Native iOS views (not web embeds), use Markdown rendering
- **Admin pages:** Skipped for iOS MVP
- **Social networking confirmed:** Users can connect with coaches and other athletes

---

## Summary of Completed Patterns (Reference)

### Upload Pattern (Documents)

- File picker → validation → Supabase Storage upload → database record creation
- Progress indicator during upload
- Success/error feedback

### Preview Pattern (Documents)

- Video: AVPlayerViewController
- PDF: PDFView
- Image: Zoomable ScrollView + UIImageView

### Report Generation Pattern (Reports)

- Client-side data aggregation
- Date range selection (presets + custom)
- Statistics cards with icons/values
- CSV export via share sheet

### Timeline Pattern (Reports)

- Swimlane visualization (custom layout)
- Month headers (horizontal scroll)
- Today marker (red vertical line)
- Item positioning by date
- Multiple data sources (events, interactions, offers, status)

---

**Ready to continue in fresh context.** All necessary information provided above. 🚀

## File Count Summary

**Total Phase 6 Specs:** 10
**Completed:** 5
**Remaining:** 5

**Breakdown:**

- Documents: 3/3 ✅
- Reports: 2/2 ✅
- Social: 0/3 ⬅️ **Next**
- Legal: 0/2

**Estimated Time:** 3-4 hours for remaining 5 specs
