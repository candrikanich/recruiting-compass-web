# iOS Page Specification

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Social Analytics
**Web Route:** `/social/analytics`
**Priority:** Phase 6 - Polish & Edge Cases
**Complexity:** High

---

## 1. Overview

### Purpose

Provides analytics and insights into social media activity from tracked coaches and programs. Users can view trends in post volume, sentiment distribution, platform distribution, activity patterns by day, and identify the most active schools. Helps users understand recruiting communication patterns and identify important trends.

**Important:** Analytics are for **social media monitoring** (Twitter/Instagram posts from coaches), not user engagement metrics.

### Key User Actions

- View summary statistics (total posts, recruiting posts, positive sentiment, active schools)
- Select time range (7 days, 30 days, 90 days, All Time)
- View sentiment distribution chart
- View platform distribution (Twitter vs Instagram)
- View activity by day chart
- View top schools by post volume
- View recent recruiting posts
- Navigate back to social feed
- Navigate to school detail pages

### Success Criteria

- User can see accurate statistics for selected time range
- Time range filter works correctly
- Charts display data accurately
- Activity by day shows daily post counts
- Top schools list shows correct ranking
- Recent recruiting posts display correctly
- User can navigate to related pages

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Social Analytics from Social Feed
2. System loads all posts from Supabase
3. System filters posts by default time range (30 days)
4. System calculates statistics (total, recruiting, sentiment, active schools)
5. User sees summary stats cards
6. User sees sentiment distribution chart
7. User sees platform distribution counts
8. User sees activity by day chart
9. User sees top 5 schools by post count
10. User sees 5 most recent recruiting posts
```

### Alternative Flows

```
Flow B: Change Time Range
1. User taps time range button (7 Days, 30 Days, 90 Days, All Time)
2. System re-filters posts by selected range
3. System recalculates all statistics and charts
4. UI updates with new data
5. Selected button highlights

Flow C: View School Detail
1. User taps school name in "Top Schools" list
2. System navigates to school detail page
3. User sees full school information

Flow D: View All Posts
1. User taps "View All →" link in Recent Recruiting Posts section
2. System navigates back to Social Feed
3. Feed shows with recruiting filter applied
```

### Error Scenarios

```
Error: No posts in selected time range
- User sees: Empty state in each chart section
- Message: "No posts in selected period"
- Recovery: Select different time range (All Time)

Error: Network failure during fetch
- User sees: Banner "Unable to load analytics. Check your connection."
- Recovery: Pull-to-refresh or tap retry button

Error: Missing sentiment data
- Sentiment chart shows: "No sentiment data available"
- Other charts still display correctly
```

---

## 3. Data Models

### Primary Model

```swift
// Uses same SocialPost model from Social Feed

struct AnalyticsSummary {
  let totalPosts: Int
  let recruitingPosts: Int
  let recruitingPercentage: Int
  let positivePosts: Int
  let positivePercentage: Int
  let activeSchools: Int
}

struct SentimentStat {
  let type: PostSentiment
  let label: String
  let count: Int
  let percentage: Double
  let colorClass: Color

  static func calculate(posts: [SocialPost]) -> [SentimentStat] {
    let counts: [PostSentiment: Int] = Dictionary(
      grouping: posts.compactMap { $0.sentiment },
      by: { $0 }
    ).mapValues { $0.count }

    let total = counts.values.reduce(0, +)

    return PostSentiment.allCases.map { sentiment in
      let count = counts[sentiment] ?? 0
      return SentimentStat(
        type: sentiment,
        label: sentiment.label,
        count: count,
        percentage: total > 0 ? Double(count) / Double(total) * 100 : 0,
        colorClass: sentiment.color
      )
    }
  }
}

extension PostSentiment {
  var color: Color {
    switch self {
    case .veryPositive: return .green
    case .positive: return .blue
    case .neutral: return .gray
    case .negative: return .red
    }
  }
}

struct DayActivity {
  let date: String
  let label: String
  let count: Int
  let height: Double // 0-100% for bar chart
}

struct SchoolActivity {
  let id: String
  let name: String
  let postCount: Int
}
```

### Related Models

- `SocialPost` (from Social Feed)
- `School` (for school names)

### Data Origin

- **Source:** Same as Social Feed (`social_media_posts` table)
- **Refresh:** On page load, when time range changes
- **Caching:** Cache for 5 minutes (stale-while-revalidate)
- **Mutations:** None (read-only analytics)

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch All Social Posts

```
GET via Supabase
Table: social_media_posts
Select: id, school_id, platform, post_date, is_recruiting_related, sentiment, post_content, author_handle
Order: post_date DESC

Swift Example:
let response = try await supabase
  .from("social_media_posts")
  .select("id, school_id, platform, post_date, is_recruiting_related, sentiment, post_content, author_handle")
  .order("post_date", ascending: false)
  .execute()

Response:
[
  {
    "id": "uuid",
    "school_id": "school-uuid",
    "platform": "twitter",
    "post_date": "2026-02-10T14:30:00Z",
    "is_recruiting_related": true,
    "sentiment": "positive",
    "post_content": "...",
    "author_handle": "@coachsmith"
  }
]

Note: Analytics are computed client-side, no aggregation API endpoint needed.

Error Codes:
- 401: Not authenticated (redirect to login)
- 403: No access (show error)
- 500: Server error (show retry)
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
@Published var selectedTimeRange: TimeRange = .thirtyDays

enum TimeRange: Int, CaseIterable {
  case sevenDays = 7
  case thirtyDays = 30
  case ninetyDays = 90
  case allTime = 0

  var label: String {
    switch self {
    case .sevenDays: return "7 Days"
    case .thirtyDays: return "30 Days"
    case .ninetyDays: return "90 Days"
    case .allTime: return "All Time"
    }
  }
}
```

### Computed Properties

```swift
var filteredPosts: [SocialPost] {
  guard selectedTimeRange != .allTime else { return posts }

  let cutoffDate = Calendar.current.date(
    byAdding: .day,
    value: -selectedTimeRange.rawValue,
    to: Date()
  ) ?? Date()

  return posts.filter { post in
    guard let postDate = ISO8601DateFormatter().date(from: post.postDate) else {
      return false
    }
    return postDate >= cutoffDate
  }
}

var summary: AnalyticsSummary {
  let total = filteredPosts.count
  let recruiting = filteredPosts.filter { $0.isRecruitingRelated }.count
  let positive = filteredPosts.filter {
    $0.sentiment == .positive || $0.sentiment == .veryPositive
  }.count
  let analyzed = filteredPosts.filter { $0.sentiment != nil }.count
  let schoolIds = Set(filteredPosts.map { $0.schoolId })

  return AnalyticsSummary(
    totalPosts: total,
    recruitingPosts: recruiting,
    recruitingPercentage: total > 0 ? Int(Double(recruiting) / Double(total) * 100) : 0,
    positivePosts: positive,
    positivePercentage: analyzed > 0 ? Int(Double(positive) / Double(analyzed) * 100) : 0,
    activeSchools: schoolIds.count
  )
}
```

### Persistence Across Navigation

- **Time range selection:** Not persisted (resets to 30 days)
- **Posts:** Shared cache with Social Feed

### Shared State (if cross-page)

- **Posts data:** Could share with Social Feed to avoid duplicate fetch
- **School list:** Shared across app

---

## 6. UI/UX Details

### Layout Structure

```
[NavigationView]
  [Header]
    - Title: "Social Analytics"
    - Subtitle: "Trends and insights from coach and program social media"

  [Time Range Selector - Horizontal Row]
    - [7 Days] [30 Days] [90 Days] [All Time]
    - Selected: blue background, white text
    - Unselected: gray background, gray text

  [ScrollView]
    [Summary Stats Cards - 2×2 Grid]
      - Total Posts (gray)
      - Recruiting Posts (green, with percentage)
      - Positive Sentiment (blue, with percentage)
      - Active Schools (purple)

    [Charts Row - 2 columns on iPad, stacked on iPhone]
      [Sentiment Distribution Card]
        - Title: "Sentiment Distribution"
        - Horizontal bar chart with percentages
        - Each bar: label (left), bar (middle), count (right)

      [Platform Distribution Card]
        - Title: "Platform Distribution"
        - Two large icons with counts
        - Twitter icon (blue) + count
        - Instagram icon (pink) + count

    [Activity by Day Card]
      - Title: "Activity by Day"
      - Bar chart (vertical bars, one per day)
      - X-axis: first day ... last day labels
      - Hover/tap shows tooltip: "[Date]: [X] posts"

    [Top Schools Card]
      - Title: "Most Active Schools"
      - Numbered list (1-5)
      - School name (tappable) + post count

    [Recent Recruiting Posts Card]
      - Title: "Recent Recruiting Posts"
      - Action: "View All →" link
      - List of 5 most recent recruiting posts
      - Each: platform icon, author handle, date, content preview (2 lines)
```

### Design System References

- **Color Palette:**
  - Primary: `#0066FF` (blue)
  - Success: `#00CC66` (green)
  - Purple: `#9333EA`
  - Twitter: `#1DA1F2` (blue)
  - Instagram: `#E1306C` (pink)
  - Gray backgrounds: `#F9FAFB`
  - Sentiment colors: green (positive), blue (positive), gray (neutral), red (negative)

- **Typography:**
  - Title: SF Pro Display, 34pt, bold
  - Subtitle: SF Pro Text, 14pt, regular, gray
  - Card titles: SF Pro Text, 18pt, semibold
  - Stats values: SF Pro Display, 32pt, bold
  - Body: SF Pro Text, 14pt, regular

- **Spacing:** 16pt padding, 12pt gaps between cards
- **Radius:** 12pt for cards, 8pt for buttons

### Interactive Elements

#### Time Range Buttons

- **Layout:** Horizontal row, equal width
- **Selected:** Blue background, white text, no border
- **Unselected:** Gray background (#F3F4F6), gray text, no border
- **Tap:** Update selectedTimeRange, recalculate all stats

#### Summary Stats Cards

- **Layout:** 2×2 grid on iPhone, 4 columns on iPad
- **Card Size:** Flexible height, min 100pt
- **Content:** Label (small, gray), value (large, colored), subtitle (extra small, gray)
- **Tap:** None (informational only)

#### Sentiment Distribution Chart

- **Layout:** Horizontal bar chart
- **Rows:** 4 (one per sentiment type)
- **Each row:** Label (left, 100pt width), bar (flexible, gray background with colored fill), count (right, 50pt width)
- **Animation:** Bars animate width on load (0% → final%)

#### Platform Distribution

- **Layout:** Two columns, centered
- **Each column:** SF Symbol icon (48pt), count (below, large), label (below, small)
- **Icons:** "􀣐" (twitter), "􀤀" (photo.on.rectangle.angled for Instagram)

#### Activity by Day Chart

- **Layout:** Horizontal bar chart with vertical bars
- **Bars:** Equal width, variable height (0-100% based on max count)
- **Interaction:** Tap bar to show tooltip with exact date and count
- **X-axis labels:** First date (left), last date (right)

#### Top Schools List

- **Layout:** Numbered list (1-5)
- **Row:** Rank number (gray, fixed width 30pt), school name (flexible, blue = tappable), post count (right, semibold)
- **Tap:** Navigate to school detail page

#### Recent Recruiting Posts

- **Layout:** List of 5 cards
- **Card:** Platform icon (left), author handle, date (top-right), content preview (2 lines, gray)
- **Tap:** Could navigate to post detail (future feature) or just show full content

### Loading States

```
First Load:
- Skeleton screens for all cards
- 300ms delay before showing skeleton
- Shimmer animation

Reload (Time range change):
- Brief opacity fade (0.5 seconds)
- Content updates immediately

Empty State (No posts in time range):
- Icon: 📊 (gray, 60pt)
- Title: "No posts in selected period"
- Subtitle: "Try selecting a longer time range"
- Each chart section shows: "No data available"

Error State:
- Red banner at top
- Error message (clear, user-friendly)
- Retry button
```

### Accessibility

- **VoiceOver:**
  - Stats card: "[Label]: [Value]. [Subtitle]"
  - Chart: "Sentiment distribution chart. [Sentiment]: [Count] posts, [Percentage] percent."
  - Activity chart: "Activity by day chart. [Date]: [Count] posts."
  - School row: "Rank [X]. [School name]. [Count] posts. Double tap to view details."
- **Color Contrast:** WCAG AA minimum (4.5:1 for text)
- **Touch Targets:** 44pt minimum for all buttons
- **Dynamic Type:** Support text size scaling

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 16+)
- Swift Charts (iOS 16+) - for line/bar charts
- Supabase iOS Client (for auth + data)
- Foundation (for date filtering, calculations)

### Third-Party Libraries

- None (use Swift Charts for visualizations)

### External Services

- Supabase PostgreSQL (`social_media_posts` table)
- Supabase Auth (session management)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out" banner + retry button
- **No internet:** Show offline mode indicator
- **Server error (5xx):** Show "Server error. Please try again." + retry

### Data Errors

- **Empty posts:** Show empty state for all charts
- **Missing sentiment data:** Show "No sentiment data" in sentiment chart only
- **Missing school_id:** Exclude from school activity calculation

### User Errors

- None (analytics is read-only)

### Edge Cases

- **All Time with 10,000+ posts:** Client-side calculation may be slow - consider pagination or server-side aggregation (future)
- **No posts in time range:** Show empty state with suggestion to try longer range
- **Single post in time range:** Charts still render (bars show 100% height)
- **Tie in top schools:** Sort by school name alphabetically as tiebreaker
- **Activity chart with 90+ days:** X-axis labels may overlap - show only first/last dates

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays summary statistics correctly
- [ ] Time range filter updates all charts
- [ ] Sentiment distribution chart displays correctly
- [ ] Platform distribution shows correct counts
- [ ] Activity by day chart displays correctly
- [ ] Top schools list shows correct ranking
- [ ] Recent recruiting posts display correctly
- [ ] User can tap time range buttons
- [ ] User can navigate to school detail pages
- [ ] User can navigate back to social feed

### Error Tests

- [ ] Handle network timeout during fetch (show retry)
- [ ] Handle 401 error (redirect to login)
- [ ] Handle empty data set (show empty state)
- [ ] Handle server errors (5xx) (show retry)
- [ ] Handle missing sentiment data gracefully

### Edge Case Tests

- [ ] All Time with 1000+ posts calculates correctly
- [ ] Single post in time range renders charts correctly
- [ ] No posts in time range shows appropriate empty state
- [ ] VoiceOver reads charts correctly
- [ ] Page adapts to different device sizes (SE, 13, 15+, iPad)
- [ ] Dynamic Type scales text in charts
- [ ] Activity chart with 90 days doesn't overlap labels

### Performance Tests

- [ ] Page loads in <2 seconds on 4G (with cached data)
- [ ] Time range change updates UI in <500ms
- [ ] Charts render smoothly (60 fps)
- [ ] No memory leaks when navigating away
- [ ] Large data sets (1000+ posts) don't cause lag

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Client-side calculation:** Web computes all analytics client-side; may be slow with 10,000+ posts
- **No export functionality:** Web doesn't have CSV export for analytics (could be future feature)
- **Static charts:** Charts don't animate on web; iOS could add animations

### iOS-Specific Considerations

- **Swift Charts requirement:** Requires iOS 16+; fallback for iOS 15 would need custom chart views
- **Large data sets:** Consider pagination or server-side aggregation for 10,000+ posts
- **Memory usage:** Loading all posts into memory may be inefficient; consider virtualized lists
- **Chart rendering:** Complex charts may impact performance on older devices (iPhone X, etc.)

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/social/analytics.vue`
- **Composables used:**
  - `useSocialMedia` (fetch posts)
  - `useSchools` (school names)
- **API endpoints:** Supabase direct queries (no custom endpoints)

### Design References

- **Figma:** (Not provided)
- **Brand Guidelines:** Follow SF Design System, iOS HIG
- **Swift Charts:** https://developer.apple.com/documentation/charts

### API Documentation

- **Supabase Docs:** https://supabase.com/docs
- **Database Schema:** `social_media_posts` table in Supabase

---

## 12. Sign-Off

**Specification reviewed by:** Claude (AI Assistant)
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:**

- Swift Charts recommended for clean, native iOS chart implementation
- All analytics computed client-side (no aggregation API needed)
- Consider adding CSV export functionality in future phases
- Could add more chart types: pie chart for platform distribution, line chart for trends over time
- Consider caching calculated analytics to improve performance on repeat visits

---

## Appendix A: Example Implementation Reference

### Similar Pages in Codebase

- **Reports Dashboard** (`iOS_SPEC_Phase6_ReportsDashboard.md`) - Similar statistics cards and client-side aggregation pattern

### Code Snippets from Web

```typescript
// Time range filtering (from web)
const filteredPosts = computed(() => {
  if (selectedRange.value === 0) return posts.value; // All Time

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - selectedRange.value);
  return posts.value.filter((p) => new Date(p.post_date) >= cutoff);
});

// Summary statistics calculation (from web)
const totalPosts = computed(() => filteredPosts.value.length);
const recruitingPosts = computed(
  () => filteredPosts.value.filter((p) => p.is_recruiting_related).length,
);
const recruitingPercentage = computed(() =>
  totalPosts.value > 0
    ? Math.round((recruitingPosts.value / totalPosts.value) * 100)
    : 0,
);

// Activity by day calculation (from web)
const activityByDay = computed(() => {
  const days = selectedRange.value || 30;
  const result = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const count = filteredPosts.value.filter((p) =>
      p.post_date.startsWith(dateStr),
    ).length;
    result.push({
      date: dateStr,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      count,
      height: 0, // calculated after
    });
  }

  const maxCount = Math.max(...result.map((d) => d.count), 1);
  result.forEach((d) => {
    d.height = (d.count / maxCount) * 100;
  });

  return result;
});

// Top schools calculation (from web)
const topSchools = computed(() => {
  const schoolCounts = {};
  filteredPosts.value.forEach((p) => {
    if (p.school_id) {
      schoolCounts[p.school_id] = (schoolCounts[p.school_id] || 0) + 1;
    }
  });

  return Object.entries(schoolCounts)
    .map(([id, count]) => ({
      id,
      name: schoolMap.value[id] || "Unknown School",
      postCount: count,
    }))
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 5);
});
```
