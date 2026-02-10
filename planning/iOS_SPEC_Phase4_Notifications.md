# iOS Page Specification: Notifications

**Project:** The Recruiting Compass iOS App
**Created:** February 8, 2026
**Page Name:** Notifications
**Web Route:** `/notifications`
**Priority:** MVP / Phase 4 (Medium - Communication)
**Complexity:** Low (list with filtering, mark read, delete)
**Estimated Time:** 2 days

---

## 1. Overview

### Purpose

Display all user notifications in a single timeline view. Users review alerts about coach follow-ups, deadline reminders, inbound contact, offers, events, and daily digests. Notifications can be filtered by type, searched, marked as read, and deleted individually or in bulk.

### Key User Actions

- View all notifications sorted by scheduled time (newest first)
- Filter notifications by type (follow-ups, deadlines, inbound, digest, offers, events)
- Search notifications by title or message content
- Tap a notification to mark it as read and navigate to related entity
- Mark all notifications as read
- Delete individual notifications
- Clear all read notifications in bulk

### Success Criteria

- Notifications load and display with correct read/unread styling
- Unread count displays in header and updates on mark-as-read
- Type filter narrows the list correctly
- Search filters by title and message content
- Tapping an unread notification marks it read before navigating
- Bulk actions (mark all read, clear read) update the list immediately
- Priority badges (HIGH/NORMAL/LOW) display with correct colors

---

## 2. User Flows

### Primary Flow: View Notifications

```
1. User navigates to Notifications (from tab bar or dashboard)
2. System calls fetchNotifications() via Supabase
3. Notifications display sorted by scheduled_for DESC
4. User sees unread count in header
5. User scrolls through notification cards
```

### Alternative Flow: Mark as Read + Navigate

```
1. User taps an unread notification card
2. System calls markAsRead(id) → sets read_at = now
3. Card styling updates: blue border → gray border
4. Unread count decreases
5. If notification has action_url, navigate to that route
   (e.g., /coaches?highlight=123 → Coach Detail)
```

### Alternative Flow: Filter by Type

```
1. User taps a filter chip (e.g., "Follow-ups")
2. Client-side filter: only show notifications where type === "follow_up_reminder"
3. List updates immediately
4. User taps "All" to clear filter
```

### Alternative Flow: Bulk Mark All as Read

```
1. User taps "Mark all as read" button (only visible when unread > 0)
2. System bulk updates all unread notifications: read_at = now
3. All cards update to read styling
4. Unread count → 0
5. "Mark all as read" button disappears
```

### Alternative Flow: Clear Read Notifications

```
1. User taps "Clear read" button (only visible when read notifications exist)
2. Confirmation alert: "Delete all read notifications?"
3. User confirms
4. System bulk deletes all notifications where read_at is not null
5. Only unread notifications remain in list
```

### Error Scenarios

```
Error: Network failure on load
- User sees: Error message with retry button
- Recovery: Tap retry to refetch

Error: Failed to mark as read
- User sees: Brief error toast
- Recovery: Automatic retry on next tap

Error: Failed to delete
- User sees: "Could not delete notification" message
- Recovery: Retry available
```

---

## 3. Data Models

### Primary Model

```swift
struct AppNotification: Codable, Identifiable {
    let id: String
    let userId: String?
    let type: NotificationType
    let title: String
    let message: String
    let priority: NotificationPriority
    let readAt: String?                    // null = unread
    let scheduledFor: String               // ISO timestamp (sort key)
    let sentAt: String?
    let emailSent: Bool?
    let emailSentAt: String?
    let actionUrl: String?                 // Navigation target
    let relatedEntityType: String?         // "offer" | "event" | "coach" | etc.
    let relatedEntityId: String?
    let relatedSchoolId: String?
    let relatedCoachId: String?
    let relatedOfferId: String?
    let relatedEventId: String?
    let createdAt: String?
    let updatedAt: String?

    var isRead: Bool { readAt != nil }
}

enum NotificationType: String, Codable, CaseIterable {
    case followUpReminder = "follow_up_reminder"
    case deadlineAlert = "deadline_alert"
    case dailyDigest = "daily_digest"
    case inboundInteraction = "inbound_interaction"
    case offer
    case event

    var label: String {
        switch self {
        case .followUpReminder: return "Follow-ups"
        case .deadlineAlert: return "Deadlines"
        case .dailyDigest: return "Digest"
        case .inboundInteraction: return "Inbound"
        case .offer: return "Offers"
        case .event: return "Events"
        }
    }

    var emoji: String {
        switch self {
        case .followUpReminder: return "🔔"
        case .deadlineAlert: return "⏰"
        case .dailyDigest: return "📊"
        case .inboundInteraction: return "📧"
        case .offer: return "🎉"
        case .event: return "📅"
        }
    }
}

enum NotificationPriority: String, Codable {
    case low, normal, high

    var color: Color {
        switch self {
        case .high: return .red
        case .normal: return .blue
        case .low: return .gray
        }
    }
}
```

### Data Origin

- **Source:** Supabase table `notifications`
- **Refresh:** On page load (manual fetch, no real-time subscription)
- **Caching:** No (always fresh)
- **Mutations:** Mark read, mark all read, delete, delete all read

---

## 4. API Integration

### Endpoints Used

#### Fetch Notifications

```
Supabase Direct Query:
SELECT *
FROM notifications
WHERE user_id = :userId
ORDER BY scheduled_for DESC

Response: Array of Notification records
```

#### Mark as Read

```
Supabase Direct Query:
UPDATE notifications
SET read_at = now(), updated_at = now()
WHERE id = :notificationId

Response: Updated notification record
```

#### Mark All as Read

```
Supabase Direct Query:
UPDATE notifications
SET read_at = now(), updated_at = now()
WHERE user_id = :userId AND read_at IS NULL

Response: Updated count
```

#### Delete Notification

```
Supabase Direct Query:
DELETE FROM notifications
WHERE id = :notificationId

Response: Success
```

#### Delete All Read

```
Supabase Direct Query:
DELETE FROM notifications
WHERE user_id = :userId AND read_at IS NOT NULL

Response: Deleted count
```

### Authentication

- **Method:** Supabase Auth Token (Bearer in header)
- **RLS:** Notifications table has row-level security filtering by user_id

---

## 5. State Management

### Page-Level State

```swift
@State var notifications: [AppNotification] = []
@State var isLoading = false
@State var error: String? = nil
@State var activeFilter: NotificationType? = nil  // nil = "All"
@State var searchQuery: String = ""
```

### Computed Properties

```swift
var filteredNotifications: [AppNotification] {
    var result = notifications

    if let filter = activeFilter {
        result = result.filter { $0.type == filter }
    }

    if !searchQuery.isEmpty {
        let query = searchQuery.lowercased()
        result = result.filter {
            $0.title.lowercased().contains(query) ||
            $0.message.lowercased().contains(query)
        }
    }

    return result
}

var unreadCount: Int {
    notifications.filter { !$0.isRead }.count
}

var hasReadNotifications: Bool {
    notifications.contains { $0.isRead }
}
```

---

## 6. UI/UX Details

### Layout Structure

```
[Navigation Bar]
  - Title: "Notifications"
  - Subtitle: "X unread"

[Bulk Actions]
  - "Mark all as read" button (shows if unreadCount > 0)
  - "Clear read" button (shows if hasReadNotifications)

[Search Bar]
  - Placeholder: "Search notifications..."

[Filter Chips]
  - Horizontal scroll: All | Follow-ups | Deadlines | Inbound | Digest | Offers | Events
  - Active chip: filled blue; inactive: outline

[Notification List]
  - Cards with left border color (blue=unread, gray=read)
  - Each card:
    - Icon/emoji (by type)
    - Title (bold if unread)
    - Priority badge (HIGH=red, NORMAL=blue, LOW=gray)
    - Message text (secondary color)
    - Relative timestamp ("2h ago", "3d ago", "Jan 15")
    - Delete button (X) on trailing edge
  - Swipe-to-delete also supported

[Empty State]
  - "No notifications"
  - "You're all caught up!"

[Loading State]
  - Centered spinner with "Loading notifications..."
```

### Date Formatting

```swift
func formatRelativeDate(_ dateString: String) -> String {
    let date = ISO8601DateFormatter().date(from: dateString)
    let seconds = Date().timeIntervalSince(date)

    if seconds < 60 { return "just now" }
    if seconds < 3600 { return "\(Int(seconds / 60))m ago" }
    if seconds < 86400 { return "\(Int(seconds / 3600))h ago" }
    if seconds < 604800 { return "\(Int(seconds / 86400))d ago" }

    return date.formatted(.dateTime.month(.abbreviated).day())
}
```

### Notification Card Styling

| State  | Left Border | Background  | Title Weight | Title Color |
| ------ | ----------- | ----------- | ------------ | ----------- |
| Unread | Blue (4pt)  | Blue-tinted | Bold         | Blue-900    |
| Read   | Gray (4pt)  | White       | Regular      | Gray-900    |

### Priority Badge Styling

| Priority | Background | Text Color | Label    |
| -------- | ---------- | ---------- | -------- |
| High     | Red-100    | Red-700    | "HIGH"   |
| Normal   | Blue-100   | Blue-700   | "NORMAL" |
| Low      | Gray-100   | Gray-700   | "LOW"    |

### Accessibility

- Notification cards: `.accessibilityLabel("[unread] [priority] [type]: [title]. [relative time]")`
- Filter chips: `.accessibilityLabel("[type] filter. [active/inactive]")`
- Delete button: `.accessibilityLabel("Delete notification")`
- All touch targets: 44pt minimum

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 15+)
- Supabase iOS Client (auth + data)

### iOS-Specific Features

- Consider `UNUserNotificationCenter` for local push notifications (future enhancement)
- Badge count on app icon: Set via `UIApplication.shared.applicationIconBadgeNumber`

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show error message with retry button
- **No internet:** Show offline indicator
- **Server error (5xx):** Show "Server error" + retry

### Edge Cases

- Zero notifications: Show "You're all caught up!" empty state
- Very long notification titles: Truncate with ellipsis (2-line max)
- Very long messages: Truncate to 3 lines with ellipsis
- Rapid tap on mark-all-read: Debounce, disable button during operation
- Delete while filtering: Remove from both filtered and full list
- Navigation from notification: Map `action_url` to iOS navigation routes
  - `/coaches?highlight=id` → Coach Detail
  - `/schools/id` → School Detail
  - `/offers?highlight=id` → Offers page
  - `/events/id` → Event Detail
  - `/documents?type=recommendation` → Documents page
  - Default: Stay on notifications page

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Notifications load and display sorted by date
- [ ] Unread notifications show blue styling, read show gray
- [ ] Priority badges display with correct colors
- [ ] Type filter narrows list correctly
- [ ] Search filters by title and message
- [ ] Tapping unread notification marks it as read
- [ ] Tapping notification with action_url navigates correctly
- [ ] "Mark all as read" marks all unread
- [ ] "Clear read" deletes all read notifications
- [ ] Individual delete removes notification

### Error Tests

- [ ] Handle network timeout gracefully
- [ ] Handle 401 (redirect to login)
- [ ] Handle empty notification list
- [ ] Handle failed delete gracefully

### Edge Case Tests

- [ ] Long titles/messages truncate correctly
- [ ] Rapid taps don't create duplicate mutations
- [ ] Filter + search combine correctly
- [ ] VoiceOver works on all elements
- [ ] Dynamic type scaling

### Performance Tests

- [ ] Page loads in <2 seconds on 4G
- [ ] List scrolls smoothly with 100+ notifications
- [ ] No memory leaks

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- No real-time subscription on notifications page (manual fetch only)
- Notifications are generated server-side (via `/api/notifications/generate`)
- `action_url` values are web routes that need mapping to iOS navigation
- Type filter values must match exact enum strings
- Date formatting uses relative time (just now, Xm, Xh, Xd, then formatted date)

### iOS-Specific Considerations

- Map web `action_url` paths to iOS navigation destinations
- Consider pull-to-refresh for manual reload
- Badge count on tab bar icon for unread notifications
- Future: APNs integration for push notifications (not in initial scope)

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/notifications.vue`
- **Composable:** `useNotifications`
- **Store:** `stores/notifications.ts` (badge count only)
- **Types:** `types/models.ts` (Notification, NotificationType, NotificationPriority)
- **Helpers:** `utils/notificationHelpers.ts` (route mapping, formatting)
- **Creation triggers:** `utils/interactions/inboundAlerts.ts`, `server/utils/notificationGenerator.ts`

---

## 12. Sign-Off

**Specification reviewed by:** Chris Andrikanich
**Web implementation verified:** February 8, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** The notification creation logic runs server-side and doesn't need iOS implementation. The iOS app only needs to display, filter, and manage existing notifications. Push notifications via APNs would be a separate Phase 5+ feature. Consider adding pull-to-refresh since there's no real-time subscription.
