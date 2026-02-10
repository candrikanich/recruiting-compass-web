# iOS Page Specification

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Coach Social Profile
**Web Route:** `/social/coach/[id]`
**Priority:** Phase 6 - Polish & Edge Cases
**Complexity:** Medium

---

## 1. Overview

### Purpose

Displays a specific coach's social media activity, showing their Twitter/Instagram information and all posts from that coach. Users can view coach contact details, see statistics about their posting activity, and manage posts (flag, add notes, delete).

**Important:** This shows **external social media posts** from a coach's Twitter/Instagram accounts, not an internal social profile.

### Key User Actions

- View coach information (name, role, school)
- See coach Twitter/Instagram handles (with links to external profiles)
- View statistics (total posts, Twitter posts, Instagram posts, flagged posts)
- See list of all posts from this coach
- Flag/unflag posts for review
- Add private notes to posts
- Delete posts from monitoring feed
- Navigate to coach detail page
- Navigate back to social feed

### Success Criteria

- User can see coach information and social handles
- Statistics display accurate counts for this coach
- Posts list shows only posts from this coach
- Social handles link to external Twitter/Instagram profiles
- Flag/unflag actions persist
- Notes save successfully
- User can navigate to related pages

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Coach Social Profile (from social feed or coach detail)
2. System extracts coach ID from URL parameter
3. System fetches coach details from Supabase
4. System fetches school information (if coach has school_id)
5. System fetches all social posts filtered by coach_id
6. User sees coach header (name, role, school, social handles)
7. User sees statistics cards (total, Twitter, Instagram, flagged)
8. User sees list of posts from this coach
```

### Alternative Flows

```
Flow B: Open External Social Profile
1. User taps Twitter/Instagram handle link
2. System opens SFSafariViewController with external URL
   - Twitter: https://twitter.com/[handle]
   - Instagram: https://instagram.com/[handle]
3. User views external profile in in-app browser
4. User closes browser, returns to app

Flow C: Navigate to Coach Detail
1. User taps "View Coach Profile" button
2. System navigates to Coach Detail page
3. User sees full coach information

Flow D: Flag Post
1. User taps flag icon on post card
2. System toggles flagged status
3. System updates post in Supabase
4. UI updates flag icon
5. Flagged count updates in statistics

Flow E: Add Notes
1. User taps notes icon on post card
2. System shows notes sheet
3. User types notes
4. User taps "Save"
5. System updates post in Supabase
6. Sheet dismisses

Flow F: Delete Post
1. User swipes left on post card
2. System shows confirmation alert
3. User confirms
4. System deletes post from Supabase
5. Post removed from list
6. Statistics update
```

### Error Scenarios

```
Error: Coach not found
- User sees: "Coach not found" message with back button
- Recovery: Navigate back to social feed

Error: No posts from coach
- User sees: Empty state with message "No posts from this coach yet"
- Recovery: Navigate back or sync posts

Error: Network failure
- User sees: Banner "Unable to load coach profile. Check your connection."
- Recovery: Pull-to-refresh or tap retry button

Error: Missing social handles
- UI shows: Coach info without social links section
- Other content displays normally
```

---

## 3. Data Models

### Primary Model

```swift
// Uses Coach model from coaches domain
struct Coach: Codable, Identifiable {
  let id: String
  let schoolId: String?
  let firstName: String
  let lastName: String
  let role: CoachRole
  let twitterHandle: String?
  let instagramHandle: String?
  // ... other coach fields

  var fullName: String {
    "\(firstName) \(lastName)"
  }

  var roleLabel: String {
    // Convert role enum to display label
    // e.g., .headCoach → "Head Coach"
  }

  var twitterUrl: String? {
    guard let handle = twitterHandle else { return nil }
    let cleanHandle = handle.replacingOccurrences(of: "@", with: "")
    return "https://twitter.com/\(cleanHandle)"
  }

  var instagramUrl: String? {
    guard let handle = instagramHandle else { return nil }
    let cleanHandle = handle.replacingOccurrences(of: "@", with: "")
    return "https://instagram.com/\(cleanHandle)"
  }
}

// Uses SocialPost model from Social Feed
// (same model as in Social Feed spec)

struct CoachPostStatistics {
  let totalPosts: Int
  let twitterPosts: Int
  let instagramPosts: Int
  let flaggedPosts: Int
}
```

### Related Models

- `SocialPost` (from Social Feed)
- `School` (for school name display)

### Data Origin

- **Source:**
  - Coach: Supabase `coaches` table
  - School: Supabase `schools` table
  - Posts: Supabase `social_media_posts` table (filtered by coach_id)
- **Refresh:** On page load, pull-to-refresh
- **Caching:** Cache for 5 minutes
- **Mutations:** Update posts (flag, notes), Delete posts

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch Coach Details

```
GET via Supabase
Table: coaches
Filter: id = {coach_id}
Select: id, school_id, first_name, last_name, role, twitter_handle, instagram_handle

Swift Example:
let response = try await supabase
  .from("coaches")
  .select("id, school_id, first_name, last_name, role, twitter_handle, instagram_handle")
  .eq("id", coachId)
  .single()
  .execute()

Response:
{
  "id": "uuid",
  "school_id": "school-uuid",
  "first_name": "John",
  "last_name": "Smith",
  "role": "head_coach",
  "twitter_handle": "@coachsmith",
  "instagram_handle": "@coachsmith_official"
}

Error Codes:
- 401: Not authenticated
- 404: Coach not found
- 500: Server error
```

#### Endpoint 2: Fetch School Name

```
GET via Supabase
Table: schools
Filter: id = {school_id}
Select: name

Swift Example:
let response = try await supabase
  .from("schools")
  .select("name")
  .eq("id", schoolId)
  .single()
  .execute()

Response:
{
  "name": "Stanford University"
}

Error Codes:
- 404: School not found (coach may not have school_id)
```

#### Endpoint 3: Fetch Posts by Coach

```
GET via Supabase
Table: social_media_posts
Filter: coach_id = {coach_id}
Select: * (all fields)
Order: post_date DESC

Swift Example:
let response = try await supabase
  .from("social_media_posts")
  .select("*")
  .eq("coach_id", coachId)
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
    "sentiment": "positive"
  }
]

Error Codes:
- 401: Not authenticated
- 500: Server error
```

#### Endpoint 4: Update Post (Flag or Notes)

```
(Same as Social Feed spec - see iOS_SPEC_Phase6_SocialFeed.md)
```

#### Endpoint 5: Delete Post

```
(Same as Social Feed spec - see iOS_SPEC_Phase6_SocialFeed.md)
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
@Published var coach: Coach? = nil
@Published var schoolName: String? = nil
@Published var posts: [SocialPost] = []
@Published var isLoading = false
@Published var error: String? = nil

var statistics: CoachPostStatistics {
  CoachPostStatistics(
    totalPosts: posts.count,
    twitterPosts: posts.filter { $0.platform == .twitter }.count,
    instagramPosts: posts.filter { $0.platform == .instagram }.count,
    flaggedPosts: posts.filter { $0.flaggedForReview }.count
  )
}
```

### Persistence Across Navigation

- **Coach data:** Not persisted (refetch on navigation)
- **Posts:** Not persisted (could share cache with Social Feed)

### Shared State (if cross-page)

- **Auth state:** Accessed from Supabase session manager
- **Posts:** Could share cache with Social Feed to avoid duplicate fetch

---

## 6. UI/UX Details

### Layout Structure

```
[NavigationView]
  [Back Link]
    - "← Back to Social Feed" (top-left)

  [ScrollView]
    [Coach Header Card]
      - Name: Large, bold (34pt)
      - Role: Medium, gray (18pt)
      - School: Small, gray (14pt)

      [Divider]

      [Social Handles Row]
        - Twitter icon + handle (blue) → link
        - Instagram icon + handle (pink) → link

      [Divider]

      [Action Button]
        - "👤 View Coach Profile" (gray button)

    [Statistics Cards Row - 2×2 Grid]
      - Total Posts (gray)
      - Twitter/X Posts (blue)
      - Instagram Posts (pink)
      - Flagged for Review (amber)

    [Posts List Section]
      - Title: "Posts" (if has posts)
      - Empty state (if no posts)
      - Post cards (same as Social Feed)
```

### Design System References

- **Color Palette:**
  - Primary: `#0066FF` (blue)
  - Twitter: `#1DA1F2` (blue)
  - Instagram: `#E1306C` (pink)
  - Warning: `#F59E0B` (amber)
  - Gray backgrounds: `#F9FAFB`

- **Typography:**
  - Coach name: SF Pro Display, 34pt, bold
  - Role: SF Pro Text, 18pt, regular, gray
  - School: SF Pro Text, 14pt, regular, gray
  - Social handles: SF Pro Text, 16pt, medium, blue/pink

- **Spacing:** 16pt padding, 12pt gaps
- **Radius:** 12pt for cards, 8pt for buttons

### Interactive Elements

#### Coach Header Card

- **Background:** White
- **Padding:** 20pt
- **Sections:** Name/Role/School, Social Handles, Action Button
- **Dividers:** Gray, 1pt height

#### Social Handle Links

- **Layout:** Horizontal row, 2 items
- **Each item:** Icon (24pt) + Handle text
- **Colors:** Twitter = blue, Instagram = pink
- **Tap:** Open SFSafariViewController with external URL
- **Icon:** SF Symbols: "􀣐" (twitter), "􀤀" (photo.on.rectangle.angled)

#### View Coach Profile Button

- **Style:** Gray background, gray text, rounded
- **Size:** Full width, 48pt height
- **Icon:** 👤 emoji before text
- **Tap:** Navigate to Coach Detail page

#### Statistics Cards

- **Layout:** 2×2 grid on iPhone, 4 columns on iPad
- **Card Size:** Flexible height, min 80pt
- **Content:** Label (small, gray), value (large, colored)
- **Tap:** None (informational only)

#### Post Cards

- **Same as Social Feed** (see iOS_SPEC_Phase6_SocialFeed.md)
- Includes: Content, author, platform, date, sentiment, flag button, notes button, delete action

### Loading States

```
First Load:
- Skeleton for coach header
- Skeleton for statistics cards
- Skeleton for 3 post cards
- 300ms delay before showing skeleton

Reload (Pull-to-refresh):
- Activity indicator at top
- Content remains visible

Empty State (No posts):
- Icon: 📱 (gray, 60pt)
- Title: "No posts from this coach"
- Subtitle: "Social posts will appear here once [FirstName] posts on tracked accounts"

Error State (Coach not found):
- Icon: ❌ (red, 60pt)
- Title: "Coach not found"
- Subtitle: "This coach may have been removed"
- CTA: "Back to Social Feed" button

Error State (Network failure):
- Red banner at top
- Error message
- Retry button
```

### Accessibility

- **VoiceOver:**
  - Coach header: "[Name]. [Role] at [School]."
  - Social handle: "[Platform] handle: [Handle]. Double tap to open external profile."
  - View Coach button: "View full coach profile"
  - Statistics: "[Label]: [Value]"
  - Posts: Same as Social Feed
- **Color Contrast:** WCAG AA minimum (4.5:1)
- **Touch Targets:** 44pt minimum
- **Dynamic Type:** Support text size scaling

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 16+)
- SafariServices (for SFSafariViewController)
- Supabase iOS Client (for auth + data)
- Foundation (for URL handling)

### Third-Party Libraries

- None (use native iOS components)

### External Services

- Supabase PostgreSQL (`coaches`, `schools`, `social_media_posts` tables)
- Supabase Auth (session management)
- Twitter website (external links)
- Instagram website (external links)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out" banner + retry button
- **No internet:** Show offline mode indicator
- **Server error (5xx):** Show "Server error. Please try again." + retry

### Data Errors

- **Coach not found:** Show error state with back button
- **School not found:** Display coach info without school name
- **No posts:** Show empty state with helpful message
- **Missing social handles:** Hide social handles section

### User Errors

- None (page is read-only except for post management)

### Edge Cases

- **Coach with no social handles:** Don't show social handles section
- **Coach not assigned to school:** Display coach info without school name
- **External link fails to open:** Show alert "Unable to open [Platform]"
- **Large number of posts (500+):** Implement pagination (load 50 at a time)
- **Coach deleted while viewing:** Show error state on next interaction

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays coach information correctly
- [ ] School name displays correctly (if coach has school)
- [ ] Twitter handle displays and links correctly
- [ ] Instagram handle displays and links correctly
- [ ] Statistics cards show accurate counts
- [ ] Posts list shows only posts from this coach
- [ ] User can flag/unflag a post
- [ ] User can add notes to a post
- [ ] User can delete a post
- [ ] User can navigate to coach detail page
- [ ] User can navigate back to social feed
- [ ] Pull-to-refresh works

### Error Tests

- [ ] Handle network timeout during fetch (show retry)
- [ ] Handle 401 error (redirect to login)
- [ ] Handle coach not found (show error state)
- [ ] Handle empty posts list (show empty state)
- [ ] Handle server errors (5xx) (show retry)
- [ ] Handle missing school gracefully (no crash)
- [ ] Handle missing social handles (hide section)

### Edge Case Tests

- [ ] Coach with no social handles doesn't show social section
- [ ] Coach with no school displays without school name
- [ ] Large number of posts (100+) load efficiently
- [ ] External links open correctly in Safari
- [ ] VoiceOver reads coach info correctly
- [ ] Page adapts to different device sizes (SE, 13, 15+, iPad)
- [ ] Dynamic Type scales text properly

### Performance Tests

- [ ] Page loads in <2 seconds on 4G
- [ ] List scrolling is smooth (60 fps) with 50+ posts
- [ ] No memory leaks when navigating away
- [ ] Safari view controller opens/closes smoothly

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **No profile photo:** Web doesn't display coach profile photos (could be future feature)
- **No bio/description:** Page shows only basic contact info, not full coach bio
- **No follower counts:** Web doesn't fetch Twitter/Instagram follower counts

### iOS-Specific Considerations

- **SFSafariViewController:** External links open in in-app browser (user may prefer native Twitter/Instagram apps)
- **Deep linking:** Could implement deep linking to native Twitter/Instagram apps if installed
- **Handle validation:** Ensure handles are properly formatted (with/without @ symbol)
- **URL escaping:** Handle special characters in handles properly

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/social/coach/[id].vue`
- **Composables used:**
  - `useCoaches` (getCoach)
  - `useSchools` (getSchool)
  - `useSocialMedia` (fetch posts, toggle flag, delete, update)
- **Utilities:**
  - `getRoleLabel` (convert role enum to display label)
- **API endpoints:** Supabase direct queries

### Design References

- **Figma:** (Not provided)
- **Brand Guidelines:** Follow SF Design System, iOS HIG

### API Documentation

- **Supabase Docs:** https://supabase.com/docs
- **Database Schema:** `coaches`, `schools`, `social_media_posts` tables

---

## 12. Sign-Off

**Specification reviewed by:** Claude (AI Assistant)
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:**

- Simple profile page focused on social media activity
- Could enhance with coach profile photo in future
- Consider deep linking to native Twitter/Instagram apps
- Could add filter/sort options for posts if needed
- Statistics update automatically when posts are flagged/deleted

---

## Appendix A: Example Implementation Reference

### Similar Pages in Codebase

- **Coach Detail** - Similar header layout with coach information
- **Social Feed** - Same post card pattern

### Code Snippets from Web

```typescript
// Fetch coach and posts (from web)
onMounted(async () => {
  try {
    // Fetch coach details
    const coachData = await getCoach(coachId);
    if (coachData) {
      coach.value = coachData;

      // Fetch school name
      if (coachData.school_id) {
        const schoolData = await getSchool(coachData.school_id);
        if (schoolData) {
          schoolName.value = schoolData.name;
        }
      }

      // Fetch posts for this coach
      await fetchPosts({ coachId });
    }
  } catch (err) {
    console.error("Error loading data:", err);
  }
});

// Statistics computation (from web)
const coachTwitterCount = computed(
  () => coachPosts.value.filter((p) => p.platform === "twitter").length,
);
const coachInstagramCount = computed(
  () => coachPosts.value.filter((p) => p.platform === "instagram").length,
);
const coachFlaggedCount = computed(
  () => coachPosts.value.filter((p) => p.flagged_for_review).length,
);

// External URL generation
const twitterUrl = coach.twitter_handle
  ? `https://twitter.com/${coach.twitter_handle.replace("@", "")}`
  : null;
const instagramUrl = coach.instagram_handle
  ? `https://instagram.com/${coach.instagram_handle.replace("@", "")}`
  : null;
```
