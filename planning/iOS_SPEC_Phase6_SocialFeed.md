# iOS Page Specification

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Social Media Monitoring
**Web Route:** `/social`
**Priority:** Phase 6 - Polish & Edge Cases
**Complexity:** High

---

## 1. Overview

### Purpose

Allows users to monitor and track social media posts from coaches and programs they're interested in. Users can view posts from Twitter/X and Instagram, filter by various criteria, flag posts for review, add personal notes, and sync new posts from external platforms.

**Important:** This is NOT a social networking feature. It's a monitoring tool for external social media content (Twitter/Instagram posts from coaches).

### Key User Actions

- View all social media posts from tracked coaches/schools
- Sync new posts from Twitter/Instagram
- Filter posts by platform, school, type (flagged, recruiting), sentiment
- Search posts by content, author name, or handle
- Flag posts for personal review
- Add private notes to posts
- Delete posts from monitoring feed
- Navigate to coach profile pages
- View analytics dashboard

### Success Criteria

- User can see all posts from monitored coaches
- Sync functionality fetches new posts successfully
- Filters work accurately (platform, school, sentiment, type)
- Search returns relevant results
- Flag/unflag actions persist
- Notes save successfully
- User receives feedback after sync operation
- Statistics cards display accurate counts

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Social Media Monitoring
2. System loads posts from Supabase
3. User sees statistics cards (total, Twitter, Instagram, flagged)
4. User sees list of social posts with content, author, platform
5. User taps "Sync Posts" button
6. System calls sync API endpoint
7. System fetches new posts from Twitter/Instagram APIs
8. System shows success/error message
9. System refreshes post list
10. User sees updated posts
```

### Alternative Flows

```
Flow B: Filter Posts
1. User taps filter button
2. System shows filter sheet with options:
   - Search (text input)
   - Platform (All, Twitter/X, Instagram)
   - School (dropdown)
   - Type (All, Flagged Only, Recruiting Only)
   - Sentiment (All, Very Positive, Positive, Neutral, Negative)
3. User selects filters
4. System applies filters and updates list
5. User sees filtered results with count

Flow C: Flag Post for Review
1. User taps flag icon on post card
2. System toggles flagged status
3. System updates post in Supabase
4. UI updates flag icon (filled = flagged, outline = unflagged)
5. Flagged count updates in statistics

Flow D: Add Notes to Post
1. User taps notes icon on post card
2. System shows notes sheet with text editor
3. User types notes
4. User taps "Save"
5. System updates post in Supabase
6. Sheet dismisses
7. Notes icon shows indicator (has notes)

Flow E: Delete Post
1. User swipes left on post card (or taps delete button)
2. System shows confirmation alert "Delete this post from your feed?"
3. User confirms
4. System deletes post from Supabase
5. Post removed from list
6. Statistics update
```

### Error Scenarios

```
Error: No posts available
- User sees: Empty state with icon, message "No posts yet", subtitle "Sync posts to start monitoring coach and program social media"
- Recovery: Tap "Sync Posts" button

Error: Sync failed
- User sees: Alert with error message "Sync failed: [reason]"
- Recovery: Check network connection, retry sync

Error: Network failure during fetch
- User sees: Banner "Unable to load posts. Check your connection."
- Recovery: Pull-to-refresh or tap retry button

Error: Filter returns no results
- User sees: Empty state "No posts match your filters"
- Recovery: Clear filters or adjust criteria
```

---

## 3. Data Models

### Primary Model

```swift
struct SocialPost: Codable, Identifiable {
  let id: String
  let coachId: String?
  let schoolId: String
  let platform: SocialPlatform
  let postUrl: String
  let postContent: String
  let postDate: String
  let authorHandle: String
  let authorName: String
  let isRecruitingRelated: Bool
  let flaggedForReview: Bool
  let sentiment: PostSentiment?
  let notes: String?
  let createdAt: String?
  let updatedAt: String?

  // Computed properties
  var platformIcon: String {
    switch platform {
    case .twitter: return "􀣐" // SF Symbol: twitter
    case .instagram: return "􀤀" // SF Symbol: photo.on.rectangle.angled
    }
  }

  var platformColor: Color {
    switch platform {
    case .twitter: return .blue
    case .instagram: return .pink
    }
  }

  var sentimentEmoji: String? {
    guard let sentiment = sentiment else { return nil }
    switch sentiment {
    case .veryPositive: return "🔥"
    case .positive: return "👍"
    case .neutral: return "😐"
    case .negative: return "👎"
    }
  }

  var relativeDate: String {
    guard let date = ISO8601DateFormatter().date(from: postDate) else {
      return "Unknown"
    }
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .abbreviated
    return formatter.localizedString(for: date, relativeTo: Date())
  }
}

enum SocialPlatform: String, Codable {
  case twitter = "twitter"
  case instagram = "instagram"
}

enum PostSentiment: String, Codable, CaseIterable {
  case veryPositive = "very_positive"
  case positive = "positive"
  case neutral = "neutral"
  case negative = "negative"

  var label: String {
    switch self {
    case .veryPositive: return "🔥 Very Positive"
    case .positive: return "👍 Positive"
    case .neutral: return "😐 Neutral"
    case .negative: return "👎 Negative"
    }
  }
}

struct SocialStatistics {
  let totalPosts: Int
  let twitterPosts: Int
  let instagramPosts: Int
  let flaggedPosts: Int
}
```

### Related Models

- `School` (for school filtering)
- `Coach` (for coach information)

### Data Origin

- **Source:** Supabase `social_media_posts` table
- **Refresh:** On page load, after sync, pull-to-refresh
- **Caching:** Cache for 5 minutes (stale-while-revalidate)
- **Mutations:** Create (via sync), Update (flag, notes), Delete

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch All Social Posts

```
GET via Supabase
Table: social_media_posts
Select: id, coach_id, school_id, platform, post_url, post_content, post_date, author_handle, author_name, is_recruiting_related, flagged_for_review, sentiment, notes, created_at, updated_at
Order: post_date DESC

Swift Example:
let response = try await supabase
  .from("social_media_posts")
  .select("*")
  .order("post_date", ascending: false)
  .execute()

Response:
[
  {
    "id": "uuid",
    "coach_id": "coach-uuid",
    "school_id": "school-uuid",
    "platform": "twitter",
    "post_url": "https://twitter.com/...",
    "post_content": "Excited to announce...",
    "post_date": "2026-02-10T14:30:00Z",
    "author_handle": "@coachsmith",
    "author_name": "Coach John Smith",
    "is_recruiting_related": true,
    "flagged_for_review": false,
    "sentiment": "positive",
    "notes": null,
    "created_at": "2026-02-10T14:35:00Z"
  }
]

Error Codes:
- 401: Not authenticated (redirect to login)
- 403: No access (show error)
- 500: Server error (show retry)
```

#### Endpoint 2: Sync New Posts

```
POST /api/social/sync

Headers:
Authorization: Bearer {auth_token}

Request Body: (none)

Response:
{
  "success": true,
  "message": "Synced 15 new posts",
  "newPostCount": 15
}

Error Codes:
- 401: Not authenticated
- 429: Rate limit exceeded (too many sync requests)
- 500: Sync failed (Twitter/Instagram API error)
```

#### Endpoint 3: Update Post (Flag or Notes)

```
PUT via Supabase
Table: social_media_posts
Filter: id = {post_id}

Swift Example (Flag):
try await supabase
  .from("social_media_posts")
  .update(["flagged_for_review": true])
  .eq("id", postId)
  .execute()

Swift Example (Notes):
try await supabase
  .from("social_media_posts")
  .update(["notes": "Important: Check eligibility requirements"])
  .eq("id", postId)
  .execute()

Response:
{
  "success": true,
  "data": { /* updated post */ }
}

Error Codes:
- 404: Post not found
- 500: Update failed
```

#### Endpoint 4: Delete Post

```
DELETE via Supabase
Table: social_media_posts
Filter: id = {post_id}

Swift Example:
try await supabase
  .from("social_media_posts")
  .delete()
  .eq("id", postId)
  .execute()

Response:
{ "success": true }

Error Codes:
- 404: Post not found
- 500: Delete failed
```

### Authentication

- **Method:** Supabase Auth Token (Bearer in header)
- **Token Storage:** iOS Keychain
- **Refresh:** Automatic via Supabase iOS SDK
- **Logout:** Clear token from Keychain

---

## 5. State Management

### Page-Level State

```swift
@Published var posts: [SocialPost] = []
@Published var schools: [School] = []
@Published var isLoading = false
@Published var error: String? = nil
@Published var isSyncing = false
@Published var syncMessage: String? = nil
@Published var syncMessageType: SyncMessageType = .success

// Filters
@Published var searchQuery = ""
@Published var selectedPlatform: SocialPlatform? = nil
@Published var selectedSchoolId: String? = nil
@Published var filterType: FilterType = .all
@Published var selectedSentiment: PostSentiment? = nil

enum FilterType {
  case all, flagged, recruiting
}

enum SyncMessageType {
  case success, error
}
```

### Persistence Across Navigation

- **Filters:** Not persisted (cleared on page exit)
- **Search query:** Not persisted
- **Posts:** Cached for 5 minutes

### Shared State (if cross-page)

- **Family context:** Active user/athlete via shared manager
- **Auth state:** Accessed from Supabase session manager
- **School list:** Shared for filters

---

## 6. UI/UX Details

### Layout Structure

```
[NavigationView]
  [Header]
    - Title: "Social Media Monitoring"
    - Subtitle: "Track posts from coaches & programs"
    - Actions: [Analytics Button] [Sync Button]

  [Sync Status Banner]
    - Shows success/error message after sync (auto-dismiss after 5 seconds)

  [Statistics Cards Row - Horizontal Scroll]
    - Total Posts (gray)
    - Twitter/X Posts (blue)
    - Instagram Posts (pink)
    - Flagged for Review (amber)

  [Filter Card]
    - Search bar (expandable)
    - Platform dropdown (All, Twitter/X, Instagram)
    - School dropdown (All Schools, [school list])
    - Type dropdown (All, Flagged Only, Recruiting Only)
    - Sentiment dropdown (All, 🔥 Very Positive, 👍 Positive, 😐 Neutral, 👎 Negative)
    - "Clear Filters" button

  [Content Area - ScrollView]
    - List of post cards (1 column)
    - Empty state (if no posts)
    - Loading skeleton (first load)
    - Pull-to-refresh
```

### Design System References

- **Color Palette:**
  - Primary: `#0066FF` (blue)
  - Twitter: `#1DA1F2` (blue)
  - Instagram: `#E1306C` (pink)
  - Success: `#00CC66` (green)
  - Warning: `#F59E0B` (amber)
  - Danger: `#FF3333` (red)
  - Gray backgrounds: `#F9FAFB`

- **Typography:**
  - Title: SF Pro Display, 34pt, bold
  - Subtitle: SF Pro Text, 14pt, regular, gray
  - Card titles: SF Pro Text, 16pt, semibold
  - Body: SF Pro Text, 14pt, regular

- **Spacing:** 16pt padding, 12pt gaps between cards
- **Radius:** 12pt for cards, 8pt for buttons

### Interactive Elements

#### Statistics Cards

- **Layout:** Horizontal ScrollView, 4 cards
- **Card Size:** 140pt width × 80pt height
- **Content:** Label (small, gray), value (large, colored)
- **Tap:** None (informational only)

#### Sync Button

- **Position:** Top-right corner of header
- **States:** Normal ("Sync Posts"), Loading ("Syncing...")
- **Disabled:** While syncing
- **Action:** Call sync API endpoint
- **Feedback:** Show success/error banner

#### Post Card

- **Layout:** Vertical stack
  - Header row: Platform icon + Author name + Author handle
  - Post date (relative: "2h ago")
  - Post content (3-5 lines, expandable on tap)
  - Footer row: Sentiment badge + Recruiting badge + Action buttons
- **Actions:** Flag button, Notes button, More menu (Delete)
- **Tap:** Expand/collapse full content
- **Long press:** Quick actions menu (Flag, Add Note, Delete)
- **Swipe left:** Delete action

#### Filter Sheet

- **Presentation:** Modal sheet, .medium detents
- **Sections:**
  1. Search (text field)
  2. Platform (segmented control or dropdown)
  3. School (dropdown with search)
  4. Type (segmented control: All, Flagged, Recruiting)
  5. Sentiment (dropdown with emojis)
- **Actions:** "Apply Filters", "Clear All"

#### Notes Sheet

- **Presentation:** Modal sheet, .large detents
- **Content:** TextEditor (multi-line, 10 rows min)
- **Actions:** "Save", "Cancel"
- **Keyboard:** Show immediately on open

### Loading States

```
First Load:
- Skeleton screens for 5 post cards
- 300ms delay before showing skeleton
- Shimmer animation

Reload (Pull-to-refresh):
- Activity indicator at top
- Content remains visible

Sync Loading:
- Button text changes to "Syncing..."
- Button disabled
- Spinner next to text

Empty State:
- Icon: 📱 (gray, 80pt)
- Title: "No posts yet"
- Subtitle: "Sync posts to start monitoring coach and program social media"
- CTA: "Sync Posts" button (blue)

Empty Filtered State:
- Icon: 🔍 (gray, 60pt)
- Title: "No posts match your filters"
- Subtitle: "Try adjusting your search or filter criteria"
- CTA: "Clear Filters" button (gray)

Error State:
- Red banner at top
- Error message (clear, user-friendly)
- Retry button
```

### Accessibility

- **VoiceOver:**
  - Post card: "[Platform] post from [Author]. [Date]. [Content preview]. [Sentiment]. [Flagged status]."
  - Sync button: "Sync new posts from Twitter and Instagram"
  - Filter button: "Filter posts. [X] filters active."
- **Color Contrast:** WCAG AA minimum (4.5:1 for text)
- **Touch Targets:** 44pt minimum for all buttons
- **Dynamic Type:** Support text size scaling

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 16+)
- Supabase iOS Client (for auth + data)
- Foundation (for date formatting, relative time)

### Third-Party Libraries

- None (use native iOS components)

### External Services

- Supabase PostgreSQL (`social_media_posts` table)
- Supabase Auth (session management)
- Twitter API (via sync endpoint)
- Instagram API (via sync endpoint)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out" banner + retry button
- **No internet:** Show offline mode indicator, disable sync button
- **Server error (5xx):** Show "Server error. Please try again." + retry

### Data Errors

- **Empty list:** Show empty state with CTA
- **Invalid post record:** Skip and log error (don't crash)
- **Missing school_id:** Display "Unknown School"
- **Missing coach_id:** Display author info from post data

### User Errors

- **Search returns no results:** Show empty filtered state
- **Sync rate limit exceeded:** Alert: "Please wait a few minutes before syncing again."
- **Delete confirmation cancelled:** Do nothing, return to list

### Edge Cases

- **Very long post content:** Show first 5 lines, "Read more" expands
- **Large lists (500+ posts):** Implement pagination (load 50 at a time, infinite scroll)
- **Concurrent sync requests:** Disable sync button while syncing
- **Duplicate posts:** Supabase handles via unique constraint on post_url
- **Sync fetches 0 new posts:** Show message: "No new posts found. You're up to date!"
- **Flagged count > 100:** Truncate to "99+" in statistics card

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays all posts correctly
- [ ] Statistics cards show accurate counts
- [ ] User can sync new posts successfully
- [ ] User can filter posts by platform
- [ ] User can filter posts by school
- [ ] User can filter posts by type (flagged, recruiting)
- [ ] User can filter posts by sentiment
- [ ] User can search posts by content
- [ ] User can flag/unflag a post
- [ ] User can add notes to a post
- [ ] User can delete a post
- [ ] User can clear all filters
- [ ] User can navigate to analytics page
- [ ] Pull-to-refresh works

### Error Tests

- [ ] Handle network timeout during fetch (show retry)
- [ ] Handle 401 error (redirect to login)
- [ ] Handle sync failure (show alert with reason)
- [ ] Handle empty data set (show empty state)
- [ ] Handle server errors (5xx) (show retry)
- [ ] Handle rate limit error (show appropriate message)

### Edge Case Tests

- [ ] Very long post content doesn't break layout (truncates/expands)
- [ ] Large lists (100+ posts) load efficiently (pagination)
- [ ] Rapid taps on sync button don't create duplicate requests
- [ ] VoiceOver reads post cards correctly
- [ ] Page adapts to different device sizes (SE, 13, 15+, iPad)
- [ ] Dynamic Type scales text properly
- [ ] Filter with no results shows appropriate message
- [ ] Multiple filters applied simultaneously work correctly
- [ ] Sync with 0 new posts shows appropriate message

### Performance Tests

- [ ] Page loads in <2 seconds on 4G (with cached data)
- [ ] List scrolling is smooth (60 fps) with 50+ posts
- [ ] No memory leaks when navigating away
- [ ] Sync completes in <5 seconds (normal case)

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Manual sync only:** Web doesn't implement real-time updates; user must click "Sync Posts"
- **No post creation:** App only monitors external posts, doesn't create/publish new posts
- **Sentiment analysis:** Sentiment field may be null if analysis hasn't run
- **Twitter API rate limits:** Sync may be throttled if too many requests

### iOS-Specific Considerations

- **Background sync:** iOS could implement background fetch for periodic syncing (optional for Phase 6)
- **Push notifications:** Could notify users of new posts from key coaches (future feature)
- **Embedded web views:** Opening post URLs may require SFSafariViewController
- **Refresh timing:** Don't auto-refresh too frequently to avoid API rate limits
- **Offline mode:** Posts cached locally, but sync requires network connection

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/social/index.vue`
- **Composables used:**
  - `useSocialMedia` (fetch, toggle flag, delete, update)
  - `useSchools` (school dropdown)
  - `useCoaches` (coach information)
- **API endpoints:**
  - POST `/api/social/sync` (fetch new posts from Twitter/Instagram)
  - Supabase direct queries (fetch, update, delete)

### Design References

- **Figma:** (Not provided)
- **Brand Guidelines:** Follow SF Design System, iOS HIG

### API Documentation

- **Supabase Docs:** https://supabase.com/docs
- **Database Schema:** `social_media_posts` table in Supabase
- **Twitter API:** External sync integration
- **Instagram API:** External sync integration

---

## 12. Sign-Off

**Specification reviewed by:** Claude (AI Assistant)
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:**

- Clarified that this is social media **monitoring**, not social networking
- Sync is manual (not automatic/real-time) - future enhancement opportunity
- Consider implementing background fetch for periodic syncing
- Consider push notifications for important posts (e.g., recruiting announcements)
- Post content should be sanitized (XSS prevention) - handled by web composable

---

## Appendix A: Example Implementation Reference

### Similar Pages in Codebase

- **Documents List** (`iOS_SPEC_Phase6_DocumentsList.md`) - Similar filter/search pattern
- **Interactions List** - Similar card-based list with notes/flags

### Code Snippets from Web

```typescript
// Sync posts API call (from web)
const syncPosts = async () => {
  syncing.value = true;
  try {
    const response = await $fetch("/api/social/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    syncMessage.value = response.message || "Posts synced successfully";
    await fetchPosts(); // Refresh list
  } catch (err) {
    syncMessage.value = err.message || "Failed to sync posts";
  } finally {
    syncing.value = false;
  }
};

// Filter logic (from web)
const filteredPosts = computed(() => {
  let filtered = allPosts.value;

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.post_content.toLowerCase().includes(query) ||
        p.author_name.toLowerCase().includes(query) ||
        p.author_handle.toLowerCase().includes(query),
    );
  }

  if (selectedPlatform.value) {
    filtered = filtered.filter((p) => p.platform === selectedPlatform.value);
  }

  if (selectedSchool.value) {
    filtered = filtered.filter((p) => p.school_id === selectedSchool.value);
  }

  if (filterType.value === "flagged") {
    filtered = filtered.filter((p) => p.flagged_for_review);
  } else if (filterType.value === "recruiting") {
    filtered = filtered.filter((p) => p.is_recruiting_related);
  }

  if (selectedSentiment.value) {
    filtered = filtered.filter((p) => p.sentiment === selectedSentiment.value);
  }

  return filtered;
});
```
