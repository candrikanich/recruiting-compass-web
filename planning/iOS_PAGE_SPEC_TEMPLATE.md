# iOS Page Specification Template

**Project:** The Recruiting Compass iOS App
**Created:** [DATE]
**Page Name:** [PAGE_NAME]
**Web Route:** [WEB_ROUTE]
**Priority:** [MVP / Phase 2 / Nice-to-Have]
**Complexity:** [Low / Medium / High]

---

## 1. Overview

### Purpose

[What does the user accomplish on this page? What problem does it solve?]

### Key User Actions

- [Action 1]
- [Action 2]
- [Action 3]

### Success Criteria

- [User can accomplish task X]
- [User sees confirmation Y]
- [Data persists after Z]

---

## 2. User Flows

### Primary Flow

```
1. User navigates to [page name]
2. System loads data from [API endpoint]
3. User sees [component/UI]
4. User performs [action]
5. System updates [state] and shows [feedback]
```

### Alternative Flows

```
Flow B: [When condition X happens]
- Step 1
- Step 2
```

### Error Scenarios

```
Error: No data available
- User sees: [message/UI]
- Recovery: [action user can take]

Error: Network failure
- User sees: [message/UI]
- Recovery: [retry / offline fallback]
```

---

## 3. Data Models

### Primary Model

```swift
struct [ModelName]: Codable {
  let id: String
  let fieldName: String
  let anotherField: Int
  let relatedData: [RelatedModel]

  // Computed properties iOS needs
  var displayName: String { /* logic */ }
}
```

### Related Models

- [Model 2]
- [Model 3]

### Data Origin

- **Source:** Supabase table(s) [table_name]
- **Refresh:** On page load / Real-time / Manual
- **Caching:** Yes/No (if yes, TTL and strategy)
- **Mutations:** Create / Update / Delete available

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch Primary Data

```
GET /api/path/[id]

Query Parameters:
- filter: string (optional)
- limit: int (optional)

Response:
{
  "success": true,
  "data": [
    {
      "id": "string",
      "field": "value"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1
  }
}

Error Codes:
- 401: Not authenticated
- 403: No access to this resource
- 404: Resource not found
```

#### Endpoint 2: Create/Update

```
POST /api/path

Body:
{
  "fieldName": "string",
  "anotherField": 123
}

Response:
{
  "success": true,
  "data": { /* created/updated model */ }
}
```

#### Endpoint 3: Delete

```
DELETE /api/path/[id]
Body: { "confirmDelete": true }

Response:
{ "success": true }
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
@State var items: [Item] = []
@State var isLoading = false
@State var error: String? = nil
@State var selectedId: String? = nil
```

### Persistence Across Navigation

- [State A persists when user navigates back]
- [State B clears on page exit]

### Shared State (if cross-page)

- Family context: [which user/athlete is active]
- User auth state: [accessed from auth manager]
- Filters: [saved in preferences or cleared]

---

## 6. UI/UX Details

### Layout Structure

```
[Header]
  - Title
  - Subtitle or status
  - Action button(s)
[Content Area]
  - List / Grid / Detail view
  - Empty state (when applicable)
  - Loading skeleton
[Footer]
  - Optional pagination
  - Optional action buttons
```

### Design System References

- **Color Palette:** [List primary, secondary, accent colors used]
  - Primary: `#0066FF` (blue)
  - Danger: `#FF3333` (red)
  - Success: `#00CC66` (green)

- **Typography:**
  - Title: SF Pro Display, 28pt, semibold
  - Subtitle: SF Pro Text, 16pt, regular
  - Body: SF Pro Text, 14pt, regular

- **Spacing:** 16pt standard padding, 8pt gaps
- **Radius:** 12pt for cards, 8pt for buttons

### Interactive Elements

#### Buttons

- Primary CTA: Blue gradient, white text
- Secondary: Outline style, slate text
- Destructive: Red background
- State: Normal / Hover / Disabled / Loading

#### Lists

- Cell height: 56pt + padding
- Swipe actions: [Edit] [Delete] (if applicable)
- Selection: Checkmark on tap

#### Forms

- Text inputs: Single-line / Multi-line
- Dropdowns: Picker control
- Date inputs: Date picker
- Validation: Real-time / On submit

#### Modals / Sheets

- Confirmation dialog: [Title], [Description], [Cancel] [Confirm]
- Input sheet: [Form fields], [Save] [Cancel]
- Preview: [Image/content], [Actions]

### Loading States

```
First Load:
- Skeleton screens mimicking final layout
- 500ms delay before showing skeleton

Reload:
- Subtle spinner in navigation bar
- Content remains visible behind

Empty State:
- Icon + message
- CTA: "Create new" or "Go back"

Error State:
- Error icon
- Clear error message
- Retry button
```

### Accessibility

- **VoiceOver:** All interactive elements have descriptive labels
- **Color Contrast:** WCAG AA minimum
- **Touch Targets:** 44pt minimum (iOS standard)
- **Dynamic Type:** Supports text size scaling

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 15+)
- Supabase iOS Client (for auth + data)
- [Any other SDKs needed]

### Third-Party Libraries

- [If similar to web (e.g., charts library), note it]

### External Services

- Supabase PostgreSQL (data)
- Supabase Auth (login/session)
- Supabase Storage (file uploads, if applicable)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out" + retry
- **No internet:** Show offline mode indicator + queue for sync
- **Server error (5xx):** Show "Server error" + retry

### Data Errors

- **Empty list:** Show appropriate empty state
- **Invalid data:** Skip/filter and log
- **Missing required field:** Don't display row/item
- **Stale data:** Automatic refresh on interval

### User Errors

- **Form validation:** Show inline error message
- **Unauthorized action:** Show "You don't have permission"
- **Duplicate entry:** Show "Already exists" suggestion

### Edge Cases

- Very long names/text: Truncate with ellipsis or word-wrap
- Large lists (1000+ items): Implement pagination/infinite scroll
- Concurrent edits: Last-write-wins or show conflict resolution
- Offline then online: Sync queued changes

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays data correctly
- [ ] User can perform primary action (create/edit/delete)
- [ ] Navigation to related pages works
- [ ] Data persists after navigation away and back

### Error Tests

- [ ] Handle network timeout gracefully
- [ ] Handle 401 (redirect to login)
- [ ] Handle 403 (show permission message)
- [ ] Handle empty data set
- [ ] Handle server errors (5xx)

### Edge Case Tests

- [ ] Very long text doesn't break layout
- [ ] Large lists scroll smoothly
- [ ] Rapid taps on button don't create duplicates
- [ ] VoiceOver works on all elements
- [ ] Page adapts to different device sizes

### Performance Tests

- [ ] Page loads in <2 seconds on 4G
- [ ] List scrolling is smooth (60 fps)
- [ ] No memory leaks when navigating away
- [ ] Images load without blocking UI

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- [If the web version has limitations, note them here]
- Example: "School logo may be missing for some entries"
- Example: "Fit score takes 5-10 seconds to compute initially"

### iOS-Specific Considerations

- [Device-specific behaviors to watch for]
- Example: "Keyboard dismissal blocks navigation for 300ms"
- Example: "List reloads when backgrounded due to OS memory pressure"

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/path/[id].vue`
- **Composables used:** `useXxx`, `useYyy`
- **Store mutations:** `[store].action()`
- **Related API endpoints:** See section 4

### Design References

- **Figma:** [Link to design]
- **Brand Guidelines:** [Link if exists]

### API Documentation

- **Swagger/Spec:** [If available]
- **Database Schema:** [Link to schema]

---

## 12. Sign-Off

**Specification reviewed by:** [Your name]
**Web implementation verified:** [Date]
**Ready for iOS implementation:** ✅ Yes / ❌ No
**Notes:** [Any final thoughts for iOS developer]

---

## Appendix A: Example Implementation Reference

### Similar Pages in Codebase

- [If another page has similar patterns, reference it]

### Code Snippets from Web

```typescript
// Example composable or component logic
// Helps iOS understand the pattern
```
